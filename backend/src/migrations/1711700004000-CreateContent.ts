import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateContent1711700004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
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
          new TableForeignKey({
            name: 'FK_content_organisation',
            columnNames: ['organisationId'],
            referencedTableName: 'organisations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'contents',
      new TableIndex({
        name: 'IDX_content_organisationId',
        columnNames: ['organisationId'],
      }),
    );

    await queryRunner.createIndex(
      'contents',
      new TableIndex({
        name: 'IDX_content_type',
        columnNames: ['type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('contents', 'IDX_content_type');
    await queryRunner.dropIndex('contents', 'IDX_content_organisationId');
    await queryRunner.dropTable('contents');
  }
}
