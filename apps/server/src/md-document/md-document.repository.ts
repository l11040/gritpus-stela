import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MdDocument } from './entities/md-document.entity';
import { MdDocumentVersion } from './entities/md-document-version.entity';

export interface FindAllOptions {
  search?: string;
  shared?: string;
  sort?: string;
}

@Injectable()
export class MdDocumentRepository {
  constructor(
    @InjectRepository(MdDocument)
    private readonly docRepo: Repository<MdDocument>,
    @InjectRepository(MdDocumentVersion)
    private readonly versionRepo: Repository<MdDocumentVersion>,
  ) {}

  // ─── MdDocument ───

  async findAll(userId: string, options?: FindAllOptions): Promise<MdDocument[]> {
    const qb = this.docRepo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.owner', 'owner');

    if (options?.shared === 'true') {
      qb.where('doc.isShared = 1');
    } else if (options?.shared === 'false') {
      qb.where('doc.ownerId = :userId AND doc.isShared = 0', { userId });
    } else {
      qb.where('doc.ownerId = :userId', { userId }).orWhere('doc.isShared = 1');
    }

    if (options?.search?.trim()) {
      const keyword = `%${options.search.trim()}%`;
      qb.andWhere('(doc.title LIKE :keyword OR owner.name LIKE :keyword)', {
        keyword,
      });
    }

    if (options?.sort === 'title') {
      qb.orderBy('doc.title', 'ASC');
    } else if (options?.sort === 'created') {
      qb.orderBy('doc.createdAt', 'DESC');
    } else {
      qb.orderBy('doc.updatedAt', 'DESC');
    }

    return qb.getMany();
  }

  async findOneById(id: string): Promise<MdDocument | null> {
    return this.docRepo.findOne({
      where: { id },
      relations: ['owner'],
    });
  }

  async findOneByIdOnly(id: string): Promise<MdDocument | null> {
    return this.docRepo.findOne({ where: { id } });
  }

  createDoc(data: Partial<MdDocument>): MdDocument {
    return this.docRepo.create(data);
  }

  async saveDoc(doc: MdDocument): Promise<MdDocument> {
    return this.docRepo.save(doc);
  }

  async updateDoc(id: string, data: Partial<MdDocument>): Promise<void> {
    await this.docRepo.update(id, data);
  }

  async deleteDoc(id: string): Promise<void> {
    await this.docRepo.delete(id);
  }

  // ─── MdDocumentVersion ───

  async findVersions(documentId: string): Promise<MdDocumentVersion[]> {
    return this.versionRepo.find({
      where: { documentId },
      relations: ['createdBy'],
      order: { version: 'DESC' },
    });
  }

  async findVersion(
    documentId: string,
    version: number,
  ): Promise<MdDocumentVersion | null> {
    return this.versionRepo.findOne({
      where: { documentId, version },
      relations: ['createdBy'],
    });
  }

  createVersion(data: Partial<MdDocumentVersion>): MdDocumentVersion {
    return this.versionRepo.create(data);
  }

  async saveVersion(version: MdDocumentVersion): Promise<MdDocumentVersion> {
    return this.versionRepo.save(version);
  }
}
