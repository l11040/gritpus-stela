export class ParseCancelledError extends Error {
  constructor(message = '파싱이 중단되었습니다.') {
    super(message);
    this.name = 'ParseCancelledError';
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;

  if (signal.reason instanceof Error) {
    throw signal.reason;
  }

  if (typeof signal.reason === 'string' && signal.reason.trim()) {
    throw new ParseCancelledError(signal.reason);
  }

  throw new ParseCancelledError();
}

export function isParseCancelledError(error: unknown): error is ParseCancelledError {
  return error instanceof ParseCancelledError;
}
