import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WeeklyWorkUserSummaryDto } from './weekly-work.dto';

export function GenerateWeeklyWorkDocs() {
  return applyDecorators(
    ApiOperation({ summary: '주간 계획/보고 Markdown 생성 및 히스토리 저장' }),
    ApiResponse({ status: 201, description: '생성 성공' }),
    ApiResponse({ status: 400, description: '입력값 오류 또는 생성 결과 오류' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 403, description: '권한 없음' }),
    ApiResponse({ status: 404, description: '참조할 히스토리를 찾을 수 없음' }),
    ApiResponse({ status: 409, description: '같은 주차의 같은 타입 문서가 이미 존재함 (overwriteExisting 기본값은 true)' }),
    ApiResponse({ status: 500, description: '서버 내부 오류' }),
  );
}

export function GetWeeklyWorkHistoryDocs() {
  return applyDecorators(
    ApiOperation({ summary: '주간 계획/보고 히스토리 목록' }),
    ApiQuery({ name: 'type', required: false, enum: ['plan', 'report'] }),
    ApiQuery({ name: 'weekStartDate', required: false, description: 'YYYY-MM-DD' }),
    ApiQuery({ name: 'userId', required: false, description: '조회 대상 사용자 ID (생략 시 본인)' }),
    ApiQuery({ name: 'includeAllUsers', required: false, description: '전체 사용자 조회 여부 (true/false)' }),
    ApiResponse({ status: 200, description: '조회 성공' }),
    ApiResponse({ status: 400, description: '쿼리 파라미터 오류' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 403, description: '권한 없음' }),
    ApiResponse({ status: 404, description: '리소스를 찾을 수 없음' }),
    ApiResponse({ status: 409, description: '충돌' }),
    ApiResponse({ status: 500, description: '서버 내부 오류' }),
  );
}

export function GetWeeklyWorkUsersDocs() {
  return applyDecorators(
    ApiOperation({ summary: '주간 업무 사용자 목록 조회' }),
    ApiQuery({ name: 'weekStartDate', required: false, description: 'YYYY-MM-DD' }),
    ApiResponse({
      status: 200,
      description: '조회 성공',
      type: [WeeklyWorkUserSummaryDto],
    }),
    ApiResponse({ status: 400, description: '쿼리 파라미터 오류' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 403, description: '권한 없음' }),
    ApiResponse({ status: 404, description: '리소스를 찾을 수 없음' }),
    ApiResponse({ status: 409, description: '충돌' }),
    ApiResponse({ status: 500, description: '서버 내부 오류' }),
  );
}

export function GetWeeklyWorkHistoryOneDocs() {
  return applyDecorators(
    ApiOperation({ summary: '주간 계획/보고 히스토리 상세' }),
    ApiResponse({ status: 200, description: '조회 성공' }),
    ApiResponse({ status: 400, description: '요청 파라미터 오류' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 403, description: '권한 없음' }),
    ApiResponse({ status: 404, description: '히스토리를 찾을 수 없음' }),
    ApiResponse({ status: 409, description: '충돌' }),
    ApiResponse({ status: 500, description: '서버 내부 오류' }),
  );
}

export function UpdateWeeklyWorkHistoryDocs() {
  return applyDecorators(
    ApiOperation({ summary: '주간 계획/보고 히스토리 Markdown 수정' }),
    ApiResponse({ status: 200, description: '수정 성공' }),
    ApiResponse({ status: 400, description: '요청 본문 오류' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 403, description: '권한 없음' }),
    ApiResponse({ status: 404, description: '히스토리를 찾을 수 없음' }),
    ApiResponse({ status: 409, description: '충돌' }),
    ApiResponse({ status: 500, description: '서버 내부 오류' }),
  );
}

export function DeleteWeeklyWorkHistoryDocs() {
  return applyDecorators(
    ApiOperation({ summary: '주간 계획/보고 히스토리 삭제' }),
    ApiResponse({ status: 200, description: '삭제 성공' }),
    ApiResponse({ status: 400, description: '요청 파라미터 오류' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
    ApiResponse({ status: 403, description: '권한 없음' }),
    ApiResponse({ status: 404, description: '히스토리를 찾을 수 없음' }),
    ApiResponse({ status: 409, description: '충돌' }),
    ApiResponse({ status: 500, description: '서버 내부 오류' }),
  );
}
