"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateScreenGroup1711700008000 = void 0;
const typeorm_1 = require("typeorm");
class CreateScreenGroup1711700008000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
                new typeorm_1.TableForeignKey({
                    name: 'FK_screen_group_organisation',
                    columnNames: ['organisationId'],
                    referencedTableName: 'organisations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
        await queryRunner.query(`CREATE TRIGGER check_screen_group_grid_columns_insert
       BEFORE INSERT ON screen_groups
       FOR EACH ROW
       WHEN NEW.gridColumns IS NOT NULL AND NEW.gridColumns < 1
       BEGIN
         SELECT RAISE(ABORT, 'gridColumns must be greater than 0');
       END`);
        await queryRunner.query(`CREATE TRIGGER check_screen_group_grid_columns_update
       BEFORE UPDATE ON screen_groups
       FOR EACH ROW
       WHEN NEW.gridColumns IS NOT NULL AND NEW.gridColumns < 1
       BEGIN
         SELECT RAISE(ABORT, 'gridColumns must be greater than 0');
       END`);
        await queryRunner.query(`CREATE TRIGGER check_screen_group_grid_rows_insert
       BEFORE INSERT ON screen_groups
       FOR EACH ROW
       WHEN NEW.gridRows IS NOT NULL AND NEW.gridRows < 1
       BEGIN
         SELECT RAISE(ABORT, 'gridRows must be greater than 0');
       END`);
        await queryRunner.query(`CREATE TRIGGER check_screen_group_grid_rows_update
       BEFORE UPDATE ON screen_groups
       FOR EACH ROW
       WHEN NEW.gridRows IS NOT NULL AND NEW.gridRows < 1
       BEGIN
         SELECT RAISE(ABORT, 'gridRows must be greater than 0');
       END`);
        await queryRunner.addColumn('screens', new typeorm_1.TableColumn({
            name: 'groupId',
            type: 'varchar',
            isNullable: true,
        }));
        await queryRunner.addColumn('screens', new typeorm_1.TableColumn({
            name: 'gridRow',
            type: 'integer',
            isNullable: true,
        }));
        await queryRunner.addColumn('screens', new typeorm_1.TableColumn({
            name: 'gridColumn',
            type: 'integer',
            isNullable: true,
        }));
        await queryRunner.createForeignKey('screens', new typeorm_1.TableForeignKey({
            name: 'FK_screen_group',
            columnNames: ['groupId'],
            referencedTableName: 'screen_groups',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
        }));
        await queryRunner.query(`CREATE TRIGGER check_screen_grid_row_insert
       BEFORE INSERT ON screens
       FOR EACH ROW
       WHEN NEW.gridRow IS NOT NULL AND NEW.gridRow < 0
       BEGIN
         SELECT RAISE(ABORT, 'gridRow must be >= 0');
       END`);
        await queryRunner.query(`CREATE TRIGGER check_screen_grid_row_update
       BEFORE UPDATE ON screens
       FOR EACH ROW
       WHEN NEW.gridRow IS NOT NULL AND NEW.gridRow < 0
       BEGIN
         SELECT RAISE(ABORT, 'gridRow must be >= 0');
       END`);
        await queryRunner.query(`CREATE TRIGGER check_screen_grid_column_insert
       BEFORE INSERT ON screens
       FOR EACH ROW
       WHEN NEW.gridColumn IS NOT NULL AND NEW.gridColumn < 0
       BEGIN
         SELECT RAISE(ABORT, 'gridColumn must be >= 0');
       END`);
        await queryRunner.query(`CREATE TRIGGER check_screen_grid_column_update
       BEFORE UPDATE ON screens
       FOR EACH ROW
       WHEN NEW.gridColumn IS NOT NULL AND NEW.gridColumn < 0
       BEGIN
         SELECT RAISE(ABORT, 'gridColumn must be >= 0');
       END`);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TRIGGER IF EXISTS check_screen_grid_column_update');
        await queryRunner.query('DROP TRIGGER IF EXISTS check_screen_grid_column_insert');
        await queryRunner.query('DROP TRIGGER IF EXISTS check_screen_grid_row_update');
        await queryRunner.query('DROP TRIGGER IF EXISTS check_screen_grid_row_insert');
        await queryRunner.dropForeignKey('screens', 'FK_screen_group');
        await queryRunner.dropColumn('screens', 'gridColumn');
        await queryRunner.dropColumn('screens', 'gridRow');
        await queryRunner.dropColumn('screens', 'groupId');
        await queryRunner.query('DROP TRIGGER IF EXISTS check_screen_group_grid_rows_update');
        await queryRunner.query('DROP TRIGGER IF EXISTS check_screen_group_grid_rows_insert');
        await queryRunner.query('DROP TRIGGER IF EXISTS check_screen_group_grid_columns_update');
        await queryRunner.query('DROP TRIGGER IF EXISTS check_screen_group_grid_columns_insert');
        await queryRunner.dropTable('screen_groups');
    }
}
exports.CreateScreenGroup1711700008000 = CreateScreenGroup1711700008000;
//# sourceMappingURL=1711700008000-CreateScreenGroup.js.map