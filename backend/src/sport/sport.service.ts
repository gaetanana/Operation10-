import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { Session, SessionTemplate, Exercise, SessionType, TrainingProgram } from './sport.entity';
import { CreateSessionDto, ImportProgramDto, UpdatePersonalProgramDto, ImportWorkoutHistoryDto, UpdateCurrentProgramDto, CreateProgramTemplateDto } from './sport.dto';
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
    @InjectRepository(TrainingProgram) private programRepo: Repository<TrainingProgram>,
  ) {}

  private templatePlan(saved: SessionTemplate) {
    const reference = referenceProgram.find(r => r.name.toLocaleLowerCase() === saved.name.trim().toLocaleLowerCase());
    return {
      key: saved.id, templateId: saved.id, name: saved.name, type: saved.type,
      weeklyTarget: saved.weeklyTarget ?? 1, durationMinutes: saved.durationMinutes,
      description: saved.description,
      exercises: reference ? personalExercises(reference, saved) : saved.templateExercises ?? [],
    };
  }

  async getPersonalProgram() {
    const templates = await this.findAllTemplates();
    const configuration = await this.programRepo.findOneBy({ id: 'current' });
    const defaults = referenceProgram.map((reference, index) => {
      const saved = templates.find(t => t.name.trim().toLocaleLowerCase() === reference.name.toLocaleLowerCase());
      return saved ? this.templatePlan(saved) : {
        ...reference, key: `reference-${index}`, templateId: null, durationMinutes: undefined,
        exercises: personalExercises(reference, saved),
      };
    });
    const defaultIds = new Set(defaults.map(p => p.templateId));
    const library = configuration ? templates.map(t => this.templatePlan(t))
      : [...defaults, ...templates.filter(t => !defaultIds.has(t.id)).map(t => this.templatePlan(t))];
    const selected = (ids: string[]) => ids.map(id => {
      const plan = library.find(p => p.templateId === id);
      if (!plan) throw new ConflictException('Une séance du programme est introuvable. Vérifie la bibliothèque.');
      return plan;
    });
    return {
      weeklyMinimum: configuration?.weeklyMinimum ?? 4,
      weeklyMaximum: configuration?.weeklyMaximum ?? 7,
      sessions: configuration ? selected(configuration.sessionTemplateIds) : defaults,
      modules: configuration ? selected(configuration.moduleTemplateIds)
        : library.filter(p => ['emom', 'cardio', 'circuit'].includes(p.type) && !defaults.includes(p)),
      library,
    };
  }

  private async resolveTemplate(key: string | number, repo: Repository<SessionTemplate>, templates: SessionTemplate[]) {
    const referenceMatch = /^(?:reference-)?([0-3])$/.exec(String(key));
    if (!referenceMatch) {
      const saved = isUUID(String(key)) ? templates.find(t => t.id === key) : undefined;
      if (!saved) throw new NotFoundException('Séance du programme introuvable.');
      return saved;
    }
    const reference = referenceProgram[Number(referenceMatch[1])];
    let saved = templates.find(t => t.name.trim().toLocaleLowerCase() === reference.name.toLocaleLowerCase());
    if (!saved) {
      saved = await repo.save(repo.create({
        name: reference.name, type: reference.type as SessionType,
        dayOfWeek: reference.dayOfWeek, weeklyTarget: 1, description: reference.description,
        templateExercises: reference.exercises.map(e => ({ ...e, id: randomUUID() })),
      }));
      templates.push(saved);
    }
    return saved;
  }

  private async currentProgram(manager: EntityManager, templates: SessionTemplate[]) {
    const repo = manager.getRepository(TrainingProgram);
    const saved = await repo.findOneBy({ id: 'current' });
    if (saved) return saved;
    const templateRepo = manager.getRepository(SessionTemplate);
    const sessions: SessionTemplate[] = [];
    for (let key = 0; key < referenceProgram.length; key++) {
      sessions.push(await this.resolveTemplate(key, templateRepo, templates));
    }
    return repo.save(repo.create({
      id: 'current', sessionTemplateIds: sessions.map(t => t.id),
      moduleTemplateIds: templates.filter(t => ['emom', 'cardio', 'circuit'].includes(t.type)
        && !sessions.some(s => s.id === t.id)).map(t => t.id),
      weeklyMinimum: 4, weeklyMaximum: 7,
    }));
  }

  async updateCurrentProgram(data: UpdateCurrentProgramDto) {
    if (data.weeklyMinimum > data.weeklyMaximum) {
      throw new BadRequestException('Le minimum hebdomadaire ne peut pas dépasser le maximum.');
    }
    await this.templateRepo.manager.transaction(async manager => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('operation10-program-import'))");
      const repo = manager.getRepository(SessionTemplate);
      const templates = await repo.find();
      const resolve = async (keys: string[]) => {
        const ids: string[] = [];
        for (const key of keys) ids.push((await this.resolveTemplate(key, repo, templates)).id);
        return ids;
      };
      const sessionTemplateIds = await resolve(data.sessionKeys);
      const moduleTemplateIds = await resolve(data.moduleKeys);
      const ids = [...sessionTemplateIds, ...moduleTemplateIds];
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Une séance ne peut apparaître qu’une fois dans le programme ou les modules.');
      }
      const programs = manager.getRepository(TrainingProgram);
      await programs.save(programs.create({
        id: 'current', sessionTemplateIds, moduleTemplateIds,
        weeklyMinimum: data.weeklyMinimum, weeklyMaximum: data.weeklyMaximum,
      }));
    });
    return this.getPersonalProgram();
  }

  async createProgramTemplate(data: CreateProgramTemplateDto) {
    return this.templateRepo.manager.transaction(async manager => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('operation10-program-import'))");
      const repo = manager.getRepository(SessionTemplate);
      const templates = await repo.find();
      const program = await this.currentProgram(manager, templates);
      if (templates.some(t => t.name.trim().toLocaleLowerCase() === data.name.trim().toLocaleLowerCase())) {
        throw new ConflictException('Une séance porte déjà ce nom. Choisis un autre nom.');
      }
      const { exercises, role, ...metadata } = data;
      const saved = await repo.save(repo.create({
        ...metadata, name: metadata.name.trim(),
        templateExercises: exercises.map(({ performedSets, templateExerciseId, ...ex }) => ({
          ...ex, id: randomUUID(),
        })),
      }));
      const field = role === 'module' ? 'moduleTemplateIds' : 'sessionTemplateIds';
      program[field] = [...program[field], saved.id];
      await manager.getRepository(TrainingProgram).save(program);
      return this.templatePlan(saved);
    });
  }

  async preparePersonalWorkout(key: string | number, update?: UpdatePersonalProgramDto) {
    return this.templateRepo.manager.transaction(async manager => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('operation10-program-import'))");
      const repo = manager.getRepository(SessionTemplate);
      const templates = await repo.find();
      let saved = await this.resolveTemplate(key, repo, templates);
      if (update) {
        // Persist membership before a reference workout is renamed.
        await this.currentProgram(manager, templates);
        if (update.name && templates.some(t => t.id !== saved.id &&
          t.name.trim().toLocaleLowerCase() === update.name.trim().toLocaleLowerCase())) {
          throw new ConflictException('Une séance porte déjà ce nom. Choisis un autre nom.');
        }
        const existingIds = new Set((saved.templateExercises ?? []).map(e => e.id));
        saved = {
          ...saved, name: update.name?.trim() ?? saved.name, type: update.type ?? saved.type,
          weeklyTarget: update.weeklyTarget ?? saved.weeklyTarget,
          durationMinutes: update.durationMinutes ?? saved.durationMinutes,
          description: update.description ?? saved.description,
          templateExercises: update.exercises.map(({ id, performedSets, templateExerciseId, ...exercise }) => ({
            ...exercise, id: id && existingIds.has(id) ? id : randomUUID(),
          })),
        };
      }
      saved = await repo.save(saved);
      return this.templatePlan(saved);
    });
  }

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
        throw new ConflictException('Une séance porte déjà ce nom. Renomme-la avant de relancer l’import.');
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
    await this.templateRepo.manager.transaction(async manager => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('operation10-program-import'))");
      const repo = manager.getRepository(SessionTemplate);
      const template = await repo.findOneBy({ id });
      if (!template) throw new NotFoundException();
      const programs = manager.getRepository(TrainingProgram);
      const program = await programs.findOneBy({ id: 'current' });
      if (program) {
        program.sessionTemplateIds = program.sessionTemplateIds.filter(key => key !== id);
        program.moduleTemplateIds = program.moduleTemplateIds.filter(key => key !== id);
        await programs.save(program);
      }
      await repo.remove(template);
    });
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

  async importHistory(data: ImportWorkoutHistoryDto): Promise<{ imported: number; duplicate: boolean }> {
    return this.sessionRepo.manager.transaction(async manager => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`operation10-workout-history:${data.sourceHash}`],
      );
      const sessions = manager.getRepository(Session);
      const existing = await sessions.countBy({ sourceImport: data.sourceHash });
      if (existing > 0) return { imported: existing, duplicate: true };

      const exercises = manager.getRepository(Exercise);
      const rows = data.sessions.map((session, sourceIndex) => sessions.create({
        ...session,
        sourceImport: data.sourceHash,
        sourceIndex,
        exercises: session.exercises?.map((exercise, order) =>
          exercises.create({ ...withSetSummary(exercise), order })),
      }));
      await sessions.save(rows);
      return { imported: rows.length, duplicate: false };
    });
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
