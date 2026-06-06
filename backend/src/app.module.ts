import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoModule } from './todo/todo.module';
import { SportModule } from './sport/sport.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { SeedService } from './seed.service';
import { Todo } from './todo/todo.entity';
import { SessionTemplate, Exercise } from './sport/sport.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([Todo, SessionTemplate, Exercise]),
    TodoModule,
    SportModule,
    NutritionModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
