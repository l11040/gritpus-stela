import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        '허용되지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP, SVG만 가능)',
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('이미지 크기는 10MB 이하만 가능합니다.');
    }

    const ext = path.extname(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    const imageDir = path.join(this.uploadDir, 'images');

    await fs.mkdir(imageDir, { recursive: true });
    await fs.writeFile(path.join(imageDir, storedName), file.buffer);

    const baseUrl = this.config.get<string>(
      'BASE_URL',
      `http://localhost:${this.config.get<number>('PORT', 50002)}`,
    );

    return { url: `${baseUrl}/uploads/images/${storedName}` };
  }
}
