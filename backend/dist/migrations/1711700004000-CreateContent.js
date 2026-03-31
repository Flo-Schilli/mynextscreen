"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateContent1711700004000 = void 0;
const typeorm_1 = require("typeorm");
class CreateContent1711700004000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'contents',
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
                    name: 'title',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'description',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'tags',
                    type: 'text',
                    default: "'[]'",
                },
                {
                    name: 'type',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'originalFilename',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'originalMimeType',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'originalSizeBytes',
                    type: 'bigint',
                    isNullable: false,
                },
                {
                    name: 'transcodedSizeBytes',
                    type: 'bigint',
                    isNullable: true,
                },
                {
                    name: 'transcodingStatus',
                    type: 'varchar',
                    default: "'pending'",
                },
                {
                    name: 'transcodingError',
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
            foreignKeys: [
                new typeorm_1.TableForeignKey({
                    name: 'FK_content_organisation',
                    columnNames: ['organisationId'],
                    referencedTableName: 'organisations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
        await queryRunner.createIndex('contents', new typeorm_1.TableIndex({
            name: 'IDX_content_organisationId',
            columnNames: ['organisationId'],
        }));
        await queryRunner.createIndex('contents', new typeorm_1.TableIndex({
            name: 'IDX_content_type',
            columnNames: ['type'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropIndex('contents', 'IDX_content_type');
        await queryRunner.dropIndex('contents', 'IDX_content_organisationId');
        await queryRunner.dropTable('contents');
    }
}
exports.CreateContent1711700004000 = CreateContent1711700004000;
//# sourceMappingURL=1711700004000-CreateContent.js.map