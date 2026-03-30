import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1711700000000 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // Empty initial migration — schema will be built by subsequent migrations
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Nothing to revert
  }
}
