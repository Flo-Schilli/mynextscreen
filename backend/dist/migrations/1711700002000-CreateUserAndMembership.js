"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserAndMembership1711700002000 = void 0;
const typeorm_1 = require("typeorm");
class CreateUserAndMembership1711700002000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'users',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    isPrimary: true,
                },
                {
                    name: 'email',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'name',
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
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'user_organisation_memberships',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'uuid',
                },
                {
                    name: 'userId',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'organisationId',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'role',
                    type: 'varchar',
                    isNullable: false,
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: "datetime('now')",
                },
            ],
            uniques: [
                new typeorm_1.TableUnique({
                    name: 'UQ_user_organisation',
                    columnNames: ['userId', 'organisationId'],
                }),
            ],
            foreignKeys: [
                new typeorm_1.TableForeignKey({
                    name: 'FK_membership_user',
                    columnNames: ['userId'],
                    referencedTableName: 'users',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
                new typeorm_1.TableForeignKey({
                    name: 'FK_membership_organisation',
                    columnNames: ['organisationId'],
                    referencedTableName: 'organisations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('user_organisation_memberships');
        await queryRunner.dropTable('users');
    }
}
exports.CreateUserAndMembership1711700002000 = CreateUserAndMembership1711700002000;
//# sourceMappingURL=1711700002000-CreateUserAndMembership.js.map