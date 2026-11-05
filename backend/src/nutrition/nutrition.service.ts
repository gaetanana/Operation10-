import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meal, MealFavorite } from './nutrition.entity';

@Injectable()
export class NutritionService {
  constructor(
    @InjectRepository(Meal) private repo: Repository<Meal>,
    @InjectRepository(MealFavorite) private favRepo: Repository<MealFavorite>,
  ) {}

  // ─── Favoris / combos ──────────────────────────────────────────────────────────
  findFavorites(): Promise<MealFavorite[]> {
    return this.favRepo.find({ order: { createdAt: 'DESC' } });
  }

  createFavorite(data: Partial<MealFavorite>): Promise<MealFavorite> {
    return this.favRepo.save(this.favRepo.create(data));
  }

  async removeFavorite(id: string): Promise<void> {
    const f = await this.favRepo.findOneBy({ id });
    if (!f) throw new NotFoundException('Favori introuvable');
    await this.favRepo.remove(f);
  }

  // Applique un favori à une date : recrée toutes ses entrées comme repas
  async applyFavorite(id: string, date: string): Promise<Meal[]> {
    const fav = await this.favRepo.findOneBy({ id });
    if (!fav) throw new NotFoundException('Favori introuvable');
    const meals = (fav.entries ?? []).map((e) =>
      this.repo.create({
        name: e.name,
        date,
        mealType: e.mealType,
        calories: e.calories ?? 0,
        proteins: e.proteins ?? 0,
        carbs: e.carbs ?? 0,
        fats: e.fats ?? 0,
      }),
    );
    return meals.length ? this.repo.save(meals) : [];
  }

  // Duplique tous les repas d'un jour vers un autre
  async duplicateDay(from: string, to: string): Promise<Meal[]> {
    const source = await this.findByDate(from);
    const copies = source.map((m) =>
      this.repo.create({
        name: m.name, date: to, mealType: m.mealType,
        calories: m.calories, proteins: m.proteins, carbs: m.carbs, fats: m.fats,
        items: m.items ?? undefined,
      }),
    );
    return copies.length ? this.repo.save(copies) : [];
  }

  // Aliments récents distincts (par nom), occurrence la plus récente
  async getRecent(limit = 12) {
    const meals = await this.repo.find({ order: { createdAt: 'DESC' }, take: 200 });
    const seen = new Set<string>();
    const out: { name: string; calories: number; proteins: number; carbs: number; fats: number }[] = [];
    for (const m of meals) {
      const key = m.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: m.name, calories: m.calories, proteins: m.proteins, carbs: m.carbs, fats: m.fats });
      if (out.length >= limit) break;
    }
    return out;
  }

  findByDate(date: string): Promise<Meal[]> {
    return this.repo.find({ where: { date }, order: { mealType: 'ASC', createdAt: 'ASC' } });
  }

  create(data: Partial<Meal>): Promise<Meal> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Meal>): Promise<Meal> {
    const meal = await this.repo.findOneBy({ id });
    if (!meal) throw new NotFoundException();
    return this.repo.save({ ...meal, ...data });
  }

  async remove(id: string): Promise<void> {
    const meal = await this.repo.findOneBy({ id });
    if (!meal) throw new NotFoundException();
    await this.repo.remove(meal);
  }

  async getDailyTotals(date: string) {
    const meals = await this.findByDate(date);
    return meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        proteins: acc.proteins + m.proteins,
        carbs:    acc.carbs    + m.carbs,
        fats:     acc.fats     + m.fats,
      }),
      { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    );
  }

  async searchFood(query: string) {
    const headers = {
      'User-Agent': 'Operation10-App/1.0 (gaetan.gonfiantini@gmail.com)',
      'Accept': 'application/json',
    };

    // Tokens de la requête (sans accents) pour vérifier la pertinence des résultats
    const qTokens = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);

    const norm = (s: string) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    const parseProducts = (products: any[]) => {
      const mapped = products
        .filter((p: any) => p.product_name && (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0)
        .map((p: any) => ({
          name: p.product_name + (p.brands ? ` (${p.brands.split(',')[0].trim()})` : ''),
          calories: Math.round(p.nutriments?.['energy-kcal_100g'] ?? 0),
          proteins: Math.round((p.nutriments?.proteins_100g ?? 0) * 10) / 10,
          carbs:    Math.round((p.nutriments?.carbohydrates_100g ?? 0) * 10) / 10,
          fats:     Math.round((p.nutriments?.fat_100g ?? 0) * 10) / 10,
        }));
      // Garde-fou de pertinence : on privilégie les produits dont le nom contient un mot de la requête
      const relevant = qTokens.length
        ? mapped.filter((m) => qTokens.some((t) => norm(m.name).includes(t)))
        : mapped;
      return (relevant.length ? relevant : mapped).slice(0, 6);
    };

    // Endpoint plein-texte cgi/search.pl (le v2 /search n'interprète PAS search_terms).
    // On privilégie le sous-domaine fr pour des requêtes françaises plus pertinentes.
    const enc = encodeURIComponent(query);
    const endpoints = [
      `https://fr.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n`,
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${enc}&search_simple=1&action=process&json=1&page_size=24&sort_by=unique_scans_n`,
    ];

    let lastErr: any = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
        const text = await res.text();
        if (!text.trim().startsWith('{')) { lastErr = new Error('Réponse invalide'); continue; }
        const data = JSON.parse(text) as any;
        const results = parseProducts(data.products ?? []);
        if (results.length > 0) return results;
        lastErr = new Error('Aucun résultat');
      } catch (e) { lastErr = e; }
    }

    throw new Error(`Open Food Facts indisponible (${lastErr?.message ?? 'erreur'}) — réessaie dans quelques secondes`);
  }

  // ─── Analyse photo via Claude Vision ─────────────────────────────────────────

  async analyzeImage(base64Image: string, mediaType: string) {
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

    const result = await response.json() as any;
    const text = result.content?.[0]?.text ?? '';

    try {
      // Extraire le JSON même si Claude ajoute du texte autour
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Pas de JSON dans la réponse');
      return JSON.parse(match[0]);
    } catch {
      throw new Error(`Impossible de parser la réponse: ${text}`);
    }
  }
}
