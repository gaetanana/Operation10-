import { MigrationInterface, QueryRunner } from 'typeorm';

export class NutritionRoutine1794855600000 implements MigrationInterface {
  name = 'NutritionRoutine1794855600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nutrition_settings" ADD COLUMN "shaker" jsonb;
      ALTER TABLE "meals" ADD COLUMN "routineSlot" smallint;
      ALTER TABLE "meals" ADD CONSTRAINT "CHK_meals_routine_slot" CHECK ("routineSlot" IN (1, 2));
      CREATE UNIQUE INDEX "UQ_meals_routine_slot" ON "meals" ("date", "routineSlot");
      CREATE TABLE "nutrition_routine_days" (
        "date" date PRIMARY KEY,
        "creatineGrams" double precision,
        CONSTRAINT "CHK_creatine_grams" CHECK ("creatineGrams" >= 0 AND "creatineGrams" < 'Infinity'::float8)
      );
      ALTER TABLE "nutrition_routine_days" ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON "nutrition_routine_days" FROM PUBLIC;
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          REVOKE ALL ON "nutrition_routine_days" FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          REVOKE ALL ON "nutrition_routine_days" FROM authenticated;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "nutrition_routine_days" WHERE "creatineGrams" IS NOT NULL)
          OR EXISTS (SELECT 1 FROM "nutrition_settings" WHERE "shaker" IS NOT NULL)
          OR EXISTS (SELECT 1 FROM "meals" WHERE "routineSlot" IS NOT NULL) THEN
          RAISE EXCEPTION 'Cannot revert nutrition routine migration: routine data would be lost';
        END IF;
      END $$;
      DROP TABLE "nutrition_routine_days";
      DROP INDEX "UQ_meals_routine_slot";
      ALTER TABLE "meals" DROP CONSTRAINT "CHK_meals_routine_slot", DROP COLUMN "routineSlot";
      ALTER TABLE "nutrition_settings" DROP COLUMN "shaker";
    `);
  }
}
