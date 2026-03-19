import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

export function CreateMdDocumentDocs() {
  return applyDecorators(
    ApiOperation({ summary: '마크다운 문서 생성 (텍스트 또는 파일)' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'API 설계 문서' },
          content: { type: 'string', description: '마크다운 본문' },
          file: {
            type: 'string',
            format: 'binary',
            description: '마크다운 파일 (.md)',
          },
        },
        required: ['title'],
      },
    }),
    ApiResponse({ status: 201, description: '문서 생성 성공' }),
    ApiResponse({ status: 400, description: '본문 또는 파일 누락' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}

export function GetMdDocumentsDocs() {
  return applyDecorators(
    ApiOperation({ summary: '내 문서 + 공유 문서 목록' }),
    ApiResponse({ status: 200, description: '문서 목록' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}

export function GetMdDocumentDocs() {
  return applyDecorators(
    ApiOperation({ summary: '문서 상세 조회' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiResponse({ status: 200, description: '문서 상세' }),
    ApiResponse({ status: 403, description: '접근 권한 없음' }),
    ApiResponse({ status: 404, description: '문서 없음' }),
  );
}

export function UpdateMdDocumentDocs() {
  return applyDecorators(
    ApiOperation({ summary: '문서 수정 (자동 버전 생성)' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiResponse({ status: 200, description: '수정 성공' }),
    ApiResponse({ status: 403, description: '접근 권한 없음' }),
    ApiResponse({ status: 404, description: '문서 없음' }),
  );
}

export function DeleteMdDocumentDocs() {
  return applyDecorators(
    ApiOperation({ summary: '문서 삭제 (소유자만)' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiResponse({ status: 200, description: '삭제 성공' }),
    ApiResponse({ status: 403, description: '소유자만 삭제 가능' }),
    ApiResponse({ status: 404, description: '문서 없음' }),
  );
}

export function GetMdDocumentVersionsDocs() {
  return applyDecorators(
    ApiOperation({ summary: '문서 버전 이력 조회' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiResponse({ status: 200, description: '버전 목록' }),
    ApiResponse({ status: 404, description: '문서 없음' }),
  );
}

export function GetMdDocumentVersionDocs() {
  return applyDecorators(
    ApiOperation({ summary: '특정 버전 콘텐츠 조회' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiParam({ name: 'version', description: '버전 번호' }),
    ApiResponse({ status: 200, description: '버전 콘텐츠' }),
    ApiResponse({ status: 404, description: '버전 없음' }),
  );
}

export function RestoreVersionDocs() {
  return applyDecorators(
    ApiOperation({ summary: '특정 버전으로 복원' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiParam({ name: 'version', description: '버전 번호' }),
    ApiResponse({ status: 200, description: '복원 성공' }),
    ApiResponse({ status: 404, description: '버전 없음' }),
  );
}

export function ToggleSharingDocs() {
  return applyDecorators(
    ApiOperation({ summary: '문서 공유 토글' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiResponse({ status: 200, description: '공유 설정 변경 성공' }),
    ApiResponse({ status: 403, description: '소유자만 변경 가능' }),
  );
}

export function SummarizeMdDocumentDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'AI 문서 요약 (비동기)' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiResponse({ status: 202, description: '요약 시작됨' }),
    ApiResponse({ status: 400, description: '요약할 내용 없음' }),
    ApiResponse({ status: 404, description: '문서 없음' }),
  );
}

export function SummarizeEventsDocs() {
  return applyDecorators(
    ApiOperation({ summary: '요약 진행 상황 SSE 스트림' }),
    ApiParam({ name: 'id', description: '문서 ID' }),
    ApiResponse({ status: 200, description: 'SSE 스트림' }),
  );
}
