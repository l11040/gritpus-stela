import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import {
  NotificationListResponseDto,
  UnreadCountResponseDto,
  NotificationResponseDto,
} from './notification.dto';

export function GetNotificationsDocs() {
  return applyDecorators(
    ApiOperation({ summary: '알림 목록 조회' }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({ name: 'type', required: false, enum: ['card_assigned', 'card_due_soon', 'meeting_parsed'] }),
    ApiQuery({ name: 'isRead', required: false, type: Boolean }),
    ApiResponse({
      status: 200,
      description: '알림 목록 조회 성공',
      type: NotificationListResponseDto,
    }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}

export function GetUnreadCountDocs() {
  return applyDecorators(
    ApiOperation({ summary: '읽지 않은 알림 개수 조회' }),
    ApiResponse({
      status: 200,
      description: '읽지 않은 알림 개수',
      type: UnreadCountResponseDto,
    }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}

export function MarkAsReadDocs() {
  return applyDecorators(
    ApiOperation({ summary: '알림 읽음 처리' }),
    ApiResponse({ status: 200, description: '읽음 처리 성공' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 404, description: '알림을 찾을 수 없습니다' }),
  );
}

export function MarkAllAsReadDocs() {
  return applyDecorators(
    ApiOperation({ summary: '모든 알림 읽음 처리' }),
    ApiResponse({ status: 200, description: '모두 읽음 처리 성공' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}

export function DeleteNotificationDocs() {
  return applyDecorators(
    ApiOperation({ summary: '알림 삭제' }),
    ApiResponse({ status: 200, description: '알림 삭제 성공' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 404, description: '알림을 찾을 수 없습니다' }),
  );
}

export function DeleteAllNotificationsDocs() {
  return applyDecorators(
    ApiOperation({ summary: '모든 알림 삭제' }),
    ApiResponse({ status: 200, description: '모든 알림 삭제 성공' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}

export function NotificationStreamDocs() {
  return applyDecorators(
    ApiOperation({ summary: '실시간 알림 SSE 스트림' }),
    ApiResponse({
      status: 200,
      description: 'SSE 스트림 연결 성공',
      schema: {
        type: 'object',
        properties: {
          notification: { type: 'object', $ref: '#/components/schemas/NotificationResponseDto' },
          timestamp: { type: 'number', example: 1709500000000 },
        },
      },
    }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}
