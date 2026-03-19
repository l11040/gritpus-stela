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

// ─── Auth ───

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
}

// ─── Project ───

export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

// ─── Card ───

export enum CardPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ─── Meeting ───

export enum MeetingMinutesStatus {
  UPLOADED = 'uploaded',
  PARSING = 'parsing',
  PARSED = 'parsed',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export interface ParsedActionItem {
  title: string;
  description?: string;
  assigneeName?: string;
  priority?: CardPriority;
  dueDate?: string;
  suggestedLabels?: string[];
}

// ─── MdDocument ───

export interface MdDocumentSummary {
  keyPoints: string[];
  tableOfContents: { title: string; level: number }[];
  estimatedReadTime: number;
}

export enum MdDocumentSummaryStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
