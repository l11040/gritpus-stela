import { LLM, type BaseLLMParams } from '@langchain/core/language_models/llms';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

export interface DesktopLLMInput extends BaseLLMParams {
  desktopUrl: string;
  timeoutMs?: number;
}

export class DesktopLLM extends LLM {
  private readonly desktopUrl: string;
  private readonly timeoutMs: number;

  constructor(fields: DesktopLLMInput) {
    super(fields);
    this.desktopUrl = fields.desktopUrl;
    this.timeoutMs = fields.timeoutMs ?? 180_000;
  }

  _llmType(): string {
    return 'desktop-claude';
  }

  async _call(
    prompt: string,
    _options: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.desktopUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Desktop service error (${res.status}): ${errText}`);
      }

      const data = (await res.json()) as { response: string; durationMs: number };
      return data.response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
