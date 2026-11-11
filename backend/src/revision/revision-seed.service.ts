import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Sheet, Flashcard } from './revision.entity';
import {
  LINUX_SHEET,
  RESEAU_SHEET,
  LINUX_CARDS,
  RESEAU_CARDS,
} from './revision.seed';

type SubjectDef = {
  name: string;
  icon: string;
  color: string;
  trainerKey: string | null;
  sheetTitle: string;
  sheetContent: string;
  cards: { question: string; answer: string }[];
};

const DEFS: SubjectDef[] = [
  {
    name: 'Linux',
    icon: 'ti-terminal-2',
    color: '#a0ff40',
    trainerKey: null,
    sheetTitle: 'Linux en ligne de commande',
    sheetContent: LINUX_SHEET,
    cards: LINUX_CARDS,
  },
  {
    name: 'Réseau',
    icon: 'ti-network',
    color: '#40c0ff',
    trainerKey: 'reseau',
    sheetTitle: 'Réseaux — l\'essentiel',
    sheetContent: RESEAU_SHEET,
    cards: RESEAU_CARDS,
  },
];

@Injectable()
export class RevisionSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RevisionSeedService.name);

  constructor(
    @InjectRepository(Subject) private subjectRepo: Repository<Subject>,
    @InjectRepository(Sheet) private sheetRepo: Repository<Sheet>,
    @InjectRepository(Flashcard) private cardRepo: Repository<Flashcard>,
  ) {}

  async onApplicationBootstrap() {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.RUN_STARTUP_SEEDS !== 'true'
    ) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (const def of DEFS) {
      await this.ensureSubject(def, todayStr);
    }
  }

  // Idempotent : crée la matière si absente, rafraîchit la fiche canonique,
  // seede les flashcards uniquement si la matière n'en a aucune.
  // Ne touche pas aux fiches/cartes que l'utilisateur a ajoutées lui-même.
  private async ensureSubject(def: SubjectDef, todayStr: string) {
    let subject = await this.subjectRepo.findOne({ where: { name: def.name } });

    if (!subject) {
      subject = await this.subjectRepo.save(
        this.subjectRepo.create({
          name: def.name,
          icon: def.icon,
          color: def.color,
          trainerKey: def.trainerKey,
        }),
      );
      this.logger.log(`✅ Matière « ${def.name} » créée`);
    } else if (subject.trainerKey !== def.trainerKey || subject.icon !== def.icon) {
      // garde le nom/couleur éventuellement personnalisés, mais s'assure de l'entraîneur/icône
      subject.trainerKey = def.trainerKey;
      subject.icon = subject.icon || def.icon;
      await this.subjectRepo.save(subject);
    }

    // Fiche canonique : repérée par (matière + titre). On rafraîchit son contenu.
    let sheet = await this.sheetRepo.findOne({
      where: { subjectId: subject.id, title: def.sheetTitle },
    });
    if (!sheet) {
      sheet = await this.sheetRepo.save(
        this.sheetRepo.create({ subjectId: subject.id, title: def.sheetTitle, content: def.sheetContent }),
      );
    } else if (sheet.content !== def.sheetContent) {
      sheet.content = def.sheetContent;
      await this.sheetRepo.save(sheet);
      this.logger.log(`🔄 Fiche « ${def.sheetTitle} » mise à jour`);
    }

    // Flashcards : seulement si la matière n'en a aucune (n'écrase pas la progression)
    const cardCount = await this.cardRepo.count({ where: { subjectId: subject.id } });
    if (cardCount === 0 && def.cards.length) {
      const cards = def.cards.map((c) =>
        this.cardRepo.create({
          subjectId: subject!.id,
          sheetId: sheet!.id,
          question: c.question,
          answer: c.answer,
          dueDate: todayStr,
        }),
      );
      await this.cardRepo.save(cards);
    }
  }
}
