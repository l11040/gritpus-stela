import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Document } from './entities/document.entity';

@Injectable()
export class DocumentService {
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
  }

  async upload(
    projectId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Document> {
    const ext = path.extname(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    const projectDir = path.join(this.uploadDir, projectId);

    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, storedName), file.buffer);

    const doc = this.docRepo.create({
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: `${projectId}/${storedName}`,
      projectId,
      uploadedById: userId,
    });

    return this.docRepo.save(doc);
  }

  async findAll(projectId: string): Promise<Document[]> {
    return this.docRepo.find({
      where: { projectId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(documentId: string): Promise<Document> {
    const doc = await this.docRepo.findOne({
      where: { id: documentId },
      relations: ['uploadedBy'],
    });
    if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');
    return doc;
  }

  async getFilePath(documentId: string): Promise<string> {
    const doc = await this.findOne(documentId);
    return path.join(this.uploadDir, doc.storagePath);
  }

  async remove(documentId: string): Promise<void> {
    const doc = await this.findOne(documentId);
    const filePath = path.join(this.uploadDir, doc.storagePath);
    try {
      await fs.unlink(filePath);
    } catch {
      // 파일이 이미 없을 수 있음
    }
    await this.docRepo.delete(documentId);
  }

  async readFileContent(documentId: string): Promise<string> {
    const doc = await this.findOne(documentId);
    const filePath = path.join(this.uploadDir, doc.storagePath);
    const buffer = await fs.readFile(filePath);
    return buffer.toString('utf-8');
  }
}
