import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContentToLongtext1709500000001 implements MigrationInterface {
  name = 'ContentToLongtext1709500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`meeting_minutes\` MODIFY COLUMN \`rawContent\` LONGTEXT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`cards\` MODIFY COLUMN \`description\` LONGTEXT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`meeting_minutes\` MODIFY COLUMN \`rawContent\` TEXT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`cards\` MODIFY COLUMN \`description\` TEXT NULL`,
    );
  }
}
