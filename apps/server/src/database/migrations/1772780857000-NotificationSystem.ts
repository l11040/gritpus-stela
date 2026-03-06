import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationSystem1772780857000 implements MigrationInterface {
  name = 'NotificationSystem1772780857000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notifications\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`type\` enum('card_assigned', 'card_due_soon', 'meeting_parsed') NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`message\` text NOT NULL,
        \`relatedEntityType\` enum('card', 'meeting', 'project') NULL,
        \`relatedEntityId\` varchar(36) NULL,
        \`isRead\` tinyint NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_notifications_userId\` (\`userId\`),
        INDEX \`IDX_notifications_isRead_userId\` (\`isRead\`, \`userId\`),
        INDEX \`IDX_notifications_createdAt\` (\`createdAt\`),
        CONSTRAINT \`FK_notifications_user\`
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `notifications`');
  }
}
