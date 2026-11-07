import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { getLocalDateString } from '../utils/date';
import { hasWorkoutProgress, readWorkoutDraft } from '../utils/workoutDraft';

interface Session {
  id: string;
  name: string;
  date: string;
  templateId: string | null;
  durationMinutes: number | null;
}

interface Template {
  id: string;
  name: string;
  weeklyTarget: number;
  templateExercises: { name: string }[] | null;
}

interface Meal {
  id: string;
  name: string;
  mealType: string;
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
  const meals = useQuery({
    queryKey: ['meals', today],
    queryFn: () => api.get<Meal[]>(`/nutrition/meals?date=${today}`).then(r => r.data),
  });
  const workoutDraft = useMemo(() => readWorkoutDraft(), []);
  const weekSessions = sessions.data?.filter(s =>
    s.date >= getLocalDateString(monday) && s.date <= getLocalDateString(sunday),
  );
  const latest = sessions.data?.reduce<Session | undefined>(
    (last, s) => !last || s.date > last.date ? s : last, undefined,
  );
  const errors = [sessions, templates, meals].filter(q => q.isError);
  const nextTemplate = templates.data?.find(t =>
    (weekSessions?.filter(session => session.templateId === t.id).length ?? 0) < t.weeklyTarget,
  );
  const draft = workoutDraft.draft && hasWorkoutProgress(workoutDraft.draft) ? workoutDraft.draft : null;
  const todaysSession = sessions.data?.find(s => s.date === today);
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
      {workoutDraft.unavailable && <p className="draft-warning">Le brouillon local est indisponible sur cet appareil.</p>}

      <section className="today-hero" aria-labelledby="session-heading">
        <div className="hero-copy">
          <span className="hero-badge"><i className="ti ti-barbell" aria-hidden="true" /> TON CARNET SPORTIF</span>
          <h2 id="session-heading">{draft ? <>Ta séance t’attend.<br />Reprends où tu en étais.</>
            : nextTemplate ? <>Un repère pour ta semaine.<br />À ton rythme.</>
              : todaysSession ? <>Séance enregistrée.<br />Bien joué d’avoir noté.</>
                : <>Une séance.<br />Un pas de plus.</>}</h2>
          <p>{draft
            ? `${draft.name || 'Séance libre'} · brouillon sauvegardé sur cet appareil.`
            : nextTemplate
              ? `${nextTemplate.name} · ${weekSessions?.filter(session => session.templateId === nextTemplate.id).length ?? 0}/${nextTemplate.weeklyTarget} séance(s) notée(s) cette semaine.`
              : todaysSession
                ? `Tu as noté ${todaysSession.name} aujourd’hui. Le programme reste souple ; tu peux en ajouter une autre si tu le souhaites.`
                : 'Prépare ta séance, adapte les exercices et note uniquement ce que tu as réellement fait.'}</p>
          <div className="hero-actions">
            <Link className="primary-action" to={draft ? '/seance' : nextTemplate ? `/seance?template=${encodeURIComponent(nextTemplate.id)}` : '/seance'}>
              {draft ? 'Reprendre ma séance' : nextTemplate ? 'Préparer ce repère' : todaysSession ? 'Ajouter une séance' : 'Commencer une séance'}
              <i className="ti ti-arrow-right" aria-hidden="true" />
            </Link>
            <Link className="quiet-link" to="/sport">{todaysSession && !draft ? 'Voir mon carnet' : 'Voir mon programme'}</Link>
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
          <Link to="/sport" className="quiet-link">Voir les séances <i className="ti ti-arrow-right" aria-hidden="true" /></Link>
        </div>
      </section>

      <div className="today-columns">
        <section className="today-panel" aria-labelledby="nutrition-heading">
          <div className="panel-heading">
            <div className="section-symbol"><i className="ti ti-salad" aria-hidden="true" /></div>
            <h2 id="nutrition-heading">Dans ton assiette</h2>
          </div>
          <p className="panel-description">Un journal, sans objectif imposé.</p>
          {meals.isPending ? <p role="status">Chargement des repas…</p>
            : meals.isError ? <p>Le suivi nutrition est momentanément indisponible.</p>
              : (
                <>
                  {meals.data?.length ? <>
                    <div className="nutrition-number">{meals.data.length} <span>repas noté{meals.data.length === 1 ? '' : 's'} aujourd’hui</span></div>
                    <ul className="today-meal-list">{meals.data.slice(0, 3).map(meal => <li key={meal.id}>{meal.name}</li>)}</ul>
                    {meals.data.length > 3 && <p className="meal-more">et {meals.data.length - 3} autre{meals.data.length - 3 > 1 ? 's' : ''}</p>}
                  </> : <p className="empty-guidance">Aucun repas noté aujourd’hui. Ajoute-en un si tu veux garder une trace.</p>}
                </>
              )}
          <Link className="secondary-action" to="/nutrition"><i className="ti ti-plus" aria-hidden="true" /> {meals.data?.length ? 'Noter un repas' : 'Ajouter un repas'}</Link>
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
