import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Subject, Sheet, Flashcard } from './revision.entity';
export declare class RevisionSeedService implements OnApplicationBootstrap {
    private subjectRepo;
    private sheetRepo;
    private cardRepo;
    private readonly logger;
    constructor(subjectRepo: Repository<Subject>, sheetRepo: Repository<Sheet>, cardRepo: Repository<Flashcard>);
    onApplicationBootstrap(): Promise<void>;
    private ensureSubject;
}
