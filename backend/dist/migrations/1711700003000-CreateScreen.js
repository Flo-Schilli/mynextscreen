"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateScreen1711700003000 = void 0;
const typeorm_1 = require("typeorm");
class CreateScreen1711700003000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'screens',
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
                    name: 'resolution',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'location',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'apiKeyHash',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'lastHeartbeat',
                    type: 'datetime',
                    isNullable: true,
                },
                {
                    name: 'isOnline',
                    type: 'boolean',
                    default: 0,
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
                    name: 'FK_screen_organisation',
                    columnNames: ['organisationId'],
                    referencedTableName: 'organisations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
        await queryRunner.createIndex('screens', new typeorm_1.TableIndex({
            name: 'IDX_screen_apiKeyHash',
            columnNames: ['apiKeyHash'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropIndex('screens', 'IDX_screen_apiKeyHash');
        await queryRunner.dropTable('screens');
    }
}
exports.CreateScreen1711700003000 = CreateScreen1711700003000;
//# sourceMappingURL=1711700003000-CreateScreen.js.map