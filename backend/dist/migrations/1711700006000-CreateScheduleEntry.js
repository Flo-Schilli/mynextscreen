"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateScheduleEntry1711700006000 = void 0;
const typeorm_1 = require("typeorm");
class CreateScheduleEntry1711700006000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
                new typeorm_1.TableForeignKey({
                    name: 'FK_schedule_entry_organisation',
                    columnNames: ['organisationId'],
                    referencedTableName: 'organisations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
                new typeorm_1.TableForeignKey({
                    name: 'FK_schedule_entry_screen',
                    columnNames: ['screenId'],
                    referencedTableName: 'screens',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
                new typeorm_1.TableForeignKey({
                    name: 'FK_schedule_entry_playlist',
                    columnNames: ['playlistId'],
                    referencedTableName: 'playlists',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
        await queryRunner.createIndex('schedule_entries', new typeorm_1.TableIndex({
            name: 'IDX_schedule_entry_screenId',
            columnNames: ['screenId'],
        }));
        await queryRunner.createIndex('schedule_entries', new typeorm_1.TableIndex({
            name: 'IDX_schedule_entry_startTime_endTime',
            columnNames: ['startTime', 'endTime'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropIndex('schedule_entries', 'IDX_schedule_entry_startTime_endTime');
        await queryRunner.dropIndex('schedule_entries', 'IDX_schedule_entry_screenId');
        await queryRunner.dropTable('schedule_entries');
    }
}
exports.CreateScheduleEntry1711700006000 = CreateScheduleEntry1711700006000;
//# sourceMappingURL=1711700006000-CreateScheduleEntry.js.map