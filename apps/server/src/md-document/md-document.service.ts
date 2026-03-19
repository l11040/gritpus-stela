import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MdDocument } from './entities/md-document.entity';
import { MdDocumentVersion } from './entities/md-document-version.entity';
import { MdDocumentRepository } from './md-document.repository';
import { MdDocumentSummaryService } from './md-document-summary.service';
import { MdDocumentSlidesService } from './md-document-slides.service';
import { MdDocumentProgressService } from './md-document-progress.service';
import { CreateMdDocumentDto, UpdateMdDocumentDto } from './md-document.dto';

@Injectable()
export class MdDocumentService {
  private readonly logger = new Logger(MdDocumentService.name);

  constructor(
    private readonly repository: MdDocumentRepository,
    private readonly summaryService: MdDocumentSummaryService,
    private readonly slidesService: MdDocumentSlidesService,
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

    const doc = this.repository.createDoc({
      title: dto.title,
      currentContent: content,
      currentVersion: 1,
      ownerId: userId,
    });

    const saved = await this.repository.saveDoc(doc);

    const version = this.repository.createVersion({
      documentId: saved.id,
      version: 1,
      content,
      changeNote: '초기 버전',
      createdById: userId,
    });
    await this.repository.saveVersion(version);

    return saved;
  }

  async findAll(
    userId: string,
    options?: { search?: string; shared?: string; sort?: string },
  ): Promise<MdDocument[]> {
    return this.repository.findAll(userId, options);
  }

  async findOne(id: string, userId?: string): Promise<MdDocument> {
    const doc = await this.repository.findOneById(id);
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

      const version = this.repository.createVersion({
        documentId: doc.id,
        version: doc.currentVersion,
        content: dto.content,
        changeNote: dto.changeNote || undefined,
        createdById: userId,
      });
      await this.repository.saveVersion(version);
    }

    return this.repository.saveDoc(doc);
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.repository.findOneByIdOnly(id);
    if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');
    if (doc.ownerId !== userId) {
      throw new ForbiddenException('소유자만 삭제할 수 있습니다.');
    }
    await this.repository.deleteDoc(id);
  }

  async getVersions(
    id: string,
    userId: string,
  ): Promise<MdDocumentVersion[]> {
    await this.findOne(id, userId);
    return this.repository.findVersions(id);
  }

  async getVersion(
    id: string,
    version: number,
    userId: string,
  ): Promise<MdDocumentVersion> {
    await this.findOne(id, userId);
    const ver = await this.repository.findVersion(id, version);
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
    const doc = await this.repository.findOneByIdOnly(id);
    if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');
    if (doc.ownerId !== userId) {
      throw new ForbiddenException('소유자만 공유 설정을 변경할 수 있습니다.');
    }
    doc.isShared = isShared ? 1 : 0;
    return this.repository.saveDoc(doc);
  }

  async summarizeAsync(id: string, userId: string): Promise<void> {
    const doc = await this.findOne(id, userId);
    if (!doc.currentContent) {
      throw new BadRequestException('요약할 내용이 없습니다.');
    }

    this.progressService.start(id);
    this.progressService.emit(id, { step: 'started', message: '프레젠테이션 분석을 시작합니다...' });

    // fire-and-forget
    this.runSummarize(id, doc.currentContent).catch(() => {});
  }

  private async runSummarize(id: string, content: string): Promise<void> {
    try {
      this.progressService.emit(id, { step: 'analyzing', message: '문서를 분석하고 있습니다...' });
      this.progressService.emit(id, { step: 'summarizing', message: '프레젠테이션 가이드를 생성하고 있습니다...' });

      const result = await this.summaryService.summarize(content);

      await this.repository.updateDoc(id, { summaryJson: result as any });

      this.progressService.emit(id, { step: 'completed', message: '분석이 완료되었습니다!' });
    } catch (err) {
      this.logger.error(`Summary failed for document ${id}`, err);
      this.progressService.emit(id, { step: 'failed', message: '프레젠테이션 분석에 실패했습니다.' });
    } finally {
      this.progressService.complete(id);
    }
  }

  async generateSlidesAsync(id: string, userId: string): Promise<void> {
    const doc = await this.findOne(id, userId);
    if (!doc.currentContent) {
      throw new BadRequestException('슬라이드를 생성할 내용이 없습니다.');
    }

    const progressKey = `slides:${id}`;
    this.progressService.start(progressKey);
    this.progressService.emit(progressKey, { step: 'started', message: '슬라이드 생성을 시작합니다...' });

    // fire-and-forget
    this.runGenerateSlides(id, doc.currentContent).catch(() => {});
  }

  private async runGenerateSlides(id: string, content: string): Promise<void> {
    const progressKey = `slides:${id}`;
    try {
      this.progressService.emit(progressKey, { step: 'analyzing', message: '문서를 분석하고 있습니다...' });
      this.progressService.emit(progressKey, { step: 'summarizing', message: 'AI가 슬라이드를 구성하고 있습니다...' });

      const result = await this.slidesService.generateSlides(content);

      await this.repository.updateDoc(id, { slidesJson: result as any });

      this.progressService.emit(progressKey, { step: 'completed', message: '슬라이드 생성이 완료되었습니다!' });
    } catch (err) {
      this.logger.error(`Slides generation failed for document ${id}`, err);
      this.progressService.emit(progressKey, { step: 'failed', message: '슬라이드 생성에 실패했습니다.' });
    } finally {
      this.progressService.complete(progressKey);
    }
  }
}
