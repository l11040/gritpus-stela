import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlidesJson1774100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`md_documents\` ADD COLUMN \`slidesJson\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`md_documents\` DROP COLUMN \`slidesJson\``,
    );
  }
}
