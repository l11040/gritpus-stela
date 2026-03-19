import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MdDocumentController } from './md-document.controller';
import { MdDocumentService } from './md-document.service';
import { MdDocumentSummaryService } from './md-document-summary.service';
import { MdDocumentProgressService } from './md-document-progress.service';
import { MdDocument } from './entities/md-document.entity';
import { MdDocumentVersion } from './entities/md-document-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MdDocument, MdDocumentVersion])],
  controllers: [MdDocumentController],
  providers: [
    MdDocumentService,
    MdDocumentSummaryService,
    MdDocumentProgressService,
  ],
  exports: [MdDocumentService],
})
export class MdDocumentModule {}
