import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoModule } from './todo/todo.module';
import { SportModule } from './sport/sport.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { RevisionModule } from './revision/revision.module';
import { SeedService } from './seed.service';
import { Todo } from './todo/todo.entity';
import { SessionTemplate, Exercise } from './sport/sport.entity';
import { AuthModule } from './auth/auth.module';
import { InitialSchema1762369200000 } from './migrations/1762369200000-InitialSchema';
import { SessionTemplateWeeklyTarget1794043200000 } from './migrations/1794043200000-SessionTemplateWeeklyTarget';
import { PerformedSets1794056400000 } from './migrations/1794056400000-PerformedSets';
import { WorkoutHistoryImport1794150000000 } from './migrations/1794150000000-WorkoutHistoryImport';
import { FlexibleTrainingProgram1794434400000 } from './migrations/1794434400000-FlexibleTrainingProgram';
import { NutritionJournal1794524400000 } from './migrations/1794524400000-NutritionJournal';
import { NutritionRoutine1794855600000 } from './migrations/1794855600000-NutritionRoutine';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        ssl: config.get<string>('DATABASE_CA_CERT')
          ? { ca: config.get<string>('DATABASE_CA_CERT'), rejectUnauthorized: true }
          : undefined,
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        migrations: [InitialSchema1762369200000, SessionTemplateWeeklyTarget1794043200000, PerformedSets1794056400000, WorkoutHistoryImport1794150000000, FlexibleTrainingProgram1794434400000, NutritionJournal1794524400000, NutritionRoutine1794855600000],
        migrationsRun:
          config.get<string>('NODE_ENV') === 'production' &&
          config.get<string>('RUN_MIGRATIONS') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([Todo, SessionTemplate, Exercise]),
    TodoModule,
    SportModule,
    NutritionModule,
    RevisionModule,
    AuthModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
