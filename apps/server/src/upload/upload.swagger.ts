import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiConsumes,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

export function UploadImageDocs() {
  return applyDecorators(
    ApiOperation({ summary: '이미지 업로드' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: '이미지 파일 (JPEG, PNG, GIF, WebP, SVG / 최대 10MB)',
          },
        },
        required: ['file'],
      },
    }),
    ApiResponse({
      status: 201,
      description: '업로드 성공',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', example: 'http://localhost:50002/uploads/images/uuid.png' },
        },
      },
    }),
    ApiResponse({ status: 400, description: '잘못된 파일 형식 또는 크기 초과' }),
    ApiResponse({ status: 401, description: '인증 실패' }),
  );
}
