import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateScheduleEntry1711700006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'schedule_entries',
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
            name: 'screenId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'playlistId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'startTime',
            type: 'datetime',
            isNullable: false,
          },
          {
            name: 'endTime',
            type: 'datetime',
            isNullable: false,
          },
          {
            name: 'rrule',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'colour',
            type: 'varchar',
            isNullable: false,
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
            name: 'FK_schedule_entry_organisation',
            columnNames: ['organisationId'],
            referencedTableName: 'organisations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_schedule_entry_screen',
            columnNames: ['screenId'],
            referencedTableName: 'screens',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_schedule_entry_playlist',
            columnNames: ['playlistId'],
            referencedTableName: 'playlists',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'schedule_entries',
      new TableIndex({
        name: 'IDX_schedule_entry_screenId',
        columnNames: ['screenId'],
      }),
    );

    await queryRunner.createIndex(
      'schedule_entries',
      new TableIndex({
        name: 'IDX_schedule_entry_startTime_endTime',
        columnNames: ['startTime', 'endTime'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'schedule_entries',
      'IDX_schedule_entry_startTime_endTime',
    );
    await queryRunner.dropIndex(
      'schedule_entries',
      'IDX_schedule_entry_screenId',
    );
    await queryRunner.dropTable('schedule_entries');
  }
}
