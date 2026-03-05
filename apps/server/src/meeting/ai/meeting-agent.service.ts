import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StructuredTool } from '@langchain/core/tools';
import { DesktopLLM } from './desktop-llm';
import { createMeetingTools } from './tools';
import { MEETING_SYSTEM_PROMPT, buildReactPrompt } from './prompts';
import { ProjectService } from '../../project/project.service';
import { BoardService } from '../../board/board.service';
import type { ParsedMeetingResult } from '../meeting-ai.service';

const AGENT_TIMEOUT_MS = 300_000;
const MAX_ITERATIONS = 8;

@Injectable()
export class MeetingAgentService {
  private readonly logger = new Logger(MeetingAgentService.name);
  private readonly llm: DesktopLLM;

  constructor(
    private readonly config: ConfigService,
    private readonly projectService: ProjectService,
    private readonly boardService: BoardService,
  ) {
    const desktopUrl = this.config.get<string>(
      'DESKTOP_SERVICE_URL',
      'http://localhost:50004',
    );
    this.llm = new DesktopLLM({ desktopUrl, timeoutMs: 180_000 });
  }

  async parseMinutes(
    projectId: string,
    rawContent: string,
  ): Promise<ParsedMeetingResult> {
    const tools = createMeetingTools(this.projectService, this.boardService);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Agent execution timed out')),
        AGENT_TIMEOUT_MS,
      ),
    );

    try {
      const result = await Promise.race([
        this.runReactLoop(tools, projectId, rawContent),
        timeoutPromise,
      ]);
      return result;
    } catch (err) {
      this.logger.error(`Agent execution failed: ${err}`);
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `AI 에이전트 실행 실패: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async runReactLoop(
    tools: StructuredTool[],
    projectId: string,
    rawContent: string,
  ): Promise<ParsedMeetingResult> {
    const toolMap = new Map(tools.map((t) => [t.name, t]));
    const scratchpad: string[] = [];

    const input = `${MEETING_SYSTEM_PROMPT}

## Context
Project ID: ${projectId}

## Meeting Minutes
---
${rawContent}
---

Please analyze the meeting minutes above. First use the tools to gather project context (members, etc.), then produce the final JSON output.`;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const prompt = buildReactPrompt(tools, input, scratchpad.join('\n'));

      this.logger.log(`Agent iteration ${i + 1}/${MAX_ITERATIONS}`);
      const response = await this.llm.invoke(prompt);

      const finalAnswer = this.extractFinalAnswer(response);
      if (finalAnswer) {
        return this.parseOutput(finalAnswer);
      }

      const action = this.parseAction(response);
      if (!action) {
        // LLM이 형식을 따르지 않은 경우, 직접 JSON 추출 시도
        const directJson = this.tryExtractJson(response);
        if (directJson) return directJson;

        scratchpad.push(
          `${response}\nObservation: Invalid format. You must use "Action:" and "Action Input:" or "Final Answer:". Try again.`,
        );
        continue;
      }

      const tool = toolMap.get(action.name);
      if (!tool) {
        scratchpad.push(
          `${response}\nObservation: Tool "${action.name}" not found. Available tools: ${[...toolMap.keys()].join(', ')}`,
        );
        continue;
      }

      try {
        const toolInput = JSON.parse(action.input);
        const observation = await tool.invoke(toolInput);
        scratchpad.push(`${response}\nObservation: ${observation}`);
        this.logger.log(`Tool ${action.name} executed successfully`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        scratchpad.push(
          `${response}\nObservation: Error executing tool: ${message}`,
        );
      }
    }

    throw new HttpException(
      'Agent가 최대 반복 횟수를 초과했습니다.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  private extractFinalAnswer(response: string): string | null {
    const match = response.match(/Final Answer:\s*([\s\S]*)/);
    return match ? match[1].trim() : null;
  }

  private parseAction(
    response: string,
  ): { name: string; input: string } | null {
    const actionMatch = response.match(/Action:\s*(.+)/);
    const inputMatch = response.match(/Action Input:\s*([\s\S]*?)(?=\n(?:Thought|Observation|Action|Final Answer)|\n*$)/);

    if (!actionMatch || !inputMatch) return null;

    return {
      name: actionMatch[1].trim(),
      input: inputMatch[1].trim(),
    };
  }

  private tryExtractJson(response: string): ParsedMeetingResult | null {
    try {
      return this.parseOutput(response);
    } catch {
      return null;
    }
  }

  private parseOutput(output: string): ParsedMeetingResult {
    const jsonMatch =
      output.match(/```json\s*([\s\S]*?)```/) ||
      output.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new HttpException(
        'AI 에이전트 응답에서 JSON을 추출할 수 없습니다.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const parsed = JSON.parse(jsonMatch[1].trim()) as ParsedMeetingResult;

    if (!parsed.actionItems || !Array.isArray(parsed.actionItems)) {
      throw new HttpException(
        'AI 에이전트 응답 형식이 올바르지 않습니다.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return parsed;
  }
}
