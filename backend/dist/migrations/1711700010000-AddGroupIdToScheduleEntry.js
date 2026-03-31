"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddGroupIdToScheduleEntry1711700010000 = void 0;
const typeorm_1 = require("typeorm");
class AddGroupIdToScheduleEntry1711700010000 {
    async up(queryRunner) {
        await queryRunner.changeColumn('schedule_entries', 'screenId', new typeorm_1.TableColumn({
            name: 'screenId',
            type: 'varchar',
            isNullable: true,
        }));
        await queryRunner.addColumn('schedule_entries', new typeorm_1.TableColumn({
            name: 'groupId',
            type: 'varchar',
            isNullable: true,
        }));
        await queryRunner.createForeignKey('schedule_entries', new typeorm_1.TableForeignKey({
            name: 'FK_schedule_entry_group',
            columnNames: ['groupId'],
            referencedTableName: 'screen_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropForeignKey('schedule_entries', 'FK_schedule_entry_group');
        await queryRunner.dropColumn('schedule_entries', 'groupId');
        await queryRunner.changeColumn('schedule_entries', 'screenId', new typeorm_1.TableColumn({
            name: 'screenId',
            type: 'varchar',
            isNullable: false,
        }));
    }
}
exports.AddGroupIdToScheduleEntry1711700010000 = AddGroupIdToScheduleEntry1711700010000;
//# sourceMappingURL=1711700010000-AddGroupIdToScheduleEntry.js.map