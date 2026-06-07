import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddGroupIdToScheduleEntry1711700010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make screenId nullable — group-targeted entries have no screenId
    await queryRunner.changeColumn(
      'schedule_entries',
      'screenId',
      new TableColumn({
        name: 'screenId',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'schedule_entries',
      new TableColumn({
        name: 'groupId',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'schedule_entries',
      new TableForeignKey({
        name: 'FK_schedule_entry_group',
        columnNames: ['groupId'],
        referencedTableName: 'screen_groups',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'schedule_entries',
      'FK_schedule_entry_group',
    );
    await queryRunner.dropColumn('schedule_entries', 'groupId');

    await queryRunner.changeColumn(
      'schedule_entries',
      'screenId',
      new TableColumn({
        name: 'screenId',
        type: 'varchar',
        isNullable: false,
      }),
    );
  }
}
