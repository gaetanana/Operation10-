import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1762369200000 implements MigrationInterface {
  name = 'InitialSchema1762369200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "todos_category_enum" AS ENUM ('daily', 'stage');
      CREATE TYPE "session_templates_type_enum" AS ENUM (
        'pecs_triceps', 'dos_biceps', 'epaules', 'jambes', 'bras_abdos',
        'cardio', 'emom', 'circuit', 'other'
      );
      CREATE TYPE "sessions_type_enum" AS ENUM (
        'pecs_triceps', 'dos_biceps', 'epaules', 'jambes', 'bras_abdos',
        'cardio', 'emom', 'circuit', 'other'
      );
      CREATE TYPE "meals_meal_type_enum" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

      CREATE TABLE "todos" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "completed" boolean NOT NULL DEFAULT false,
        "category" "todos_category_enum" NOT NULL DEFAULT 'daily',
        "isRecurring" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "dueDate" date,
        CONSTRAINT "PK_todos_id" PRIMARY KEY ("id")
      );

      CREATE TABLE "session_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "type" "session_templates_type_enum" NOT NULL,
        "dayOfWeek" integer NOT NULL,
        "durationMinutes" integer,
        "description" character varying,
        "templateExercises" jsonb DEFAULT '[]',
        CONSTRAINT "PK_session_templates_id" PRIMARY KEY ("id")
      );

      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "templateId" character varying,
        "name" character varying NOT NULL,
        "type" "sessions_type_enum" NOT NULL,
        "date" date NOT NULL,
        "durationMinutes" integer,
        "notes" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id")
      );

      CREATE TABLE "exercises" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sessionId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "sets" integer,
        "reps" integer,
        "weight" double precision,
        "durationSeconds" integer,
        "restSeconds" integer,
        "distanceKm" double precision,
        "avgSpeedKmh" double precision,
        "notes" character varying,
        "order" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exercises_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exercises_sessionId" FOREIGN KEY ("sessionId")
          REFERENCES "sessions"("id") ON DELETE CASCADE
      );

      CREATE TABLE "meals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "date" date NOT NULL,
        "calories" double precision NOT NULL DEFAULT 0,
        "proteins" double precision NOT NULL DEFAULT 0,
        "carbs" double precision NOT NULL DEFAULT 0,
        "fats" double precision NOT NULL DEFAULT 0,
        "mealType" "meals_meal_type_enum" NOT NULL DEFAULT 'lunch',
        "imageUrl" character varying,
        "items" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meals_id" PRIMARY KEY ("id")
      );

      CREATE TABLE "meal_favorites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "entries" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meal_favorites_id" PRIMARY KEY ("id")
      );

      CREATE TABLE "subjects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "icon" character varying NOT NULL DEFAULT 'ti-book',
        "color" character varying NOT NULL DEFAULT '#a0ff40',
        "trainerKey" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subjects_id" PRIMARY KEY ("id")
      );

      CREATE TABLE "sheets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "content" text NOT NULL DEFAULT '',
        "subjectId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sheets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sheets_subjectId" FOREIGN KEY ("subjectId")
          REFERENCES "subjects"("id") ON DELETE CASCADE
      );

      CREATE TABLE "flashcards" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "subjectId" uuid NOT NULL,
        "sheetId" uuid,
        "repetitions" integer NOT NULL DEFAULT 0,
        "easeFactor" double precision NOT NULL DEFAULT 2.5,
        "intervalDays" integer NOT NULL DEFAULT 0,
        "dueDate" date NOT NULL,
        "lastReviewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_flashcards_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_flashcards_subjectId" FOREIGN KEY ("subjectId")
          REFERENCES "subjects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_flashcards_sheetId" FOREIGN KEY ("sheetId")
          REFERENCES "sheets"("id") ON DELETE SET NULL
      );

      CREATE TABLE "auth_sessions" (
        "id" uuid NOT NULL,
        "tokenHash" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "PK_auth_sessions_id" PRIMARY KEY ("id")
      );
      CREATE INDEX "IDX_auth_sessions_expiresAt" ON "auth_sessions" ("expiresAt");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "auth_sessions";
      DROP TABLE "flashcards";
      DROP TABLE "sheets";
      DROP TABLE "subjects";
      DROP TABLE "meal_favorites";
      DROP TABLE "meals";
      DROP TABLE "exercises";
      DROP TABLE "sessions";
      DROP TABLE "session_templates";
      DROP TABLE "todos";
      DROP TYPE "meals_meal_type_enum";
      DROP TYPE "sessions_type_enum";
      DROP TYPE "session_templates_type_enum";
      DROP TYPE "todos_category_enum";
    `);
  }
}
