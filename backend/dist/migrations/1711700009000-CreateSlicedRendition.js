"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSlicedRendition1711700009000 = void 0;
const typeorm_1 = require("typeorm");
class CreateSlicedRendition1711700009000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'sliced_renditions',
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
                    name: 'groupId',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'screenId',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'contentItemId',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'filePath',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'sourceHash',
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
                    name: 'FK_sliced_rendition_organisation',
                    columnNames: ['organisationId'],
                    referencedTableName: 'organisations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
                new typeorm_1.TableForeignKey({
                    name: 'FK_sliced_rendition_group',
                    columnNames: ['groupId'],
                    referencedTableName: 'screen_groups',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
                new typeorm_1.TableForeignKey({
                    name: 'FK_sliced_rendition_screen',
                    columnNames: ['screenId'],
                    referencedTableName: 'screens',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
                new typeorm_1.TableForeignKey({
                    name: 'FK_sliced_rendition_content',
                    columnNames: ['contentItemId'],
                    referencedTableName: 'contents',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('sliced_renditions');
    }
}
exports.CreateSlicedRendition1711700009000 = CreateSlicedRendition1711700009000;
//# sourceMappingURL=1711700009000-CreateSlicedRendition.js.map