import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Sse,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { MdDocumentService } from './md-document.service';
import { MdDocumentPdfService } from './md-document-pdf.service';
import { MdDocumentSlidesService } from './md-document-slides.service';
import { MdDocumentProgressService } from './md-document-progress.service';
import { CreateMdDocumentDto, UpdateMdDocumentDto } from './md-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILE_SIZE_ERROR_MESSAGE,
} from '../common/constants/upload.constants';
import {
  CreateMdDocumentDocs,
  GetMdDocumentsDocs,
  GetMdDocumentDocs,
  UpdateMdDocumentDocs,
  DeleteMdDocumentDocs,
  GetMdDocumentVersionsDocs,
  GetMdDocumentVersionDocs,
  RestoreVersionDocs,
  ToggleSharingDocs,
  SummarizeMdDocumentDocs,
  SummarizeEventsDocs,
  ExportPdfDocs,
  ExportPresentationPdfDocs,
  ExportSlidesPdfDocs,
  GenerateSlidesDocs,
  SlidesEventsDocs,
  GetSlidesDocs,
} from './md-document.swagger';

@ApiTags('md-documents')
@Controller('md-documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MdDocumentController {
  constructor(
    private readonly mdDocumentService: MdDocumentService,
    private readonly pdfService: MdDocumentPdfService,
    private readonly slidesService: MdDocumentSlidesService,
    private readonly progressService: MdDocumentProgressService,
  ) {}

  @Post()
  @CreateMdDocumentDocs()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMdDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_UPLOAD_FILE_SIZE_BYTES,
            message: MAX_UPLOAD_FILE_SIZE_ERROR_MESSAGE,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.mdDocumentService.create(user.id, dto, file);
  }

  @Get()
  @GetMdDocumentsDocs()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('shared') shared?: string,
    @Query('sort') sort?: string,
  ) {
    return this.mdDocumentService.findAll(user.id, { search, shared, sort });
  }

  @Get(':id')
  @GetMdDocumentDocs()
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.mdDocumentService.findOne(id, user.id);
  }

  @Patch(':id')
  @UpdateMdDocumentDocs()
  update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateMdDocumentDto,
  ) {
    return this.mdDocumentService.update(id, user.id, dto);
  }

  @Delete(':id')
  @DeleteMdDocumentDocs()
  remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.mdDocumentService.remove(id, user.id);
  }

  @Get(':id/versions')
  @GetMdDocumentVersionsDocs()
  getVersions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.mdDocumentService.getVersions(id, user.id);
  }

  @Get(':id/versions/:version')
  @GetMdDocumentVersionDocs()
  getVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.mdDocumentService.getVersion(id, version, user.id);
  }

  @Post(':id/versions/:version/restore')
  @RestoreVersionDocs()
  restoreVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.mdDocumentService.restoreVersion(id, version, user.id);
  }

  @Patch(':id/sharing')
  @ToggleSharingDocs()
  toggleSharing(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('isShared') isShared: boolean,
  ) {
    return this.mdDocumentService.toggleSharing(id, user.id, isShared);
  }

  @Post(':id/summarize')
  @HttpCode(HttpStatus.ACCEPTED)
  @SummarizeMdDocumentDocs()
  summarize(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.mdDocumentService.summarizeAsync(id, user.id);
  }

  @Get(':id/export/pdf')
  @ExportPdfDocs()
  async exportPdf(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const doc = await this.mdDocumentService.findOne(id, user.id);
    if (!doc.currentContent) {
      res.status(400).json({ message: '내보낼 내용이 없습니다.' });
      return;
    }

    const pdfBuffer = await this.pdfService.generatePdf(
      doc.currentContent,
      doc.title,
    );

    this.sendPdf(res, pdfBuffer, doc.title);
  }

  @Get(':id/export/presentation-pdf')
  @ExportPresentationPdfDocs()
  async exportPresentationPdf(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const doc = await this.mdDocumentService.findOne(id, user.id);
    if (!doc.currentContent) {
      res.status(400).json({ message: '내보낼 내용이 없습니다.' });
      return;
    }

    const pdfBuffer = await this.pdfService.generatePresentationPdf(
      doc.currentContent,
      doc.title,
    );

    this.sendPdf(res, pdfBuffer, `${doc.title}_프레젠테이션`);
  }

  @Get(':id/export/slides-pdf')
  @ExportSlidesPdfDocs()
  async exportSlidesPdf(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const doc = await this.mdDocumentService.findOne(id, user.id);
    if (!doc.slidesJson) {
      res.status(400).json({ message: 'AI 슬라이드가 아직 생성되지 않았습니다.' });
      return;
    }

    const pdfBuffer = await this.pdfService.generateSlidesPdf(
      doc.slidesJson as any,
    );

    this.sendPdf(res, pdfBuffer, `${doc.title}_AI슬라이드`);
  }

  private sendPdf(res: Response, buffer: Buffer, title: string) {
    const filename = encodeURIComponent(title) + '.pdf';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Sse(':id/summarize/events')
  @SummarizeEventsDocs()
  summarizeEvents(@Param('id') id: string): Observable<MessageEvent> {
    return this.progressService.subscribe(id);
  }

  @Post(':id/slides/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @GenerateSlidesDocs()
  generateSlides(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.mdDocumentService.generateSlidesAsync(id, user.id);
  }

  @Sse(':id/slides/events')
  @SlidesEventsDocs()
  slidesEvents(@Param('id') id: string): Observable<MessageEvent> {
    return this.progressService.subscribe(`slides:${id}`);
  }

  @Get(':id/slides')
  @GetSlidesDocs()
  async getSlides(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const doc = await this.mdDocumentService.findOne(id, user.id);
    return doc.slidesJson || null;
  }
}
