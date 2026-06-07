import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAuditEntry1711700007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_entries',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'timestamp',
            type: 'datetime',
            default: "datetime('now')",
          },
          {
            name: 'userId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'organisationId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'resourceType',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'resourceId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'details',
            type: 'text',
            isNullable: true,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_audit_entry_organisation',
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
      'audit_entries',
      new TableIndex({
        name: 'IDX_audit_entry_organisationId',
        columnNames: ['organisationId'],
      }),
    );

    await queryRunner.createIndex(
      'audit_entries',
      new TableIndex({
        name: 'IDX_audit_entry_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'audit_entries',
      new TableIndex({
        name: 'IDX_audit_entry_action',
        columnNames: ['action'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('audit_entries', 'IDX_audit_entry_action');
    await queryRunner.dropIndex('audit_entries', 'IDX_audit_entry_timestamp');
    await queryRunner.dropIndex('audit_entries', 'IDX_audit_entry_organisationId');
    await queryRunner.dropTable('audit_entries');
  }
}
