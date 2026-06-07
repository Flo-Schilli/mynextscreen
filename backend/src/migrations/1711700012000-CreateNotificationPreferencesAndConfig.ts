import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateNotificationPreferencesAndConfig1711700012000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_notification_preferences table
    await queryRunner.createTable(
      new Table({
        name: 'user_notification_preferences',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'userId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'organisationId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'inAppEnabled',
            type: 'boolean',
            default: 1,
          },
          {
            name: 'emailEnabled',
            type: 'boolean',
            default: 0,
          },
          {
            name: 'ntfyEnabled',
            type: 'boolean',
            default: 0,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_user_notif_pref_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_user_notif_pref_organisation',
            columnNames: ['organisationId'],
            referencedTableName: 'organisations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
        uniques: [
          {
            name: 'UQ_user_notification_pref_user_org',
            columnNames: ['userId', 'organisationId'],
          },
        ],
      }),
      true,
    );

    // Create organisation_notification_configs table
    await queryRunner.createTable(
      new Table({
        name: 'organisation_notification_configs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'organisationId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'smtpHost',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'smtpPort',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'smtpUser',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'smtpPassword',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'smtpFrom',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'smtpSecure',
            type: 'boolean',
            default: 0,
          },
          {
            name: 'ntfyUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ntfyTopic',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ntfyToken',
            type: 'varchar',
            isNullable: true,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_org_notif_config_organisation',
            columnNames: ['organisationId'],
            referencedTableName: 'organisations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
        uniques: [
          {
            name: 'UQ_org_notification_config_org',
            columnNames: ['organisationId'],
          },
        ],
      }),
      true,
    );

    // Add index on user_notification_preferences for fast lookup
    await queryRunner.createIndex(
      'user_notification_preferences',
      new TableIndex({
        name: 'IDX_user_notif_pref_userId_orgId',
        columnNames: ['userId', 'organisationId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'user_notification_preferences',
      'IDX_user_notif_pref_userId_orgId',
    );
    await queryRunner.dropTable('organisation_notification_configs');
    await queryRunner.dropTable('user_notification_preferences');
  }
}
