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
exports.NutritionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nutrition_entity_1 = require("./nutrition.entity");
let NutritionService = class NutritionService {
    constructor(repo, favRepo) {
        this.repo = repo;
        this.favRepo = favRepo;
    }
    findFavorites() {
        return this.favRepo.find({ order: { createdAt: 'DESC' } });
    }
    createFavorite(data) {
        return this.favRepo.save(this.favRepo.create(data));
    }
    async removeFavorite(id) {
        const f = await this.favRepo.findOneBy({ id });
        if (!f)
            throw new common_1.NotFoundException('Favori introuvable');
        await this.favRepo.remove(f);
    }
    async applyFavorite(id, date) {
        const fav = await this.favRepo.findOneBy({ id });
        if (!fav)
            throw new common_1.NotFoundException('Favori introuvable');
        const meals = (fav.entries ?? []).map((e) => this.repo.create({
            name: e.name,
            date,
            mealType: e.mealType,
            calories: e.calories ?? 0,
            proteins: e.proteins ?? 0,
            carbs: e.carbs ?? 0,
            fats: e.fats ?? 0,
        }));
        return meals.length ? this.repo.save(meals) : [];
    }
    async duplicateDay(from, to) {
        const source = await this.findByDate(from);
        const copies = source.map((m) => this.repo.create({
            name: m.name, date: to, mealType: m.mealType,
            calories: m.calories, proteins: m.proteins, carbs: m.carbs, fats: m.fats,
            items: m.items ?? undefined,
        }));
        return copies.length ? this.repo.save(copies) : [];
    }
    async getRecent(limit = 12) {
        const meals = await this.repo.find({ order: { createdAt: 'DESC' }, take: 200 });
        const seen = new Set();
        const out = [];
        for (const m of meals) {
            const key = m.name.trim().toLowerCase();
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push({ name: m.name, calories: m.calories, proteins: m.proteins, carbs: m.carbs, fats: m.fats });
            if (out.length >= limit)
                break;
        }
        return out;
    }
    findByDate(date) {
        return this.repo.find({ where: { date }, order: { mealType: 'ASC', createdAt: 'ASC' } });
    }
    create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async update(id, data) {
        const meal = await this.repo.findOneBy({ id });
        if (!meal)
            throw new common_1.NotFoundException();
        return this.repo.save({ ...meal, ...data });
    }
    async remove(id) {
        const meal = await this.repo.findOneBy({ id });
        if (!meal)
            throw new common_1.NotFoundException();
        await this.repo.remove(meal);
    }
    async getDailyTotals(date) {
        const meals = await this.findByDate(date);
        return meals.reduce((acc, m) => ({
            calories: acc.calories + m.calories,
            proteins: acc.proteins + m.proteins,
            carbs: acc.carbs + m.carbs,
            fats: acc.fats + m.fats,
        }), { calories: 0, proteins: 0, carbs: 0, fats: 0 });
    }
    async searchFood(query) {
        const headers = {
            'User-Agent': 'Operation10-App/1.0 (gaetan.gonfiantini@gmail.com)',
            'Accept': 'application/json',
        };
        const qTokens = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
        const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const parseProducts = (products) => {
            const mapped = products
                .filter((p) => p.product_name && (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0)
                .map((p) => ({
                name: p.product_name + (p.brands ? ` (${p.brands.split(',')[0].trim()})` : ''),
                calories: Math.round(p.nutriments?.['energy-kcal_100g'] ?? 0),
                proteins: Math.round((p.nutriments?.proteins_100g ?? 0) * 10) / 10,
                carbs: Math.round((p.nutriments?.carbohydrates_100g ?? 0) * 10) / 10,
                fats: Math.round((p.nutriments?.fat_100g ?? 0) * 10) / 10,
            }));
            const relevant = qTokens.length
                ? mapped.filter((m) => qTokens.some((t) => norm(m.name).includes(t)))
                : mapped;
            return (relevant.length ? relevant : mapped).slice(0, 6);
        };
        const enc = encodeURIComponent(query);
        const endpoints = [
            `https://fr.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n`,
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n`,
        ];
        let lastErr = null;
        for (const url of endpoints) {
            try {
                const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
                if (!res.ok) {
                    lastErr = new Error(`HTTP ${res.status}`);
                    continue;
                }
                const text = await res.text();
                if (!text.trim().startsWith('{')) {
                    lastErr = new Error('Réponse invalide');
                    continue;
                }
                const data = JSON.parse(text);
                const results = parseProducts(data.products ?? []);
                if (results.length > 0)
                    return results;
                lastErr = new Error('Aucun résultat');
            }
            catch (e) {
                lastErr = e;
            }
        }
        throw new Error(`Open Food Facts indisponible (${lastErr?.message ?? 'erreur'}) — réessaie dans quelques secondes`);
    }
    async analyzeImage(base64Image, mediaType) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || apiKey.includes('REMPLACE')) {
            throw new Error('ANTHROPIC_API_KEY non configurée dans le .env');
        }
        const prompt = `Analyse cette image de repas, plateau de cantine ou emballage alimentaire.

Si l'image contient PLUSIEURS aliments (plateau, assiette composée) :
Retourne UNIQUEMENT ce JSON :
{
  "type": "multiple",
  "items": [
    {
      "name": "nom de l'aliment",
      "portionG": estimation du poids en grammes,
      "calories": kcal pour cette portion,
      "proteins": grammes de protéines,
      "carbs": grammes de glucides,
      "fats": grammes de lipides
    }
  ]
}

Si l'image contient UN SEUL aliment ou un emballage :
Retourne UNIQUEMENT ce JSON :
{
  "type": "single",
  "name": "nom de l'aliment",
  "calories": kcal (pour 100g si emballage, pour la portion si plat),
  "proteins": grammes,
  "carbs": grammes,
  "fats": grammes,
  "portionNote": "ex: pour 100g / portion estimée 150g / assiette entière"
}

Règles :
- Pas de markdown, pas d'explication, UNIQUEMENT le JSON
- Arrondis à 1 décimale maximum
- Si tu vois un emballage avec tableau nutritionnel, utilise les valeurs officielles pour 100g
- Si c'est un plateau de cantine, identifie chaque composant séparément et estime les grammages réalistes
- Sois réaliste sur les portions (un steak haché cantine = ~100-120g, une portion de purée = ~150-200g)`;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 512,
                messages: [{
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: mediaType,
                                    data: base64Image,
                                },
                            },
                            { type: 'text', text: prompt },
                        ],
                    }],
            }),
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Erreur API Anthropic: ${response.status} — ${err}`);
        }
        const result = await response.json();
        const text = result.content?.[0]?.text ?? '';
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (!match)
                throw new Error('Pas de JSON dans la réponse');
            return JSON.parse(match[0]);
        }
        catch {
            throw new Error(`Impossible de parser la réponse: ${text}`);
        }
    }
};
exports.NutritionService = NutritionService;
exports.NutritionService = NutritionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(nutrition_entity_1.Meal)),
    __param(1, (0, typeorm_1.InjectRepository)(nutrition_entity_1.MealFavorite)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], NutritionService);
//# sourceMappingURL=nutrition.service.js.map