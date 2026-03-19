import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMdDocument1774000000000 implements MigrationInterface {
  name = 'CreateMdDocument1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`md_documents\` (
        \`id\` varchar(36) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`currentContent\` longtext NULL,
        \`currentVersion\` int NOT NULL DEFAULT 1,
        \`isShared\` tinyint NOT NULL DEFAULT 0,
        \`ownerId\` varchar(36) NOT NULL,
        \`summaryJson\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_md_documents_owner\` FOREIGN KEY (\`ownerId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`md_document_versions\` (
        \`id\` varchar(36) NOT NULL,
        \`documentId\` varchar(36) NOT NULL,
        \`version\` int NOT NULL,
        \`content\` longtext NOT NULL,
        \`changeNote\` varchar(255) NULL,
        \`createdById\` varchar(36) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_md_document_versions_document\` FOREIGN KEY (\`documentId\`) REFERENCES \`md_documents\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_md_document_versions_createdBy\` FOREIGN KEY (\`createdById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`md_document_versions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`md_documents\``);
  }
}
