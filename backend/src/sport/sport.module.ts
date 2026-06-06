import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session, SessionTemplate, Exercise } from './sport.entity';
import { SportService } from './sport.service';
import { SportController } from './sport.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Session, SessionTemplate, Exercise])],
  providers: [SportService],
  controllers: [SportController],
  exports: [TypeOrmModule],
})
export class SportModule {}
