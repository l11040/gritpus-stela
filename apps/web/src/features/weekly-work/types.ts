export type WeeklyType = 'plan' | 'report';
export type InputType = 'chat' | 'voice';

export interface WeeklyWorkHistory {
  id: string;
  userId: string;
  type: WeeklyType;
  weekStartDate: string;
  inputType: InputType;
  sourceText: string;
  markdown: string;
  planReferenceId?: string | null;
  createdAt: string;
}

export interface WeeklyWorkUserSummary {
  userId: string;
  name: string;
  email: string;
  hasPlan: boolean;
  hasReport: boolean;
  isMe: boolean;
}
