import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';

export enum SessionType {
  PECS_TRICEPS  = 'pecs_triceps',
  DOS_BICEPS    = 'dos_biceps',
  EPAULES       = 'epaules',
  JAMBES        = 'jambes',
  BRAS_ABDOS    = 'bras_abdos',
  CARDIO        = 'cardio',
  EMOM          = 'emom',
  CIRCUIT       = 'circuit',
  OTHER         = 'other',
}

// Contrat hebdo (programme type)
@Entity('session_templates')
export class SessionTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: SessionType })
  type: SessionType;

  @Column()
  dayOfWeek: number; // 0 = lundi, 6 = dimanche

  @Column({ nullable: true })
  durationMinutes: number;

  @Column({ nullable: true })
  description: string;

  // Exercices types du contrat (programme indicatif)
  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  templateExercises: {
    id: string;
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    restSeconds?: number;
    distanceKm?: number;
    avgSpeedKmh?: number;
    notes?: string;
  }[];
}

// Séance réellement réalisée — déclarée AVANT Exercise pour éviter la ref circulaire
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  templateId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: SessionType })
  type: SessionType;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  durationMinutes: number;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => Exercise, (e) => e.session, { cascade: true, eager: true })
  exercises: Exercise[];

  @CreateDateColumn()
  createdAt: Date;
}

// Exercice réalisé au sein d'une séance — déclaré APRÈS Session
@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => Session, (s) => s.exercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column()
  name: string;

  @Column({ nullable: true })
  sets: number;

  @Column({ nullable: true })
  reps: number;

  @Column({ type: 'float', nullable: true })
  weight: number;

  @Column({ nullable: true })
  durationSeconds: number; // muscu : durée d'un effort / cardio : durée totale

  @Column({ nullable: true })
  restSeconds: number; // temps de repos entre séries (muscu)

  @Column({ type: 'float', nullable: true })
  distanceKm: number; // cardio : distance en km

  @Column({ type: 'float', nullable: true })
  avgSpeedKmh: number; // cardio : vitesse moyenne km/h (peut être calculée)

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;
}
