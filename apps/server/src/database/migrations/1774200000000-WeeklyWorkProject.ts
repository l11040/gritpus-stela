import { MigrationInterface, QueryRunner } from 'typeorm';

export class WeeklyWorkProject1774200000000 implements MigrationInterface {
  name = 'WeeklyWorkProject1774200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`weekly_work_projects\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_weekly_work_projects_name\` (\`name\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT INTO \`weekly_work_projects\` (\`id\`, \`name\`)
      VALUES (UUID(), '오퍼레이션')
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      ADD COLUMN \`projectId\` varchar(36) NULL AFTER \`userId\`
    `);

    const [project] = await queryRunner.query(
      `SELECT id FROM \`weekly_work_projects\` WHERE \`name\` = '오퍼레이션' LIMIT 1`,
    );

    if (project) {
      await queryRunner.query(
        `UPDATE \`weekly_work_histories\` SET \`projectId\` = ? WHERE \`projectId\` IS NULL`,
        [project.id],
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      MODIFY COLUMN \`projectId\` varchar(36) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      ADD CONSTRAINT \`FK_weekly_work_histories_project\`
        FOREIGN KEY (\`projectId\`) REFERENCES \`weekly_work_projects\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      ADD INDEX \`IDX_weekly_work_histories_projectId\` (\`projectId\`)
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      DROP INDEX \`UQ_weekly_work_histories_user_week_type\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      ADD UNIQUE INDEX \`UQ_weekly_work_histories_user_week_type_project\` (\`userId\`, \`weekStartDate\`, \`type\`, \`projectId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      DROP INDEX \`UQ_weekly_work_histories_user_week_type_project\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      ADD UNIQUE INDEX \`UQ_weekly_work_histories_user_week_type\` (\`userId\`, \`weekStartDate\`, \`type\`)
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      DROP INDEX \`IDX_weekly_work_histories_projectId\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      DROP FOREIGN KEY \`FK_weekly_work_histories_project\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`weekly_work_histories\`
      DROP COLUMN \`projectId\`
    `);

    await queryRunner.query('DROP TABLE IF EXISTS `weekly_work_projects`');
  }
}
