import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject, Sheet, Flashcard } from './revision.entity';
import { RevisionService } from './revision.service';
import { RevisionController } from './revision.controller';
import { RevisionSeedService } from './revision-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subject, Sheet, Flashcard])],
  providers: [RevisionService, RevisionSeedService],
  controllers: [RevisionController],
})
export class RevisionModule {}
