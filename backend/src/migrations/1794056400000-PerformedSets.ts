import { MigrationInterface, QueryRunner } from 'typeorm';

export class PerformedSets1794056400000 implements MigrationInterface {
  name = 'PerformedSets1794056400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exercises" ADD COLUMN "performedSets" jsonb;
      ALTER TABLE "exercises" ADD COLUMN "templateExerciseId" uuid;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exercises" DROP COLUMN "templateExerciseId";
      ALTER TABLE "exercises" DROP COLUMN "performedSets";
    `);
  }
}
