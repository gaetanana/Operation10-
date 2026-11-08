import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionTemplate, Exercise, SessionType } from './sport.entity';
import { CreateSessionDto, ImportProgramDto, UpdatePersonalProgramDto } from './sport.dto';
import { ProgramTemplate, referenceProgram } from './sport.reference';

function withSetSummary(data: Partial<Exercise>): Partial<Exercise> {
  if (!data.performedSets) return data;
  const weights = data.performedSets.flatMap(s => s.weight == null ? [] : [s.weight]);
  return {
    ...data,
    sets: data.performedSets.length || null,
    reps: null,
    weight: weights.length ? Math.max(...weights) : null,
  };
}

function personalExercises(reference: ProgramTemplate, saved?: SessionTemplate) {
  if (!saved) return reference.exercises;
  return (saved.templateExercises ?? []).map(ex => ({
    ...ex,
    // Older imports predate timed finishers; an explicit null keeps a user override.
    durationSeconds: ex.durationSeconds === undefined
      ? reference.exercises.find(r => r.name === ex.name)?.durationSeconds
      : ex.durationSeconds,
  }));
}

@Injectable()
export class SportService {
  constructor(
    @InjectRepository(Session)         private sessionRepo: Repository<Session>,
    @InjectRepository(SessionTemplate) private templateRepo: Repository<SessionTemplate>,
    @InjectRepository(Exercise)        private exerciseRepo: Repository<Exercise>,
  ) {}

  async getPersonalProgram() {
    const templates = await this.findAllTemplates();
    return referenceProgram.map((reference, key) => {
      const saved = templates.find(t => t.name.trim().toLocaleLowerCase() === reference.name.toLocaleLowerCase());
      return {
        ...reference, key, templateId: saved?.id ?? null,
        exercises: personalExercises(reference, saved),
      };
    });
  }

