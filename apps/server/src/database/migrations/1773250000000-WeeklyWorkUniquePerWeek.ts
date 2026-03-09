import { MigrationInterface, QueryRunner } from 'typeorm';

export class WeeklyWorkUniquePerWeek1773250000000 implements MigrationInterface {
  name = 'WeeklyWorkUniquePerWeek1773250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE w1 FROM \`weekly_work_histories\` w1
      INNER JOIN \`weekly_work_histories\` w2
        ON w1.\`userId\` = w2.\`userId\`
        AND w1.\`weekStartDate\` = w2.\`weekStartDate\`
        AND w1.\`type\` = w2.\`type\`
        AND (
          w1.\`createdAt\` < w2.\`createdAt\`
          OR (w1.\`createdAt\` = w2.\`createdAt\` AND w1.\`id\` < w2.\`id\`)
        )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX \`UQ_weekly_work_histories_user_week_type\`
      ON \`weekly_work_histories\` (\`userId\`, \`weekStartDate\`, \`type\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `UQ_weekly_work_histories_user_week_type` ON `weekly_work_histories`');
  }
}
