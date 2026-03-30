import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOrganisation1711700001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
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
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('organisations');
  }
}
