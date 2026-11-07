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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        migrations: [InitialSchema1762369200000, SessionTemplateWeeklyTarget1794043200000],
        migrationsRun: config.get<string>('NODE_ENV') === 'production',
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
