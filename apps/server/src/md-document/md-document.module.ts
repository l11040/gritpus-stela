import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MdDocumentController } from './md-document.controller';
import { MdDocumentService } from './md-document.service';
import { MdDocumentSummaryService } from './md-document-summary.service';
import { MdDocumentPdfService } from './md-document-pdf.service';
import { MdDocumentSlidesService } from './md-document-slides.service';
import { MdDocumentProgressService } from './md-document-progress.service';
import { MdDocumentRepository } from './md-document.repository';
import { MdDocument } from './entities/md-document.entity';
import { MdDocumentVersion } from './entities/md-document-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MdDocument, MdDocumentVersion])],
  controllers: [MdDocumentController],
  providers: [
    MdDocumentRepository,
    MdDocumentService,
    MdDocumentSummaryService,
    MdDocumentPdfService,
    MdDocumentSlidesService,
    MdDocumentProgressService,
  ],
  exports: [MdDocumentService],
})
export class MdDocumentModule {}
