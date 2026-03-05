import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILE_SIZE_ERROR_MESSAGE,
} from '../common/constants/upload.constants';

@ApiTags('documents')
@Controller('projects/:projectId/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: '문서 업로드' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_UPLOAD_FILE_SIZE_BYTES,
            message: MAX_UPLOAD_FILE_SIZE_ERROR_MESSAGE,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.documentService.upload(projectId, user.id, file);
  }

  @Get()
  @ApiOperation({ summary: '문서 목록' })
  findAll(@Param('projectId') projectId: string) {
    return this.documentService.findAll(projectId);
  }

  @Get(':documentId')
  @ApiOperation({ summary: '문서 메타데이터' })
  findOne(@Param('documentId') documentId: string) {
    return this.documentService.findOne(documentId);
  }

  @Get(':documentId/download')
  @ApiOperation({ summary: '문서 다운로드' })
  async download(@Param('documentId') documentId: string, @Res() res: Response) {
    const doc = await this.documentService.findOne(documentId);
    const filePath = await this.documentService.getFilePath(documentId);
    res.download(filePath, doc.originalName);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: '문서 삭제' })
  remove(@Param('documentId') documentId: string) {
    return this.documentService.remove(documentId);
  }
}
