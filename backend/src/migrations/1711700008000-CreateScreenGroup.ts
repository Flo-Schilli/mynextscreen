import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableColumn,
} from 'typeorm';

export class CreateScreenGroup1711700008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'screen_groups',
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
            name: 'mode',
            type: 'varchar',
            isNullable: false,
            default: "'mirror'",
          },
          {
            name: 'gridColumns',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'gridRows',
            type: 'integer',
            isNullable: true,
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
            name: 'FK_screen_group_organisation',
            columnNames: ['organisationId'],
            referencedTableName: 'organisations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // Add CHECK constraints for gridColumns and gridRows (must be > 0 when set)
    await queryRunner.query(
      `CREATE TRIGGER check_screen_group_grid_columns_insert
       BEFORE INSERT ON screen_groups
       FOR EACH ROW
       WHEN NEW.gridColumns IS NOT NULL AND NEW.gridColumns < 1
       BEGIN
         SELECT RAISE(ABORT, 'gridColumns must be greater than 0');
       END`,
    );

    await queryRunner.query(
      `CREATE TRIGGER check_screen_group_grid_columns_update
       BEFORE UPDATE ON screen_groups
       FOR EACH ROW
       WHEN NEW.gridColumns IS NOT NULL AND NEW.gridColumns < 1
       BEGIN
         SELECT RAISE(ABORT, 'gridColumns must be greater than 0');
       END`,
    );

    await queryRunner.query(
      `CREATE TRIGGER check_screen_group_grid_rows_insert
       BEFORE INSERT ON screen_groups
       FOR EACH ROW
       WHEN NEW.gridRows IS NOT NULL AND NEW.gridRows < 1
       BEGIN
         SELECT RAISE(ABORT, 'gridRows must be greater than 0');
       END`,
    );

    await queryRunner.query(
      `CREATE TRIGGER check_screen_group_grid_rows_update
       BEFORE UPDATE ON screen_groups
       FOR EACH ROW
       WHEN NEW.gridRows IS NOT NULL AND NEW.gridRows < 1
       BEGIN
         SELECT RAISE(ABORT, 'gridRows must be greater than 0');
       END`,
    );

    // Add groupId, gridRow, gridColumn columns to screens table
    await queryRunner.addColumn(
      'screens',
      new TableColumn({
        name: 'groupId',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'screens',
      new TableColumn({
        name: 'gridRow',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'screens',
      new TableColumn({
        name: 'gridColumn',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'screens',
      new TableForeignKey({
        name: 'FK_screen_group',
        columnNames: ['groupId'],
        referencedTableName: 'screen_groups',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Add CHECK constraints for gridRow and gridColumn on screens (must be >= 0 when set)
    await queryRunner.query(
      `CREATE TRIGGER check_screen_grid_row_insert
       BEFORE INSERT ON screens
       FOR EACH ROW
       WHEN NEW.gridRow IS NOT NULL AND NEW.gridRow < 0
       BEGIN
         SELECT RAISE(ABORT, 'gridRow must be >= 0');
       END`,
    );

    await queryRunner.query(
      `CREATE TRIGGER check_screen_grid_row_update
       BEFORE UPDATE ON screens
       FOR EACH ROW
       WHEN NEW.gridRow IS NOT NULL AND NEW.gridRow < 0
       BEGIN
         SELECT RAISE(ABORT, 'gridRow must be >= 0');
       END`,
    );

    await queryRunner.query(
      `CREATE TRIGGER check_screen_grid_column_insert
       BEFORE INSERT ON screens
       FOR EACH ROW
       WHEN NEW.gridColumn IS NOT NULL AND NEW.gridColumn < 0
       BEGIN
         SELECT RAISE(ABORT, 'gridColumn must be >= 0');
       END`,
    );

    await queryRunner.query(
      `CREATE TRIGGER check_screen_grid_column_update
       BEFORE UPDATE ON screens
       FOR EACH ROW
       WHEN NEW.gridColumn IS NOT NULL AND NEW.gridColumn < 0
       BEGIN
         SELECT RAISE(ABORT, 'gridColumn must be >= 0');
       END`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers on screens
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS check_screen_grid_column_update',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS check_screen_grid_column_insert',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS check_screen_grid_row_update',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS check_screen_grid_row_insert',
    );

    // Drop foreign key and columns from screens
    await queryRunner.dropForeignKey('screens', 'FK_screen_group');
    await queryRunner.dropColumn('screens', 'gridColumn');
    await queryRunner.dropColumn('screens', 'gridRow');
    await queryRunner.dropColumn('screens', 'groupId');

    // Drop triggers on screen_groups
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS check_screen_group_grid_rows_update',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS check_screen_group_grid_rows_insert',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS check_screen_group_grid_columns_update',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS check_screen_group_grid_columns_insert',
    );

    // Drop screen_groups table
    await queryRunner.dropTable('screen_groups');
  }
}
