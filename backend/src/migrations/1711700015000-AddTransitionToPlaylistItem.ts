import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTransitionToPlaylistItem1711700015000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'playlist_items',
      new TableColumn({
        name: 'transition',
        type: 'varchar',
        default: "'fade'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'playlist_items',
      new TableColumn({
        name: 'transitionDurationMs',
        type: 'integer',
        default: 500,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('playlist_items', 'transitionDurationMs');
    await queryRunner.dropColumn('playlist_items', 'transition');
  }
}
