import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkoutHistoryImport1794150000000 implements MigrationInterface {
  name = 'WorkoutHistoryImport1794150000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions" ADD COLUMN "sourceImport" character varying(64);
      ALTER TABLE "sessions" ADD COLUMN "sourceIndex" integer;
      CREATE UNIQUE INDEX "UQ_sessions_source_import_index"
        ON "sessions" ("sourceImport", "sourceIndex")
        WHERE "sourceImport" IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "UQ_sessions_source_import_index";
      ALTER TABLE "sessions" DROP COLUMN "sourceIndex";
      ALTER TABLE "sessions" DROP COLUMN "sourceImport";
    `);
  }
}
