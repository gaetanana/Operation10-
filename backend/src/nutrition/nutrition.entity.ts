import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH     = 'lunch',
  DINNER    = 'dinner',
  SNACK     = 'snack',
}

@Entity('meals')
export class Meal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'float', default: 0 })
  calories: number;

  @Column({ type: 'float', default: 0 })
  proteins: number; // en grammes

  @Column({ type: 'float', default: 0 })
  carbs: number;

  @Column({ type: 'float', default: 0 })
  fats: number;

  @Column({ type: 'enum', enum: MealType, default: MealType.LUNCH })
  mealType: MealType;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  items: {
    name: string;
    quantity: string;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
  }[];

  @CreateDateColumn()
  createdAt: Date;
}
