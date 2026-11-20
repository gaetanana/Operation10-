import { MigrationInterface, QueryRunner } from 'typeorm';

export class FlexibleTrainingProgram1794434400000 implements MigrationInterface {
  name = 'FlexibleTrainingProgram1794434400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "training_programs" (
        "id" character varying(32) PRIMARY KEY,
        "sessionTemplateIds" jsonb NOT NULL DEFAULT '[]',
        "moduleTemplateIds" jsonb NOT NULL DEFAULT '[]',
        "weeklyMinimum" integer NOT NULL DEFAULT 4,
        "weeklyMaximum" integer NOT NULL DEFAULT 7,
        CONSTRAINT "CHK_training_program_weekly_range"
          CHECK ("weeklyMinimum" >= 1 AND "weeklyMaximum" <= 7 AND "weeklyMinimum" <= "weeklyMaximum")
      );
      ALTER TABLE "training_programs" ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON "training_programs" FROM PUBLIC;
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          REVOKE ALL ON "training_programs" FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          REVOKE ALL ON "training_programs" FROM authenticated;
        END IF;
      END $$;
      ALTER TABLE "exercises"
        ADD COLUMN "activityType" character varying(30),
        ADD COLUMN "moduleId" uuid,
        ADD COLUMN "moduleName" character varying;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exercises"
        DROP COLUMN "moduleName",
        DROP COLUMN "moduleId",
        DROP COLUMN "activityType";
      DROP TABLE "training_programs";
    `);
  }
}
