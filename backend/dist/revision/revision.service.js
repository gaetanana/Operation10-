"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevisionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const revision_entity_1 = require("./revision.entity");
function localToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(base, days) {
    const d = new Date(base + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
let RevisionService = class RevisionService {
    constructor(subjectRepo, sheetRepo, cardRepo) {
        this.subjectRepo = subjectRepo;
        this.sheetRepo = sheetRepo;
        this.cardRepo = cardRepo;
    }
    findSubjects() {
        return this.subjectRepo.find({ order: { createdAt: 'ASC' } });
    }
    createSubject(dto) {
        return this.subjectRepo.save(this.subjectRepo.create(dto));
    }
    async updateSubject(id, dto) {
        const subject = await this.subjectRepo.findOneBy({ id });
        if (!subject)
            throw new common_1.NotFoundException(`Matière ${id} introuvable`);
        return this.subjectRepo.save({ ...subject, ...dto });
    }
    async removeSubject(id) {
        const subject = await this.subjectRepo.findOneBy({ id });
        if (!subject)
            throw new common_1.NotFoundException(`Matière ${id} introuvable`);
        await this.subjectRepo.remove(subject);
    }
    findSheets(subjectId) {
        return this.sheetRepo.find({
            where: subjectId ? { subjectId } : {},
            order: { updatedAt: 'DESC' },
        });
    }
    async findSheet(id) {
        const sheet = await this.sheetRepo.findOneBy({ id });
        if (!sheet)
            throw new common_1.NotFoundException(`Fiche ${id} introuvable`);
        return sheet;
    }
    createSheet(dto) {
        return this.sheetRepo.save(this.sheetRepo.create(dto));
    }
    async updateSheet(id, dto) {
        const sheet = await this.findSheet(id);
        return this.sheetRepo.save({ ...sheet, ...dto });
    }
    async removeSheet(id) {
        const sheet = await this.findSheet(id);
        await this.sheetRepo.remove(sheet);
    }
    findCards(subjectId) {
        return this.cardRepo.find({
            where: subjectId ? { subjectId } : {},
            order: { createdAt: 'ASC' },
        });
    }
    findDueCards(subjectId) {
        const today = localToday();
        return this.cardRepo.find({
            where: subjectId
                ? { subjectId, dueDate: (0, typeorm_2.LessThanOrEqual)(today) }
                : { dueDate: (0, typeorm_2.LessThanOrEqual)(today) },
            order: { dueDate: 'ASC', createdAt: 'ASC' },
        });
    }
    createCard(dto) {
        const card = this.cardRepo.create({ ...dto, dueDate: localToday() });
        return this.cardRepo.save(card);
    }
    async updateCard(id, dto) {
        const card = await this.cardRepo.findOneBy({ id });
        if (!card)
            throw new common_1.NotFoundException(`Carte ${id} introuvable`);
        return this.cardRepo.save({ ...card, ...dto });
    }
    async removeCard(id) {
        const card = await this.cardRepo.findOneBy({ id });
        if (!card)
            throw new common_1.NotFoundException(`Carte ${id} introuvable`);
        await this.cardRepo.remove(card);
    }
    async review(id, grade) {
        const card = await this.cardRepo.findOneBy({ id });
        if (!card)
            throw new common_1.NotFoundException(`Carte ${id} introuvable`);
        if (grade < 3) {
            card.repetitions = 0;
            card.intervalDays = 1;
        }
        else {
            if (card.repetitions === 0)
                card.intervalDays = 1;
            else if (card.repetitions === 1)
                card.intervalDays = 6;
            else
                card.intervalDays = Math.round(card.intervalDays * card.easeFactor);
            card.repetitions += 1;
        }
        const ef = card.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
        card.easeFactor = Math.max(1.3, Math.round(ef * 100) / 100);
        const today = localToday();
        card.dueDate = addDays(today, card.intervalDays);
        card.lastReviewedAt = new Date();
        return this.cardRepo.save(card);
    }
    requireApiKey() {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || apiKey.includes('REMPLACE')) {
            throw new common_1.BadRequestException('ANTHROPIC_API_KEY non configurée dans le .env');
        }
        return apiKey;
    }
    async callCards(sourceText, context, cardCount) {
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
            throw new common_1.BadRequestException(`Erreur API Anthropic: ${response.status} — ${err}`);
        }
        const result = (await response.json());
        const text = result.content?.[0]?.text ?? '';
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (!match)
                throw new Error('Pas de JSON');
            const parsed = JSON.parse(match[0]);
            return (parsed.flashcards ?? []).filter((c) => c.question && c.answer);
        }
        catch {
            throw new common_1.BadRequestException(`Impossible de parser la réponse IA: ${text}`);
        }
    }
    async generateCardsForSheet(sheetId, cardCount = 8) {
        const sheet = await this.findSheet(sheetId);
        const cards = await this.callCards(sheet.content, sheet.title, cardCount);
        const today = localToday();
        const saved = cards.length
            ? await this.cardRepo.save(cards.map((c) => this.cardRepo.create({
                subjectId: sheet.subjectId,
                sheetId: sheet.id,
                question: c.question,
                answer: c.answer,
                dueDate: today,
            })))
            : [];
        return saved;
    }
    async regenerateSubjectCards(subjectId, cardCount = 12) {
        const subject = await this.subjectRepo.findOneBy({ id: subjectId });
        if (!subject)
            throw new common_1.NotFoundException(`Matière ${subjectId} introuvable`);
        const sheets = await this.sheetRepo.find({ where: { subjectId } });
        const source = sheets.map((s) => `# ${s.title}\n${s.content}`).join('\n\n');
        if (!source.trim()) {
            throw new common_1.BadRequestException('Aucune fiche pour régénérer les cartes — crée ou génère d\'abord une fiche.');
        }
        const cards = await this.callCards(source, subject.name, cardCount);
        await this.cardRepo.delete({ subjectId });
        const today = localToday();
        const firstSheetId = sheets[0]?.id ?? null;
        const saved = cards.length
            ? await this.cardRepo.save(cards.map((c) => this.cardRepo.create({
                subjectId,
                sheetId: firstSheetId,
                question: c.question,
                answer: c.answer,
                dueDate: today,
            })))
            : [];
        return saved;
    }
    async checkAnswer(id, userAnswer) {
        const card = await this.cardRepo.findOneBy({ id });
        if (!card)
            throw new common_1.NotFoundException(`Carte ${id} introuvable`);
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || apiKey.includes('REMPLACE')) {
            throw new common_1.BadRequestException('ANTHROPIC_API_KEY non configurée dans le .env');
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
            throw new common_1.BadRequestException(`Erreur API Anthropic: ${response.status} — ${err}`);
        }
        const result = (await response.json());
        const text = result.content?.[0]?.text ?? '';
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (!match)
                throw new Error('Pas de JSON');
            const parsed = JSON.parse(match[0]);
            const verdict = ['ok', 'mid', 'no'].includes(parsed.verdict) ? parsed.verdict : 'mid';
            return { verdict, note: String(parsed.note ?? '') };
        }
        catch {
            throw new common_1.BadRequestException(`Impossible de parser la réponse IA: ${text}`);
        }
    }
    async generate(dto) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || apiKey.includes('REMPLACE')) {
            throw new common_1.BadRequestException('ANTHROPIC_API_KEY non configurée dans le .env');
        }
        let subject = null;
        if (dto.subjectId) {
            subject = await this.subjectRepo.findOneBy({ id: dto.subjectId });
            if (!subject)
                throw new common_1.NotFoundException(`Matière ${dto.subjectId} introuvable`);
        }
        else if (dto.subjectName) {
            subject = await this.subjectRepo.save(this.subjectRepo.create({ name: dto.subjectName }));
        }
        else {
            throw new common_1.BadRequestException('subjectId ou subjectName requis');
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
            throw new common_1.BadRequestException(`Erreur API Anthropic: ${response.status} — ${err}`);
        }
        const result = (await response.json());
        const text = result.content?.[0]?.text ?? '';
        let parsed;
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (!match)
                throw new Error('Pas de JSON dans la réponse');
            parsed = JSON.parse(match[0]);
        }
        catch {
            throw new common_1.BadRequestException(`Impossible de parser la réponse IA: ${text}`);
        }
        const sheet = await this.sheetRepo.save(this.sheetRepo.create({
            subjectId: subject.id,
            title: parsed.sheet?.title ?? dto.topic,
            content: parsed.sheet?.content ?? '',
        }));
        const today = localToday();
        const cards = (parsed.flashcards ?? [])
            .filter((c) => c.question && c.answer)
            .map((c) => this.cardRepo.create({
            subjectId: subject.id,
            sheetId: sheet.id,
            question: c.question,
            answer: c.answer,
            dueDate: today,
        }));
        const savedCards = cards.length ? await this.cardRepo.save(cards) : [];
        return { subject, sheet, flashcards: savedCards };
    }
};
exports.RevisionService = RevisionService;
exports.RevisionService = RevisionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(revision_entity_1.Subject)),
    __param(1, (0, typeorm_1.InjectRepository)(revision_entity_1.Sheet)),
    __param(2, (0, typeorm_1.InjectRepository)(revision_entity_1.Flashcard)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RevisionService);
//# sourceMappingURL=revision.service.js.map