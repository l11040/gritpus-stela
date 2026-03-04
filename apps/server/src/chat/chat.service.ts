import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ChatRequest,
  ChatResponse,
  ChatErrorResponse,
} from '@gritpus-stela/shared';

@Injectable()
export class ChatService {
  private readonly desktopUrl: string;

  constructor(private readonly config: ConfigService) {
    this.desktopUrl = this.config.get<string>(
      'DESKTOP_SERVICE_URL',
      'http://localhost:50004',
    );
  }

  async chat(prompt: string): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const body: ChatRequest = { prompt };
      const res = await fetch(`${this.desktopUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        const errData = data as ChatErrorResponse;
        throw new HttpException(
          errData.error || 'Desktop service error',
          res.status >= 500
            ? HttpStatus.BAD_GATEWAY
            : HttpStatus.BAD_REQUEST,
        );
      }

      return data as ChatResponse;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `Desktop service unreachable: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
