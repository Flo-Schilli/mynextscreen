import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateSlicedRendition1711700009000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
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
          new TableForeignKey({
            name: 'FK_sliced_rendition_organisation',
            columnNames: ['organisationId'],
            referencedTableName: 'organisations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_sliced_rendition_group',
            columnNames: ['groupId'],
            referencedTableName: 'screen_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_sliced_rendition_screen',
            columnNames: ['screenId'],
            referencedTableName: 'screens',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_sliced_rendition_content',
            columnNames: ['contentItemId'],
            referencedTableName: 'contents',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sliced_renditions');
  }
}
