export const MAX_UPLOAD_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_UPLOAD_FILE_SIZE_MB = Math.floor(
  MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024),
);
export const MAX_UPLOAD_FILE_SIZE_ERROR_MESSAGE = `파일 용량은 최대 ${MAX_UPLOAD_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`;
