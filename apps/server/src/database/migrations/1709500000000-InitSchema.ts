import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1709500000000 implements MigrationInterface {
  name = 'InitSchema1709500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`profileImageUrl\` varchar(255) NULL,
        \`role\` enum('admin', 'user') NOT NULL DEFAULT 'user',
        \`isApproved\` tinyint NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // api_keys
    await queryRunner.query(`
      CREATE TABLE \`api_keys\` (
        \`id\` varchar(36) NOT NULL,
        \`key\` varchar(255) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`expiresAt\` datetime NULL,
        \`lastUsedAt\` datetime NULL,
        \`userId\` varchar(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_api_keys_key\` (\`key\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_api_keys_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // projects
    await queryRunner.query(`
      CREATE TABLE \`projects\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // project_members
    await queryRunner.query(`
      CREATE TABLE \`project_members\` (
        \`id\` varchar(36) NOT NULL,
        \`role\` enum('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
        \`projectId\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_project_members_project_user\` (\`projectId\`, \`userId\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_project_members_project\` FOREIGN KEY (\`projectId\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_project_members_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // boards
    await queryRunner.query(`
      CREATE TABLE \`boards\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`position\` int NOT NULL DEFAULT 0,
        \`projectId\` varchar(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_boards_project\` FOREIGN KEY (\`projectId\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // board_columns
    await queryRunner.query(`
      CREATE TABLE \`board_columns\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`position\` int NOT NULL DEFAULT 0,
        \`color\` varchar(255) NULL,
        \`boardId\` varchar(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_board_columns_board\` FOREIGN KEY (\`boardId\`) REFERENCES \`boards\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // labels
    await queryRunner.query(`
      CREATE TABLE \`labels\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`color\` varchar(255) NOT NULL,
        \`projectId\` varchar(36) NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_labels_project\` FOREIGN KEY (\`projectId\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // cards
    await queryRunner.query(`
      CREATE TABLE \`cards\` (
        \`id\` varchar(36) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`priority\` enum('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
        \`position\` int NOT NULL DEFAULT 0,
        \`dueDate\` date NULL,
        \`columnId\` varchar(36) NOT NULL,
        \`assigneeId\` varchar(36) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_cards_column\` FOREIGN KEY (\`columnId\`) REFERENCES \`board_columns\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_cards_assignee\` FOREIGN KEY (\`assigneeId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    // card_labels (ManyToMany join table)
    await queryRunner.query(`
      CREATE TABLE \`card_labels\` (
        \`cardsId\` varchar(36) NOT NULL,
        \`labelsId\` varchar(36) NOT NULL,
        PRIMARY KEY (\`cardsId\`, \`labelsId\`),
        INDEX \`IDX_card_labels_cardsId\` (\`cardsId\`),
        INDEX \`IDX_card_labels_labelsId\` (\`labelsId\`),
        CONSTRAINT \`FK_card_labels_card\` FOREIGN KEY (\`cardsId\`) REFERENCES \`cards\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_card_labels_label\` FOREIGN KEY (\`labelsId\`) REFERENCES \`labels\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    // documents
    await queryRunner.query(`
      CREATE TABLE \`documents\` (
        \`id\` varchar(36) NOT NULL,
        \`originalName\` varchar(255) NOT NULL,
        \`storedName\` varchar(255) NOT NULL,
        \`mimeType\` varchar(255) NOT NULL,
        \`size\` bigint NOT NULL,
        \`storagePath\` varchar(255) NOT NULL,
        \`projectId\` varchar(36) NOT NULL,
        \`uploadedById\` varchar(36) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_documents_project\` FOREIGN KEY (\`projectId\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_documents_uploader\` FOREIGN KEY (\`uploadedById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    // meeting_minutes
    await queryRunner.query(`
      CREATE TABLE \`meeting_minutes\` (
        \`id\` varchar(36) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`rawContent\` text NULL,
        \`parsedActionItems\` json NULL,
        \`meetingSummary\` text NULL,
        \`status\` enum('uploaded', 'parsing', 'parsed', 'confirmed', 'failed') NOT NULL DEFAULT 'uploaded',
        \`projectId\` varchar(36) NOT NULL,
        \`documentId\` varchar(36) NULL,
        \`createdById\` varchar(36) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_meeting_minutes_project\` FOREIGN KEY (\`projectId\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_meeting_minutes_document\` FOREIGN KEY (\`documentId\`) REFERENCES \`documents\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_meeting_minutes_creator\` FOREIGN KEY (\`createdById\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`meeting_minutes\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`documents\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`card_labels\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`cards\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`labels\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`board_columns\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`boards\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`project_members\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`projects\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`api_keys\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
  }
}
