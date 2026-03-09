import { MigrationInterface, QueryRunner } from 'typeorm';

export class WeeklyWork1773200000000 implements MigrationInterface {
  name = 'WeeklyWork1773200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`weekly_work_preferences\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`planTemplate\` longtext NULL,
        \`reportTemplate\` longtext NULL,
        \`planCases\` json NULL,
        \`reportCases\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_weekly_work_preferences_userId\` (\`userId\`),
        CONSTRAINT \`FK_weekly_work_preferences_user\`
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`weekly_work_histories\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`type\` enum('plan', 'report') NOT NULL,
        \`weekStartDate\` date NOT NULL,
        \`inputType\` enum('chat', 'voice') NOT NULL,
        \`sourceText\` longtext NOT NULL,
        \`markdown\` longtext NOT NULL,
        \`planReferenceId\` varchar(36) NULL,
        \`metadata\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_weekly_work_histories_userId\` (\`userId\`),
        INDEX \`IDX_weekly_work_histories_weekStartDate\` (\`weekStartDate\`),
        INDEX \`IDX_weekly_work_histories_type\` (\`type\`),
        CONSTRAINT \`FK_weekly_work_histories_user\`
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_weekly_work_histories_plan_reference\`
          FOREIGN KEY (\`planReferenceId\`) REFERENCES \`weekly_work_histories\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `weekly_work_histories`');
    await queryRunner.query('DROP TABLE IF EXISTS `weekly_work_preferences`');
  }
}
