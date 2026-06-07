import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateLiveStreamActivation1711700014000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'live_stream_activations',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'streamId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'screenId',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'activatedAt',
            type: 'datetime',
            default: "datetime('now')",
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_live_stream_activation_stream',
            columnNames: ['streamId'],
            referencedTableName: 'live_streams',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'live_stream_activations',
      new TableIndex({
        name: 'IDX_live_stream_activation_streamId',
        columnNames: ['streamId'],
      }),
    );

    await queryRunner.createIndex(
      'live_stream_activations',
      new TableIndex({
        name: 'IDX_live_stream_activation_screenId',
        columnNames: ['screenId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('live_stream_activations', 'IDX_live_stream_activation_screenId');
    await queryRunner.dropIndex('live_stream_activations', 'IDX_live_stream_activation_streamId');
    await queryRunner.dropTable('live_stream_activations');
  }
}
