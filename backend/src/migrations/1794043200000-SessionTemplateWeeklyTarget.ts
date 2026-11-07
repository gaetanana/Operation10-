import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionTemplateWeeklyTarget1794043200000 implements MigrationInterface {
  name = 'SessionTemplateWeeklyTarget1794043200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_templates"
        ADD COLUMN "weeklyTarget" integer NOT NULL DEFAULT 1;
      ALTER TABLE "session_templates"
        ALTER COLUMN "dayOfWeek" SET DEFAULT 0;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_templates" DROP COLUMN "weeklyTarget";
      ALTER TABLE "session_templates" ALTER COLUMN "dayOfWeek" DROP DEFAULT;
    `);
  }
}
