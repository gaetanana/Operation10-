import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionTemplate, Exercise } from './sport.entity';

@Injectable()
export class SportService {
  constructor(
    @InjectRepository(Session)         private sessionRepo: Repository<Session>,
    @InjectRepository(SessionTemplate) private templateRepo: Repository<SessionTemplate>,
    @InjectRepository(Exercise)        private exerciseRepo: Repository<Exercise>,
  ) {}

  // ─── Contrat hebdo ───────────────────────────────────────────────────────────

  findAllTemplates(): Promise<SessionTemplate[]> {
    return this.templateRepo.find({ order: { dayOfWeek: 'ASC' } });
  }

  createTemplate(data: Partial<SessionTemplate>): Promise<SessionTemplate> {
    return this.templateRepo.save(this.templateRepo.create(data));
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

  createSession(data: Partial<Session>): Promise<Session> {
    return this.sessionRepo.save(this.sessionRepo.create(data));
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
      this.exerciseRepo.create({ ...data, sessionId, order: count }),
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
    return this.exerciseRepo.save({ ...e, ...data });
  }

  async removeExercise(exerciseId: string): Promise<void> {
    const e = await this.exerciseRepo.findOneBy({ id: exerciseId });
    if (!e) throw new NotFoundException('Exercice introuvable');
    await this.exerciseRepo.remove(e);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  // ─── Progression des charges ──────────────────────────────────────────────────

  async getStrengthProgress(exerciseName?: string) {
    // Si un nom précis est demandé, on filtre dessus
    // Sinon on retourne les données pour tous les exercices muscu avec au moins 3 occurrences

    const qb = this.exerciseRepo
      .createQueryBuilder('e')
      .innerJoin('e.session', 's')
      .select('e.name', 'name')
      .addSelect('MAX(e.weight)', 'maxWeight')
      .addSelect('s.date', 'date')
      .where('e.weight IS NOT NULL')
      .andWhere('e.weight > 0');

    if (exerciseName) {
      qb.andWhere('LOWER(e.name) LIKE :name', { name: `%${exerciseName.toLowerCase()}%` });
    }

    // Récupérer le max de charge par exercice par jour
    const rawRows: { name: string; maxWeight: string; date: string }[] =
      await this.exerciseRepo
        .createQueryBuilder('e')
        .innerJoin('e.session', 's')
        .select('e.name', 'name')
        .addSelect('s.date', 'date')
        .addSelect('MAX(e.weight)', 'maxWeight')
        .where('e.weight IS NOT NULL')
        .andWhere('e.weight > 0')
        .groupBy('e.name')
        .addGroupBy('s.date')
        .orderBy('e.name', 'ASC')
        .addOrderBy('s.date', 'ASC')
        .getRawMany();

    // Grouper par nom d'exercice
    const map = new Map<string, { date: string; weight: number }[]>();
    for (const row of rawRows) {
      if (!map.has(row.name)) map.set(row.name, []);
      map.get(row.name)!.push({ date: row.date, weight: Number(row.maxWeight) });
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
