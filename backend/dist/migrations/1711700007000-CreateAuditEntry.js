"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAuditEntry1711700007000 = void 0;
const typeorm_1 = require("typeorm");
class CreateAuditEntry1711700007000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'audit_entries',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'uuid',
                },
                {
                    name: 'timestamp',
                    type: 'datetime',
                    default: "datetime('now')",
                },
                {
                    name: 'userId',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'organisationId',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'action',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'resourceType',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'resourceId',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'details',
                    type: 'text',
                    isNullable: true,
                },
            ],
            foreignKeys: [
                new typeorm_1.TableForeignKey({
                    name: 'FK_audit_entry_organisation',
                    columnNames: ['organisationId'],
                    referencedTableName: 'organisations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
        await queryRunner.createIndex('audit_entries', new typeorm_1.TableIndex({
            name: 'IDX_audit_entry_organisationId',
            columnNames: ['organisationId'],
        }));
        await queryRunner.createIndex('audit_entries', new typeorm_1.TableIndex({
            name: 'IDX_audit_entry_timestamp',
            columnNames: ['timestamp'],
        }));
        await queryRunner.createIndex('audit_entries', new typeorm_1.TableIndex({
            name: 'IDX_audit_entry_action',
            columnNames: ['action'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropIndex('audit_entries', 'IDX_audit_entry_action');
        await queryRunner.dropIndex('audit_entries', 'IDX_audit_entry_timestamp');
        await queryRunner.dropIndex('audit_entries', 'IDX_audit_entry_organisationId');
        await queryRunner.dropTable('audit_entries');
    }
}
exports.CreateAuditEntry1711700007000 = CreateAuditEntry1711700007000;
//# sourceMappingURL=1711700007000-CreateAuditEntry.js.map