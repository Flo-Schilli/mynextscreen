import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTranscodingPresetToLiveStream1711700017000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'live_streams',
      new TableColumn({
        name: 'transcodingPreset',
        type: 'varchar',
        isNullable: false,
        default: "'high_1080p'",
      }),
    );
    await queryRunner.addColumn(
      'live_streams',
      new TableColumn({
        name: 'audioEnabled',
        type: 'boolean',
        isNullable: false,
        default: 1,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('live_streams', 'audioEnabled');
    await queryRunner.dropColumn('live_streams', 'transcodingPreset');
  }
}
