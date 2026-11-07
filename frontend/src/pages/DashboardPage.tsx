import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getLocalDateString } from '../utils/date';

interface Session {
  id: string;
  name: string;
  date: string;
  durationMinutes: number | null;
}

interface Template {
  id: string;
  name: string;
  weeklyTarget: number;
  templateExercises: { name: string }[] | null;
}

interface NutritionTotals {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

export default function DashboardPage() {
  const today = getLocalDateString();
  const monday = new Date(`${today}T00:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<Session[]>('/sport/sessions').then(r => r.data),
  });
  const templates = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<Template[]>('/sport/templates').then(r => r.data),
  });
  const nutrition = useQuery({
    queryKey: ['nutrition-totals', today],
    queryFn: () => api.get<NutritionTotals>(`/nutrition/totals?date=${today}`).then(r => r.data),
  });
  const weekSessions = sessions.data?.filter(s =>
    s.date >= getLocalDateString(monday) && s.date <= getLocalDateString(sunday),
  );
  const latest = sessions.data?.reduce<Session | undefined>(
    (last, s) => !last || s.date > last.date ? s : last, undefined,
  );
  const errors = [sessions, templates, nutrition].filter(q => q.isError);
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="page today-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">TON CARNET QUOTIDIEN</p>
          <h1 className="page-title">Aujourd’hui, à ton rythme.</h1>
          <p className="page-sub date-label">{dateLabel}</p>
        </div>
        <Link className="quiet-link" to="/stats">Voir ma progression <i className="ti ti-arrow-up-right" aria-hidden="true" /></Link>
      </header>

      {errors.length > 0 && (
        <div className="feedback-error" role="alert">
          Certaines données n’ont pas pu être chargées.
          <button type="button" onClick={() => errors.forEach(q => q.refetch())}>Réessayer</button>
        </div>
      )}

      <section className="today-hero" aria-labelledby="session-heading">
        <div className="hero-copy">
          <span className="hero-badge"><i className="ti ti-barbell" aria-hidden="true" /> LE RENDEZ-VOUS AVEC TOI</span>
          <h2 id="session-heading">Une séance.<br />Un pas de plus.</h2>
          <p>Retrouve tes exercices, adapte ta séance et garde une trace de ce que tu as fait. Pas besoin d’une semaine parfaite.</p>
          <div className="hero-actions">
            <Link className="primary-action" to="/seance">Préparer ma séance <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
            <Link className="quiet-link" to="/sport">Mon programme</Link>
          </div>
        </div>
        <div className="week-summary">
          <span className="eyebrow">CETTE SEMAINE</span>
          <div className="week-count">
            {sessions.isPending ? '…' : sessions.isError ? '—' : weekSessions?.length ?? 0}
            <span>séance{weekSessions?.length === 1 ? '' : 's'} enregistrée{weekSessions?.length === 1 ? '' : 's'}</span>
          </div>
          <p>{latest
            ? `Dernière séance : ${latest.name}`
            : sessions.isPending ? 'Chargement du carnet…'
              : sessions.isError ? 'Le carnet est momentanément indisponible.'
                : 'Ton carnet attend sa première séance.'}</p>
          <Link to="/sport" className="quiet-link">Ouvrir le carnet <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
        </div>
      </section>

      <div className="today-columns">
        <section className="today-panel" aria-labelledby="nutrition-heading">
          <div className="panel-heading">
            <div className="section-symbol"><i className="ti ti-salad" aria-hidden="true" /></div>
            <h2 id="nutrition-heading">Dans ton assiette</h2>
          </div>
          <p className="panel-description">Un suivi simple de ce que tu as renseigné aujourd’hui.</p>
          {nutrition.isPending ? <p role="status">Chargement des repas…</p>
            : nutrition.isError ? <p>Le suivi nutrition est momentanément indisponible.</p>
              : (
                <>
                  <div className="nutrition-number">{Math.round(nutrition.data?.calories ?? 0)} <span>kcal enregistrées</span></div>
                  <dl className="nutrition-summary">
                    <div><dt>Protéines</dt><dd>{Math.round(nutrition.data?.proteins ?? 0)} g</dd></div>
                    <div><dt>Glucides</dt><dd>{Math.round(nutrition.data?.carbs ?? 0)} g</dd></div>
                    <div><dt>Lipides</dt><dd>{Math.round(nutrition.data?.fats ?? 0)} g</dd></div>
                  </dl>
                </>
              )}
          <Link className="secondary-action" to="/nutrition"><i className="ti ti-plus" aria-hidden="true" /> Ajouter un repas</Link>
        </section>

        <section className="today-panel" aria-labelledby="program-heading">
          <div className="panel-heading">
            <div className="section-symbol"><i className="ti ti-calendar" aria-hidden="true" /></div>
            <h2 id="program-heading">Tes repères sportifs</h2>
          </div>
          <p className="panel-description">Tes contrats restent souples. Choisis celui qui te convient aujourd’hui.</p>
          {templates.isPending ? <p role="status">Chargement du programme…</p>
            : templates.isError ? <p>Le programme est momentanément indisponible.</p>
              : templates.data?.length ? (
                <ul className="program-list">
                  {templates.data.slice(0, 4).map(t => (
                    <li key={t.id}>
                      <Link to={`/seance?template=${encodeURIComponent(t.id)}`}>
                        <span>{t.name}<small>{t.templateExercises?.length ?? 0} exercices · objectif {t.weeklyTarget}/semaine</small></span>
                        <i className="ti ti-arrow-right" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p>Crée ton premier contrat dans Sport pour retrouver ici tes exercices.</p>}
          <Link className="quiet-link" to="/sport">Voir tout le programme <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
        </section>
      </div>
    </div>
  );
}
