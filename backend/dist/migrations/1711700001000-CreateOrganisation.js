"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrganisation1711700001000 = void 0;
const typeorm_1 = require("typeorm");
class CreateOrganisation1711700001000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'organisations',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'uuid',
                },
                {
                    name: 'name',
                    type: 'varchar',
                    isUnique: true,
                    isNullable: false,
                },
                {
                    name: 'timeZone',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'storageOriginalLimitBytes',
                    type: 'bigint',
                    default: 0,
                },
                {
                    name: 'storageTranscodedLimitBytes',
                    type: 'bigint',
                    default: 0,
                },
                {
                    name: 'storageOriginalUsedBytes',
                    type: 'bigint',
                    default: 0,
                },
                {
                    name: 'storageTranscodedUsedBytes',
                    type: 'bigint',
                    default: 0,
                },
                {
                    name: 'defaultPlaylistId',
                    type: 'varchar',
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
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('organisations');
    }
}
exports.CreateOrganisation1711700001000 = CreateOrganisation1711700001000;
//# sourceMappingURL=1711700001000-CreateOrganisation.js.map