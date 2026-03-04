import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    description: 'The prompt to send to Claude',
    example: 'Hello, how are you?',
  })
  prompt: string;
}

export class ChatResponseDto {
  @ApiProperty({ description: 'Claude response text' })
  response: string;

  @ApiProperty({ description: 'Response time in milliseconds' })
  durationMs: number;
}
