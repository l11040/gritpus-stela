export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface ChatRequest {
  prompt: string;
}

export interface ChatResponse {
  response: string;
  durationMs: number;
}

export interface ChatErrorResponse {
  error: string;
  details?: string;
}
