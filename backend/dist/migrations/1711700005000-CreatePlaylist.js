"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePlaylist1711700005000 = void 0;
const typeorm_1 = require("typeorm");
class CreatePlaylist1711700005000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
                new typeorm_1.TableForeignKey({
                    name: 'FK_playlist_organisation',
                    columnNames: ['organisationId'],
                    referencedTableName: 'organisations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
        await queryRunner.createIndex('playlists', new typeorm_1.TableIndex({
            name: 'IDX_playlist_organisationId',
            columnNames: ['organisationId'],
        }));
        await queryRunner.createTable(new typeorm_1.Table({
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
                new typeorm_1.TableForeignKey({
                    name: 'FK_playlist_item_playlist',
                    columnNames: ['playlistId'],
                    referencedTableName: 'playlists',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
                new typeorm_1.TableForeignKey({
                    name: 'FK_playlist_item_content',
                    columnNames: ['contentId'],
                    referencedTableName: 'contents',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            ],
        }), true);
        await queryRunner.createIndex('playlist_items', new typeorm_1.TableIndex({
            name: 'IDX_playlist_item_playlistId',
            columnNames: ['playlistId'],
        }));
        await queryRunner.createForeignKey('organisations', new typeorm_1.TableForeignKey({
            name: 'FK_organisation_default_playlist',
            columnNames: ['defaultPlaylistId'],
            referencedTableName: 'playlists',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropForeignKey('organisations', 'FK_organisation_default_playlist');
        await queryRunner.dropIndex('playlist_items', 'IDX_playlist_item_playlistId');
        await queryRunner.dropTable('playlist_items');
        await queryRunner.dropIndex('playlists', 'IDX_playlist_organisationId');
        await queryRunner.dropTable('playlists');
    }
}
exports.CreatePlaylist1711700005000 = CreatePlaylist1711700005000;
//# sourceMappingURL=1711700005000-CreatePlaylist.js.map