  async preparePersonalWorkout(key: number, update?: UpdatePersonalProgramDto) {
    const reference = referenceProgram[key];
    if (!reference) throw new NotFoundException('Séance du programme introuvable.');
    return this.templateRepo.manager.transaction(async manager => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('operation10-program-import'))");
      const repo = manager.getRepository(SessionTemplate);
      const templates = await repo.find();
      let saved = templates.find(t => t.name.trim().toLocaleLowerCase() === reference.name.toLocaleLowerCase());
      if (!saved) {
        saved = repo.create({
          name: reference.name, type: reference.type as SessionType,
          dayOfWeek: reference.dayOfWeek, weeklyTarget: 1,
          description: reference.description,
          templateExercises: reference.exercises.map(e => ({ ...e, id: randomUUID() })),
        });
      }
      if (update) {
        const existingIds = new Set((saved.templateExercises ?? []).map(e => e.id));
        saved.templateExercises = update.exercises.map(({ id, performedSets, templateExerciseId, ...exercise }) => ({
          ...exercise, id: id && existingIds.has(id) ? id : randomUUID(),
        }));
      }
      saved = await repo.save(saved);
      return { ...reference, key, templateId: saved.id, exercises: personalExercises(reference, saved) };
    });
  }

  // ─── Contrat hebdo ───────────────────────────────────────────────────────────

  findAllTemplates(): Promise<SessionTemplate[]> {
    return this.templateRepo.find({ order: { dayOfWeek: 'ASC' } });
  }

  createTemplate(data: Partial<SessionTemplate>): Promise<SessionTemplate> {
    return this.templateRepo.save(this.templateRepo.create(data));
  }

  async importProgram(data: ImportProgramDto): Promise<SessionTemplate[]> {
    return this.templateRepo.manager.transaction(async manager => {
      // Serialize imports so repeated requests cannot create duplicate programmes.
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('operation10-program-import'))");
      const repo = manager.getRepository(SessionTemplate);
      const existing = await repo.find();
      const names = data.templates.map(t => t.name.trim().toLocaleLowerCase());
      if (new Set(names).size !== names.length ||
          existing.some(t => names.includes(t.name.trim().toLocaleLowerCase()))) {
        throw new ConflictException('Un contrat porte déjà ce nom. Renomme-le avant de relancer l’import.');
      }
      return repo.save(data.templates.map(({ exercises, ...template }) => repo.create({
        ...template,
        name: template.name.trim(),
        templateExercises: exercises.map(({ performedSets, templateExerciseId, ...e }) => ({
          ...e, id: randomUUID(),
        })),
      })));
    });
  }

  async updateTemplate(id: string, data: Partial<SessionTemplate>): Promise<SessionTemplate> {
    const t = await this.templateRepo.findOneBy({ id });
    if (!t) throw new NotFoundException();
    return this.templateRepo.save({ ...t, ...data });
  }

  async removeTemplate(id: string): Promise<void> {
    const t = await this.templateRepo.findOneBy({ id });
    if (!t) throw new NotFoundException();
    await this.templateRepo.remove(t);
  }

  // ─── Séances réalisées ────────────────────────────────────────────────────────

  findAllSessions(from?: string, to?: string): Promise<Session[]> {
    const q = this.sessionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.exercises', 'e')
      .orderBy('s.date', 'DESC')
      .addOrderBy('e.order', 'ASC');
    if (from) q.andWhere('s.date >= :from', { from });
    if (to)   q.andWhere('s.date <= :to',   { to });
    return q.getMany();
  }

  async findSessionById(id: string): Promise<Session> {
    const s = await this.sessionRepo.findOne({
      where: { id },
      relations: ['exercises'],
    });
    if (!s) throw new NotFoundException();
    return s;
  }

  createSession(data: CreateSessionDto): Promise<Session> {
    return this.sessionRepo.save(this.sessionRepo.create({
      ...data,
      exercises: data.exercises?.map((e, order) =>
        this.exerciseRepo.create({ ...withSetSummary(e), order })),
    }));
  }

  async updateSession(id: string, data: Partial<Session>): Promise<Session> {
    const s = await this.sessionRepo.findOneBy({ id });
    if (!s) throw new NotFoundException();
    return this.sessionRepo.save({ ...s, ...data });
  }

  async removeSession(id: string): Promise<void> {
    const s = await this.sessionRepo.findOneBy({ id });
    if (!s) throw new NotFoundException();
    await this.sessionRepo.remove(s);
  }

  // ─── Exercices ────────────────────────────────────────────────────────────────

  async addExercise(sessionId: string, data: Partial<Exercise>): Promise<Exercise> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) throw new NotFoundException('Séance introuvable');
    const count = await this.exerciseRepo.countBy({ sessionId });
    return this.exerciseRepo.save(
      this.exerciseRepo.create({ ...withSetSummary(data), sessionId, order: count }),
    );
  }

  // ─── Exercices de template (JSONB) ────────────────────────────────────────────

  async addTemplateExercise(templateId: string, data: any): Promise<SessionTemplate> {
    const t = await this.templateRepo.findOneBy({ id: templateId });
    if (!t) throw new NotFoundException('Template introuvable');
    const exercises = t.templateExercises ?? [];
    exercises.push({ ...data, id: crypto.randomUUID() });
    return this.templateRepo.save({ ...t, templateExercises: exercises });
  }

  async updateTemplateExercise(templateId: string, exId: string, data: any): Promise<SessionTemplate> {
    const t = await this.templateRepo.findOneBy({ id: templateId });
    if (!t) throw new NotFoundException('Template introuvable');
    const exercises = (t.templateExercises ?? []).map((e: any) =>
      e.id === exId ? { ...e, ...data } : e,
    );
    return this.templateRepo.save({ ...t, templateExercises: exercises });
  }

  async removeTemplateExercise(templateId: string, exId: string): Promise<SessionTemplate> {
    const t = await this.templateRepo.findOneBy({ id: templateId });
    if (!t) throw new NotFoundException('Template introuvable');
    const exercises = (t.templateExercises ?? []).filter((e: any) => e.id !== exId);
    return this.templateRepo.save({ ...t, templateExercises: exercises });
  }

  async updateExercise(exerciseId: string, data: Partial<Exercise>): Promise<Exercise> {
    const e = await this.exerciseRepo.findOneBy({ id: exerciseId });
    if (!e) throw new NotFoundException('Exercice introuvable');
    return this.exerciseRepo.save({ ...e, ...withSetSummary(data) });
  }

  async removeExercise(exerciseId: string): Promise<void> {
    const e = await this.exerciseRepo.findOneBy({ id: exerciseId });
    if (!e) throw new NotFoundException('Exercice introuvable');
    await this.exerciseRepo.remove(e);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  // ─── Progression des charges ──────────────────────────────────────────────────

  async getStrengthProgress(exerciseName?: string) {
    const rawRows: { name: string; date: string; performedSets: unknown }[] =
      await this.exerciseRepo
        .createQueryBuilder('e')
        .innerJoin('e.session', 's')
        .select('e.name', 'name')
        .addSelect('s.date', 'date')
        .addSelect('e.performedSets', 'performedSets')
        .where('e.performedSets IS NOT NULL')
        .orderBy('e.name', 'ASC')
        .addOrderBy('s.date', 'ASC')
        .getRawMany();

    // Reference weights and legacy summary weights are not confirmed performances.
    const dailyMax = new Map<string, number>();
    for (const row of rawRows) {
      if (exerciseName && !row.name.toLowerCase().includes(exerciseName.toLowerCase())) continue;
      let sets: unknown = row.performedSets;
      if (typeof sets === 'string') {
        try {
          sets = JSON.parse(sets);
        } catch {
          continue;
        }
      }
      if (!Array.isArray(sets)) continue;
      const weights = sets
        .filter((set): set is { reps: number; weight?: number } =>
          Boolean(set) && Number.isInteger(set.reps) && set.reps > 0 &&
          Number.isFinite(set.weight) && set.weight > 0,
        )
        .map(set => set.weight as number);
      if (weights.length === 0) continue;
      const key = `${row.name}\u0000${row.date}`;
      dailyMax.set(key, Math.max(dailyMax.get(key) ?? 0, ...weights));
    }

    const map = new Map<string, { date: string; weight: number }[]>();
    for (const [key, weight] of dailyMax) {
      const [name, date] = key.split('\u0000');
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push({ date, weight });
    }

    // Garder seulement les exercices avec ≥ 2 points de données
    const result: { name: string; data: { date: string; weight: number }[] }[] = [];
    for (const [name, data] of map.entries()) {
      if (data.length >= 2) {
        result.push({ name, data });
      }
    }

    // Trier par nombre de points desc (les plus trackés en premier)
    result.sort((a, b) => b.data.length - a.data.length);

    return result;
  }

  async getStats() {
    const total = await this.sessionRepo.count();

    const thisMonth = await this.sessionRepo
      .createQueryBuilder('s')
      .where("date_trunc('month', s.date::timestamp) = date_trunc('month', now())")
      .getCount();

    // Séances cette semaine (lundi → dimanche)
    const thisWeek = await this.sessionRepo
      .createQueryBuilder('s')
      .where("s.date >= date_trunc('week', now())")
      .getCount();

    // Répartition par type ce mois-ci
    const byTypeRaw: { type: string; count: string }[] = await this.sessionRepo
      .createQueryBuilder('s')
      .select('s.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where("date_trunc('month', s.date::timestamp) = date_trunc('month', now())")
      .groupBy('s.type')
      .getRawMany();

    const byType = byTypeRaw.reduce((acc, row) => {
      acc[row.type] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);

    // Total exercices loggés
    const totalExercises = await this.exerciseRepo.count();

    // Séances des 8 dernières semaines (pour graphe)
    const last8Weeks: { week: string; count: string }[] = await this.sessionRepo
      .createQueryBuilder('s')
      .select("to_char(date_trunc('week', s.date::timestamp), 'YYYY-MM-DD')", 'week')
      .addSelect('COUNT(*)', 'count')
      .where("s.date >= now() - interval '8 weeks'")
      .groupBy("date_trunc('week', s.date::timestamp)")
      .orderBy("date_trunc('week', s.date::timestamp)", 'ASC')
      .getRawMany();

    return {
      total,
      thisMonth,
      thisWeek,
      byType,
      totalExercises,
      last8Weeks: last8Weeks.map(r => ({ week: r.week, count: Number(r.count) })),
    };
  }
}
