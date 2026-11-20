import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export interface ShakerPortion {
  name: string;
  quantityGrams: number;
  proteins: number;
  calories: number | null;
  carbs: number | null;
  fats: number | null;
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH     = 'lunch',
  DINNER    = 'dinner',
  SNACK     = 'snack',
}

@Entity('meals')
@Index('UQ_meals_routine_slot', ['date', 'routineSlot'], { unique: true })
export class Meal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'float', nullable: true })
  calories: number | null;

  @Column({ type: 'float', nullable: true })
  proteins: number | null;

  @Column({ type: 'float', nullable: true })
  carbs: number | null;

  @Column({ type: 'float', nullable: true })
  fats: number | null;

  @Column({ type: 'float', nullable: true })
  quantityGrams: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  source: string | null;

  @Column({ type: 'smallint', nullable: true })
  routineSlot: number | null;

  @Column({ type: 'enum', enum: MealType, default: MealType.LUNCH })
  mealType: MealType;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  items: {
    name: string;
    quantity: string;
    calories: number | null;
    proteins: number | null;
    carbs: number | null;
    fats: number | null;
  }[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('nutrition_settings')
export class NutritionSettings {
  @Column({ type: 'varchar', primary: true, length: 32, default: 'current' })
  id: string;

  @Column({ type: 'float', nullable: true })
  caloriesGoal: number | null;

  @Column({ type: 'float', nullable: true })
  proteinsGoal: number | null;

  @Column({ type: 'jsonb', nullable: true })
  shaker: ShakerPortion | null;
}

@Entity('nutrition_routine_days')
export class NutritionRoutineDay {
  @Column({ type: 'date', primary: true })
  date: string;

  @Column({ type: 'float', nullable: true })
  creatineGrams: number | null;
}

// Repas favori / combo : un ou plusieurs « entrées » réutilisables en 1 clic
@Entity('meal_favorites')
export class MealFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // chaque entrée = un repas qui sera recréé tel quel
  @Column({ type: 'jsonb', default: '[]' })
  entries: {
    name: string;
    mealType: MealType;
    calories: number | null;
    proteins: number | null;
    carbs: number | null;
    fats: number | null;
    quantityGrams?: number | null;
    source?: string | null;
    items?: Meal['items'];
  }[];

  @CreateDateColumn()
  createdAt: Date;
}
