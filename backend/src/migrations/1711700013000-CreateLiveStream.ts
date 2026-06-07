import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateLiveStream1711700013000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'live_streams',
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
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'sourceUrl',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'protocol',
            type: 'varchar',
            default: "'rtmp'",
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'idle'",
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: "datetime('now')",
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: "datetime('now')",
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_live_stream_organisation',
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
      'live_streams',
      new TableIndex({
        name: 'IDX_live_stream_organisationId',
        columnNames: ['organisationId'],
      }),
    );

    await queryRunner.createIndex(
      'live_streams',
      new TableIndex({
        name: 'IDX_live_stream_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('live_streams', 'IDX_live_stream_status');
    await queryRunner.dropIndex(
      'live_streams',
      'IDX_live_stream_organisationId',
    );
    await queryRunner.dropTable('live_streams');
  }
}
