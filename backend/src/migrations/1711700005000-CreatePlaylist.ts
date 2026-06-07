import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePlaylist1711700005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'playlists',
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
            name: 'name',
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
            name: 'FK_playlist_organisation',
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
      'playlists',
      new TableIndex({
        name: 'IDX_playlist_organisationId',
        columnNames: ['organisationId'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'playlist_items',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'playlistId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'contentId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'position',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'durationSeconds',
            type: 'integer',
            isNullable: false,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_playlist_item_playlist',
            columnNames: ['playlistId'],
            referencedTableName: 'playlists',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_playlist_item_content',
            columnNames: ['contentId'],
            referencedTableName: 'contents',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'playlist_items',
      new TableIndex({
        name: 'IDX_playlist_item_playlistId',
        columnNames: ['playlistId'],
      }),
    );

    // Add FK constraint for Organisation.defaultPlaylistId → Playlist.id
    // (deferred from feature 003)
    await queryRunner.createForeignKey(
      'organisations',
      new TableForeignKey({
        name: 'FK_organisation_default_playlist',
        columnNames: ['defaultPlaylistId'],
        referencedTableName: 'playlists',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('organisations', 'FK_organisation_default_playlist');
    await queryRunner.dropIndex('playlist_items', 'IDX_playlist_item_playlistId');
    await queryRunner.dropTable('playlist_items');
    await queryRunner.dropIndex('playlists', 'IDX_playlist_organisationId');
    await queryRunner.dropTable('playlists');
  }
}
