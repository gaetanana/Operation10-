import { MigrationInterface, QueryRunner } from 'typeorm';

export class NutritionJournal1794524400000 implements MigrationInterface {
  name = 'NutritionJournal1794524400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meals"
        ALTER COLUMN "calories" DROP NOT NULL, ALTER COLUMN "calories" DROP DEFAULT,
        ALTER COLUMN "proteins" DROP NOT NULL, ALTER COLUMN "proteins" DROP DEFAULT,
        ALTER COLUMN "carbs" DROP NOT NULL, ALTER COLUMN "carbs" DROP DEFAULT,
        ALTER COLUMN "fats" DROP NOT NULL, ALTER COLUMN "fats" DROP DEFAULT,
        ADD COLUMN "quantityGrams" double precision,
        ADD COLUMN "source" character varying(20);
      CREATE TABLE "nutrition_settings" (
        "id" character varying(32) PRIMARY KEY DEFAULT 'current',
        "caloriesGoal" double precision,
        "proteinsGoal" double precision
      );
      ALTER TABLE "nutrition_settings" ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON "nutrition_settings" FROM PUBLIC;
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          REVOKE ALL ON "nutrition_settings" FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          REVOKE ALL ON "nutrition_settings" FROM authenticated;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "meals" WHERE "calories" IS NULL OR "proteins" IS NULL OR "carbs" IS NULL OR "fats" IS NULL) THEN
          RAISE EXCEPTION 'Cannot revert nutrition migration: unknown nutrient values would be lost';
        END IF;
      END $$;
      ALTER TABLE "meals"
        DROP COLUMN "quantityGrams", DROP COLUMN "source",
        ALTER COLUMN "calories" SET DEFAULT 0, ALTER COLUMN "calories" SET NOT NULL,
        ALTER COLUMN "proteins" SET DEFAULT 0, ALTER COLUMN "proteins" SET NOT NULL,
        ALTER COLUMN "carbs" SET DEFAULT 0, ALTER COLUMN "carbs" SET NOT NULL,
        ALTER COLUMN "fats" SET DEFAULT 0, ALTER COLUMN "fats" SET NOT NULL;
      DROP TABLE "nutrition_settings";
    `);
  }
}
