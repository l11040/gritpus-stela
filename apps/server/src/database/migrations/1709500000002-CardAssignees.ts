import { MigrationInterface, QueryRunner } from 'typeorm';

export class CardAssignees1709500000002 implements MigrationInterface {
  name = 'CardAssignees1709500000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`card_assignees\` (
        \`cardId\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        PRIMARY KEY (\`cardId\`, \`userId\`),
        INDEX \`IDX_card_assignees_cardId\` (\`cardId\`),
        INDEX \`IDX_card_assignees_userId\` (\`userId\`),
        CONSTRAINT \`FK_card_assignees_card\`
          FOREIGN KEY (\`cardId\`) REFERENCES \`cards\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_card_assignees_user\`
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`card_assignees\` (\`cardId\`, \`userId\`)
      SELECT \`id\`, \`assigneeId\` FROM \`cards\` WHERE \`assigneeId\` IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `card_assignees`');
  }
}
