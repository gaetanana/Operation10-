import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo, TodoCategory } from './todo/todo.entity';
import { SessionTemplate, SessionType } from './sport/sport.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Todo)            private todoRepo: Repository<Todo>,
    @InjectRepository(SessionTemplate) private templateRepo: Repository<SessionTemplate>,
  ) {}

  async onApplicationBootstrap() {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.RUN_STARTUP_SEEDS !== 'true'
    ) return;

    await this.seedTodos();
    await this.seedTemplates();
    await this.migrateTemplates();
    await this.recreateRecurringTodos();
  }

  private async seedTodos() {
    const count = await this.todoRepo.count();
    if (count > 0) return;

    const today = new Date().toISOString().split('T')[0];

    const dailyTasks = [
      'EMOM 10 min — pompes 15 reps / min',
      'Séance sport du matin',
      'Logger mes repas',
      'Révisions cours du soir',
      '8h de sommeil',
    ];

    const stageTasks = [
      'Préparer présentation projet',
      'Finir module React avancé',
      'Lire doc NestJS Guards',
    ];

    for (const title of dailyTasks) {
      await this.todoRepo.save(this.todoRepo.create({
        title,
        category: TodoCategory.DAILY,
        isRecurring: true,
        dueDate: today,
      }));
    }

    for (const title of stageTasks) {
      await this.todoRepo.save(this.todoRepo.create({
        title,
        category: TodoCategory.STAGE,
        isRecurring: false,
        dueDate: today,
      }));
    }

    this.logger.log('✅ Todos initiaux créés');
  }

  private async seedTemplates() {
    const count = await this.templateRepo.count();
    if (count > 0) {
      // Migration : si les anciens templates push/pull/legs sont en base, on les reset
      const first = await this.templateRepo.findOne({ where: {} });
      if (first && (first.type as string) === 'push') {
        await this.templateRepo.clear();
        this.logger.log('🔄 Anciens templates supprimés, re-seed...');
      } else {
        return;
      }
    }

    const templates = [
      {
        name: 'Pecs / Triceps',
        type: SessionType.PECS_TRICEPS,
        dayOfWeek: 0, // Lundi
        durationMinutes: 75,
        description: 'Développé couché, dips, écarté, pushdown…',
      },
      {
        name: 'Dos / Biceps',
        type: SessionType.DOS_BICEPS,
        dayOfWeek: 1, // Mardi
        durationMinutes: 75,
        description: 'Tractions, tirage barre, curl, rowing…',
      },
      {
        name: 'Épaules',
        type: SessionType.EPAULES,
        dayOfWeek: 3, // Jeudi
        durationMinutes: 60,
        description: 'Développé militaire, élévations latérales, oiseau…',
      },
      {
        name: 'Jambes',
        type: SessionType.JAMBES,
        dayOfWeek: 2, // Mercredi
        durationMinutes: 75,
        description: 'Squat, leg press, fentes, ischio, mollets…',
      },
      {
        name: 'Bras / Abdos',
        type: SessionType.BRAS_ABDOS,
        dayOfWeek: 5, // Samedi
        durationMinutes: 60,
        description: 'Curl barre, marteau, triceps corde, gainage, crunchs…',
      },
      {
        name: 'Cardio — Course',
        type: SessionType.CARDIO,
        dayOfWeek: 6, // Dimanche
        durationMinutes: 40,
        description: '30–45 min zone 2, ou fractionné 20 min',
      },
      {
        name: 'EMOM pompes',
        type: SessionType.EMOM,
        dayOfWeek: -1, // Tous les jours
        weeklyTarget: 7,
        durationMinutes: 10,
        description: '15 reps / min pendant 10 min — quotidien',
      },
    ];

    for (const t of templates) {
      await this.templateRepo.save(this.templateRepo.create(t));
    }

    this.logger.log('✅ Templates sport (split 5 jours) créés');
  }

  // Recréation quotidienne des tâches récurrentes
  private async recreateRecurringTodos() {
    const today = new Date().toISOString().split('T')[0];

    // Récupérer toutes les tâches récurrentes (modèles)
    const recurring = await this.todoRepo.find({ where: { isRecurring: true } });
    if (recurring.length === 0) return;

    // Trouver les tâches récurrentes qui existent déjà aujourd'hui
    const todayTodos = await this.todoRepo
      .createQueryBuilder('todo')
      .where('todo.isRecurring = true')
      .andWhere('todo.dueDate = :today', { today })
      .getMany();

    const existingTitles = new Set(todayTodos.map(t => t.title));

    // Récupérer les titres uniques parmi tous les récurrents (évite les doublons de jours passés)
    const seenTitles = new Set<string>();
    for (const todo of recurring) {
      if (todo.dueDate === today) continue; // déjà pour aujourd'hui
      if (seenTitles.has(todo.title)) continue; // déjà traité
      if (existingTitles.has(todo.title)) continue; // existe déjà aujourd'hui

      seenTitles.add(todo.title);

      await this.todoRepo.save(this.todoRepo.create({
        title: todo.title,
        category: todo.category,
        isRecurring: true,
        completed: false,
        dueDate: today,
      }));
    }

    if (seenTitles.size > 0) {
      this.logger.log(`✅ ${seenTitles.size} tâche(s) récurrente(s) recréée(s) pour ${today}`);
    }
  }

  // Migration : corriger le jour de Jambes si encore sur vendredi (4)
  private async migrateTemplates() {
    const jambes = await this.templateRepo.findOne({ where: { type: SessionType.JAMBES } as any });
    if (jambes && (jambes as any).dayOfWeek === 4) {
      await this.templateRepo.save({ ...jambes, dayOfWeek: 2 });
      this.logger.log('🔄 Jambes déplacé au mercredi');
    }

    // Backfill objectif hebdo : l'EMOM quotidien vise 7 séances/semaine
    await this.templateRepo.update(
      { type: SessionType.EMOM, weeklyTarget: 1 } as any,
      { weeklyTarget: 7 } as any,
    );
  }
}
