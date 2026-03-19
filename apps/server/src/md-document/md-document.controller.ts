import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Sse,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { MdDocumentService } from './md-document.service';
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
} from './md-document.swagger';

@ApiTags('md-documents')
@Controller('md-documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MdDocumentController {
  constructor(
    private readonly mdDocumentService: MdDocumentService,
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
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.mdDocumentService.findAll(user.id);
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

  @Sse(':id/summarize/events')
  @SummarizeEventsDocs()
  summarizeEvents(@Param('id') id: string): Observable<MessageEvent> {
    return this.progressService.subscribe(id);
  }
}
