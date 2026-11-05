import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

// Une matière / cours (ex. « Linux », « Réseaux »)
@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 'ti-book' })
  icon: string; // classe Tabler Icons

  @Column({ default: '#a0ff40' })
  color: string; // accent de la matière

  // Clé d'un entraîneur interactif (ex. 'reseau') — null si la matière n'en a pas.
  // Le front mappe cette clé vers un composant d'entraînement.
  @Column({ type: 'varchar', nullable: true })
  trainerKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Sheet, (s) => s.subject)
  sheets: Sheet[];

  @OneToMany(() => Flashcard, (f) => f.subject)
  flashcards: Flashcard[];
}

// Une fiche de révision (contenu markdown)
@Entity('sheets')
export class Sheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  content: string; // markdown

  @ManyToOne(() => Subject, (s) => s.sheets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column()
  subjectId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Une carte de révision (recto/verso) avec répétition espacée (SM-2)
@Entity('flashcards')
export class Flashcard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  question: string; // recto

  @Column({ type: 'text' })
  answer: string; // verso

  @ManyToOne(() => Subject, (s) => s.flashcards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column()
  subjectId: string;

  // Fiche d'origine (optionnel) — supprimée => on garde la carte
  @ManyToOne(() => Sheet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sheetId' })
  sheet: Sheet | null;

  @Column({ type: 'uuid', nullable: true })
  sheetId: string | null;

  // ─── Répétition espacée (algorithme SM-2) ───────────────────────────────────
  @Column({ type: 'int', default: 0 })
  repetitions: number; // nb de révisions réussies consécutives

  @Column({ type: 'float', default: 2.5 })
  easeFactor: number; // facteur de facilité (min 1.3)

  @Column({ type: 'int', default: 0 })
  intervalDays: number; // intervalle courant en jours

  @Column({ type: 'date' })
  dueDate: string; // prochaine échéance YYYY-MM-DD

  @Column({ type: 'timestamp', nullable: true })
  lastReviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
