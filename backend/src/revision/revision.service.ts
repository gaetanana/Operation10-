import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Subject, Sheet, Flashcard } from './revision.entity';
import {
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateSheetDto,
  UpdateSheetDto,
  CreateFlashcardDto,
  UpdateFlashcardDto,
  GenerateDto,
} from './revision.dto';

// Date locale YYYY-MM-DD (évite le décalage UTC, comme le front)
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class RevisionService {
  constructor(
    @InjectRepository(Subject) private subjectRepo: Repository<Subject>,
    @InjectRepository(Sheet) private sheetRepo: Repository<Sheet>,
    @InjectRepository(Flashcard) private cardRepo: Repository<Flashcard>,
  ) {}

  // ─── Subjects ────────────────────────────────────────────────────────────────
  findSubjects(): Promise<Subject[]> {
    return this.subjectRepo.find({ order: { createdAt: 'ASC' } });
  }

  createSubject(dto: CreateSubjectDto): Promise<Subject> {
    return this.subjectRepo.save(this.subjectRepo.create(dto));
  }

  async updateSubject(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.subjectRepo.findOneBy({ id });
    if (!subject) throw new NotFoundException(`Matière ${id} introuvable`);
    return this.subjectRepo.save({ ...subject, ...dto });
  }

  async removeSubject(id: string): Promise<void> {
    const subject = await this.subjectRepo.findOneBy({ id });
    if (!subject) throw new NotFoundException(`Matière ${id} introuvable`);
    await this.subjectRepo.remove(subject); // cascade → sheets + flashcards
  }

  // ─── Sheets ──────────────────────────────────────────────────────────────────
  findSheets(subjectId?: string): Promise<Sheet[]> {
    return this.sheetRepo.find({
      where: subjectId ? { subjectId } : {},
      order: { updatedAt: 'DESC' },
    });
  }

  async findSheet(id: string): Promise<Sheet> {
    const sheet = await this.sheetRepo.findOneBy({ id });
    if (!sheet) throw new NotFoundException(`Fiche ${id} introuvable`);
    return sheet;
  }

  createSheet(dto: CreateSheetDto): Promise<Sheet> {
    return this.sheetRepo.save(this.sheetRepo.create(dto));
  }

  async updateSheet(id: string, dto: UpdateSheetDto): Promise<Sheet> {
    const sheet = await this.findSheet(id);
    return this.sheetRepo.save({ ...sheet, ...dto });
  }

  async removeSheet(id: string): Promise<void> {
    const sheet = await this.findSheet(id);
    await this.sheetRepo.remove(sheet);
  }

  // ─── Flashcards ──────────────────────────────────────────────────────────────
  findCards(subjectId?: string): Promise<Flashcard[]> {
    return this.cardRepo.find({
      where: subjectId ? { subjectId } : {},
      order: { createdAt: 'ASC' },
    });
  }

  // Cartes à réviser aujourd'hui (échéance <= today)
  findDueCards(subjectId?: string): Promise<Flashcard[]> {
    const today = localToday();
    return this.cardRepo.find({
      where: subjectId
        ? { subjectId, dueDate: LessThanOrEqual(today) }
        : { dueDate: LessThanOrEqual(today) },
      order: { dueDate: 'ASC', createdAt: 'ASC' },
    });
  }

  createCard(dto: CreateFlashcardDto): Promise<Flashcard> {
    const card = this.cardRepo.create({ ...dto, dueDate: localToday() });
    return this.cardRepo.save(card);
  }

  async updateCard(id: string, dto: UpdateFlashcardDto): Promise<Flashcard> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new NotFoundException(`Carte ${id} introuvable`);
    return this.cardRepo.save({ ...card, ...dto });
  }

  async removeCard(id: string): Promise<void> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new NotFoundException(`Carte ${id} introuvable`);
    await this.cardRepo.remove(card);
  }

  // ─── Révision : algorithme SM-2 ────────────────────────────────────────────────
  async review(id: string, grade: number): Promise<Flashcard> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new NotFoundException(`Carte ${id} introuvable`);

    if (grade < 3) {
      // Échec : on recommence, courte échéance
      card.repetitions = 0;
      card.intervalDays = 1;
    } else {
      if (card.repetitions === 0) card.intervalDays = 1;
      else if (card.repetitions === 1) card.intervalDays = 6;
      else card.intervalDays = Math.round(card.intervalDays * card.easeFactor);
      card.repetitions += 1;
    }

    // Mise à jour du facteur de facilité (borné à 1.3)
    const ef =
      card.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    card.easeFactor = Math.max(1.3, Math.round(ef * 100) / 100);

    const today = localToday();
    card.dueDate = addDays(today, card.intervalDays);
    card.lastReviewedAt = new Date();

    return this.cardRepo.save(card);
  }

  // ─── Génération de flashcards depuis un contenu (Claude) ────────────────────────
  private requireApiKey(): string {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes('REMPLACE')) {
      throw new BadRequestException('ANTHROPIC_API_KEY non configurée dans le .env');
    }
    return apiKey;
  }

  private async callCards(
    sourceText: string,
    context: string,
    cardCount: number,
  ): Promise<{ question: string; answer: string }[]> {
    const apiKey = this.requireApiKey();

    const prompt = `À partir du contenu de cours ci-dessous, génère ${cardCount} flashcards de révision en français.

Matière / sujet : ${context}
Contenu :
"""
${sourceText.slice(0, 6000)}
"""

Retourne UNIQUEMENT ce JSON, sans texte ni markdown autour :
{ "flashcards": [ { "question": "…", "answer": "…" } ] }

Règles :
- Exactement ${cardCount} cartes.
- Question courte et précise ; réponse concise et mémorisable.
- Couvre les points clés du contenu, sans doublon.
- En français.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3072,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new BadRequestException(`Erreur API Anthropic: ${response.status} — ${err}`);
    }

    const result = (await response.json()) as any;
    const text = result.content?.[0]?.text ?? '';
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Pas de JSON');
      const parsed = JSON.parse(match[0]);
      return (parsed.flashcards ?? []).filter((c: any) => c.question && c.answer);
    } catch {
      throw new BadRequestException(`Impossible de parser la réponse IA: ${text}`);
    }
  }

  // Ajoute des cartes générées à partir d'une fiche (non destructif)
  async generateCardsForSheet(sheetId: string, cardCount = 8) {
    const sheet = await this.findSheet(sheetId);
    const cards = await this.callCards(sheet.content, sheet.title, cardCount);
    const today = localToday();
    const saved = cards.length
      ? await this.cardRepo.save(
          cards.map((c) =>
            this.cardRepo.create({
              subjectId: sheet.subjectId,
              sheetId: sheet.id,
              question: c.question,
              answer: c.answer,
              dueDate: today,
            }),
          ),
        )
      : [];
    return saved;
  }

  // Régénère TOUT le paquet d'une matière : supprime les cartes existantes
  // puis en recrée à partir des fiches de la matière. ⚠️ Perd la progression SM-2.
  async regenerateSubjectCards(subjectId: string, cardCount = 12) {
    const subject = await this.subjectRepo.findOneBy({ id: subjectId });
    if (!subject) throw new NotFoundException(`Matière ${subjectId} introuvable`);

    const sheets = await this.sheetRepo.find({ where: { subjectId } });
    const source = sheets.map((s) => `# ${s.title}\n${s.content}`).join('\n\n');
    if (!source.trim()) {
      throw new BadRequestException('Aucune fiche pour régénérer les cartes — crée ou génère d\'abord une fiche.');
    }

    // On génère d'abord (si Claude échoue, on ne perd pas l'existant)
    const cards = await this.callCards(source, subject.name, cardCount);

    await this.cardRepo.delete({ subjectId });

    const today = localToday();
    const firstSheetId = sheets[0]?.id ?? null;
    const saved = cards.length
      ? await this.cardRepo.save(
          cards.map((c) =>
            this.cardRepo.create({
              subjectId,
              sheetId: firstSheetId,
              question: c.question,
              answer: c.answer,
              dueDate: today,
            }),
          ),
        )
      : [];
    return saved;
  }

  // ─── Validation d'une réponse libre (Claude) ───────────────────────────────────
  async checkAnswer(id: string, userAnswer: string): Promise<{ verdict: 'ok' | 'mid' | 'no'; note: string }> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new NotFoundException(`Carte ${id} introuvable`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes('REMPLACE')) {
      throw new BadRequestException('ANTHROPIC_API_KEY non configurée dans le .env');
    }

    const prompt = `Tu corriges une flashcard de révision. Compare la réponse de l'étudiant à la réponse attendue et juge si elle est correcte sur le fond (la formulation, l'ordre ou les synonymes peuvent différer).

Question : "${card.question}"
Réponse attendue : "${card.answer}"
Réponse de l'étudiant : "${userAnswer}"

Retourne UNIQUEMENT ce JSON, sans texte autour, sans markdown :
{ "verdict": "ok" | "mid" | "no", "note": "explication courte en français, 1 phrase" }

- "ok"  = correcte ou équivalente sur le fond
- "mid" = partiellement correcte / incomplète
- "no"  = fausse ou hors sujet`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new BadRequestException(`Erreur API Anthropic: ${response.status} — ${err}`);
    }

    const result = (await response.json()) as any;
    const text = result.content?.[0]?.text ?? '';
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Pas de JSON');
      const parsed = JSON.parse(match[0]);
      const verdict = ['ok', 'mid', 'no'].includes(parsed.verdict) ? parsed.verdict : 'mid';
      return { verdict, note: String(parsed.note ?? '') };
    } catch {
      throw new BadRequestException(`Impossible de parser la réponse IA: ${text}`);
    }
  }

  // ─── Génération IA (Claude) ────────────────────────────────────────────────────
  async generate(dto: GenerateDto) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes('REMPLACE')) {
      throw new BadRequestException('ANTHROPIC_API_KEY non configurée dans le .env');
    }

    // Résolution de la matière (existante ou nouvelle)
    let subject: Subject | null = null;
    if (dto.subjectId) {
      subject = await this.subjectRepo.findOneBy({ id: dto.subjectId });
      if (!subject) throw new NotFoundException(`Matière ${dto.subjectId} introuvable`);
    } else if (dto.subjectName) {
      subject = await this.subjectRepo.save(
        this.subjectRepo.create({ name: dto.subjectName }),
      );
    } else {
      throw new BadRequestException('subjectId ou subjectName requis');
    }

    const cardCount = dto.cardCount ?? 10;

    const prompt = `Tu es un assistant de révision pour un étudiant en informatique (formation à Rennes).
Génère une fiche de révision ET des flashcards sur le sujet suivant.

Sujet : "${dto.topic}"
${dto.sourceText ? `\nTexte de cours à synthétiser (base-toi dessus en priorité) :\n"""\n${dto.sourceText}\n"""\n` : ''}

Retourne UNIQUEMENT ce JSON, sans texte autour, sans bloc de code markdown :
{
  "sheet": {
    "title": "titre court de la fiche",
    "content": "le contenu de la fiche en MARKDOWN"
  },
  "flashcards": [
    { "question": "question recto", "answer": "réponse verso" }
  ]
}

Règles pour la fiche (content) :
- En markdown : titres (##), listes, **gras**, \`code inline\`, blocs de code (\`\`\`), et tableaux markdown quand c'est pertinent.
- Claire, structurée, complète mais synthétique. Adaptée à la mémorisation.
- En français.

Règles pour les flashcards :
- Exactement ${cardCount} cartes.
- Question courte et précise, réponse concise (mémorisable).
- Couvre les points clés du sujet.
- En français.

Réponds UNIQUEMENT avec le JSON.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new BadRequestException(`Erreur API Anthropic: ${response.status} — ${err}`);
    }

    const result = (await response.json()) as any;
    const text = result.content?.[0]?.text ?? '';

    let parsed: { sheet: { title: string; content: string }; flashcards: { question: string; answer: string }[] };
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Pas de JSON dans la réponse');
      parsed = JSON.parse(match[0]);
    } catch {
      throw new BadRequestException(`Impossible de parser la réponse IA: ${text}`);
    }

    // Persistance : fiche puis cartes liées
    const sheet = await this.sheetRepo.save(
      this.sheetRepo.create({
        subjectId: subject.id,
        title: parsed.sheet?.title ?? dto.topic,
        content: parsed.sheet?.content ?? '',
      }),
    );

    const today = localToday();
    const cards = (parsed.flashcards ?? [])
      .filter((c) => c.question && c.answer)
      .map((c) =>
        this.cardRepo.create({
          subjectId: subject!.id,
          sheetId: sheet.id,
          question: c.question,
          answer: c.answer,
          dueDate: today,
        }),
      );
    const savedCards = cards.length ? await this.cardRepo.save(cards) : [];

    return { subject, sheet, flashcards: savedCards };
  }
}
