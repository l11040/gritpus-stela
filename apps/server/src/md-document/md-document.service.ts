import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MdDocument } from './entities/md-document.entity';
import { MdDocumentVersion } from './entities/md-document-version.entity';
import { MdDocumentSummaryService } from './md-document-summary.service';
import { MdDocumentProgressService } from './md-document-progress.service';
import { CreateMdDocumentDto, UpdateMdDocumentDto } from './md-document.dto';

@Injectable()
export class MdDocumentService {
  private readonly logger = new Logger(MdDocumentService.name);

  constructor(
    @InjectRepository(MdDocument)
    private readonly docRepo: Repository<MdDocument>,
    @InjectRepository(MdDocumentVersion)
    private readonly versionRepo: Repository<MdDocumentVersion>,
    private readonly summaryService: MdDocumentSummaryService,
    private readonly progressService: MdDocumentProgressService,
  ) {}

  async create(
    userId: string,
    dto: CreateMdDocumentDto,
    file?: Express.Multer.File,
  ): Promise<MdDocument> {
    let content = dto.content;

    if (file) {
      content = file.buffer.toString('utf-8');
    }

    if (!content) {
      throw new BadRequestException('마크다운 본문 또는 파일을 제공해야 합니다.');
    }

    const doc = this.docRepo.create({
      title: dto.title,
      currentContent: content,
      currentVersion: 1,
      ownerId: userId,
    });

    const saved = await this.docRepo.save(doc);

    await this.versionRepo.save(
      this.versionRepo.create({
        documentId: saved.id,
        version: 1,
        content,
        changeNote: '초기 버전',
        createdById: userId,
      }),
    );

    return saved;
  }

  async findAll(userId: string): Promise<MdDocument[]> {
    return this.docRepo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.owner', 'owner')
      .where('doc.ownerId = :userId', { userId })
      .orWhere('doc.isShared = 1')
      .orderBy('doc.updatedAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, userId?: string): Promise<MdDocument> {
    const doc = await this.docRepo.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');

    if (doc.ownerId !== userId && !doc.isShared) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return doc;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMdDocumentDto,
  ): Promise<MdDocument> {
    const doc = await this.findOne(id, userId);

    if (dto.title) {
      doc.title = dto.title;
    }

    if (dto.content && dto.content !== doc.currentContent) {
      doc.currentVersion += 1;
      doc.currentContent = dto.content;

      await this.versionRepo.save(
        this.versionRepo.create({
          documentId: doc.id,
          version: doc.currentVersion,
          content: dto.content,
          changeNote: dto.changeNote || undefined,
          createdById: userId,
        }),
      );
    }

    return this.docRepo.save(doc);
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');
    if (doc.ownerId !== userId) {
      throw new ForbiddenException('소유자만 삭제할 수 있습니다.');
    }
    await this.docRepo.delete(id);
  }

  async getVersions(
    id: string,
    userId: string,
  ): Promise<MdDocumentVersion[]> {
    await this.findOne(id, userId);
    return this.versionRepo.find({
      where: { documentId: id },
      relations: ['createdBy'],
      order: { version: 'DESC' },
    });
  }

  async getVersion(
    id: string,
    version: number,
    userId: string,
  ): Promise<MdDocumentVersion> {
    await this.findOne(id, userId);
    const ver = await this.versionRepo.findOne({
      where: { documentId: id, version },
      relations: ['createdBy'],
    });
    if (!ver) throw new NotFoundException('해당 버전을 찾을 수 없습니다.');
    return ver;
  }

  async restoreVersion(
    id: string,
    version: number,
    userId: string,
  ): Promise<MdDocument> {
    const ver = await this.getVersion(id, version, userId);
    return this.update(id, userId, {
      content: ver.content,
      changeNote: `버전 ${version}에서 복원`,
    });
  }

  async toggleSharing(
    id: string,
    userId: string,
    isShared: boolean,
  ): Promise<MdDocument> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');
    if (doc.ownerId !== userId) {
      throw new ForbiddenException('소유자만 공유 설정을 변경할 수 있습니다.');
    }
    doc.isShared = isShared ? 1 : 0;
    return this.docRepo.save(doc);
  }

  async summarizeAsync(id: string, userId: string): Promise<void> {
    const doc = await this.findOne(id, userId);
    if (!doc.currentContent) {
      throw new BadRequestException('요약할 내용이 없습니다.');
    }

    this.progressService.start(id);
    this.progressService.emit(id, { step: 'started', message: 'AI 요약을 시작합니다...' });

    // fire-and-forget
    this.runSummarize(id, doc.currentContent).catch(() => {});
  }

  private async runSummarize(id: string, content: string): Promise<void> {
    try {
      this.progressService.emit(id, { step: 'analyzing', message: '문서를 분석하고 있습니다...' });
      this.progressService.emit(id, { step: 'summarizing', message: '요약을 생성하고 있습니다...' });

      const result = await this.summaryService.summarize(content);

      await this.docRepo.update(id, { summaryJson: result as any });

      this.progressService.emit(id, { step: 'completed', message: '요약이 완료되었습니다!' });
    } catch (err) {
      this.logger.error(`Summary failed for document ${id}`, err);
      this.progressService.emit(id, { step: 'failed', message: 'AI 요약에 실패했습니다.' });
    } finally {
      this.progressService.complete(id);
    }
  }
}
