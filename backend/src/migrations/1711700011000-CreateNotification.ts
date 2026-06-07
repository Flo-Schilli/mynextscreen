import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateNotification1711700011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
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
            name: 'eventType',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'read',
            type: 'boolean',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: "datetime('now')",
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_notification_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_notification_organisation',
            columnNames: ['organisationId'],
            referencedTableName: 'organisations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notification_userId_read',
        columnNames: ['userId', 'read'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notification_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('notifications', 'IDX_notification_userId_createdAt');
    await queryRunner.dropIndex('notifications', 'IDX_notification_userId_read');
    await queryRunner.dropTable('notifications');
  }
}
