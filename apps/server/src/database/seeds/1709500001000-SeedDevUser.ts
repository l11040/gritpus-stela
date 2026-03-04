import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class SeedDevUser1709500001000 implements MigrationInterface {
  name = 'SeedDevUser1709500001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existing = await queryRunner.query(
      `SELECT id FROM \`users\` WHERE email = ?`,
      ['rio@softsquared.com'],
    );
    if (existing.length > 0) return;

    const hashedPassword = await bcrypt.hash('qwer1234@', 10);
    const userId = uuidv4();

    await queryRunner.query(
      `INSERT INTO \`users\` (\`id\`, \`email\`, \`password\`, \`name\`, \`role\`, \`isApproved\`) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, 'rio@softsquared.com', hashedPassword, 'Rio', 'admin', 1],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM \`users\` WHERE email = ?`,
      ['rio@softsquared.com'],
    );
  }
}
