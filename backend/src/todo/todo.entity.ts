import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum TodoCategory {
  DAILY = 'daily',
  STAGE = 'stage',
}

@Entity('todos')
export class Todo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'enum', enum: TodoCategory, default: TodoCategory.DAILY })
  category: TodoCategory;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean; // tâche quotidienne recréée chaque jour

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: string;
}
