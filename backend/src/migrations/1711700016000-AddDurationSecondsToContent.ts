import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDurationSecondsToContent1711700016000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'contents',
      new TableColumn({
        name: 'durationSeconds',
        type: 'integer',
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('contents', 'durationSeconds');
  }
}
