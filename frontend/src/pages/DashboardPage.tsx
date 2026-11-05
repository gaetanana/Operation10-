import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Objectifs nutrition (mêmes valeurs que NutritionPage)
const GOALS = { calories: 2500, proteins: 180, carbs: 250, fats: 80 };

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pecs_triceps: { label: 'Pecs / Triceps', color: 'si-pt', icon: 'ti-barbell' },
  dos_biceps:   { label: 'Dos / Biceps',   color: 'si-db', icon: 'ti-barbell' },
  epaules:      { label: 'Épaules',         color: 'si-ep', icon: 'ti-barbell' },
  jambes:       { label: 'Jambes',          color: 'si-ja', icon: 'ti-barbell' },
  bras_abdos:   { label: 'Bras / Abdos',   color: 'si-ba', icon: 'ti-barbell' },
  cardio:       { label: 'Cardio',          color: 'si-c',  icon: 'ti-run' },
  emom:         { label: 'EMOM',            color: 'si-e',  icon: 'ti-flame' },
  circuit:      { label: 'Circuit',         color: 'si-cr', icon: 'ti-repeat' },
  other:        { label: 'Autre',           color: 'si-o',  icon: 'ti-activity' },
};

function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function isSameWeek(dateStr: string, monday: Date): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const end = new Date(monday);
  end.setDate(monday.getDate() + 7);
  return d >= monday && d < end;
}

// Attribution d'une séance au bon contrat (id explicite, sinon type unique, sinon nom)
function toks(x: any): string[] {
  return String(x ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
}
function attributeContract(s: any, templates: any[]): string | null {
  if (s.templateId && templates.some((t) => t.id === s.templateId)) return s.templateId;
  const same = templates.filter((t) => t.type === s.type);
  if (same.length === 0) return null;
  if (same.length === 1) return same[0].id;
  const st = new Set(toks(s.name));
  let best: string | null = null, bestScore = 0;
  for (const t of same) {
    const score = toks(t.name).filter((w) => st.has(w)).length;
    if (score > bestScore) { bestScore = score; best = t.id; }
  }
  return best;
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div className="macro-line">
      <div className="macro-top">
        <span className="macro-lbl">{label}</span>
        <span className="macro-val">{Math.round(value)} <span className="macro-goal">/ {goal}</span></span>
      </div>
      <div className="macro-track"><div className="macro-fill" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const today = getLocalToday();
  const monday = getMondayOf(new Date());

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Bonne nuit' : hour < 18 ? 'Bonjour' : 'Bonsoir';
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── Données ──
  const { data: stats } = useQuery({ queryKey: ['sport-stats'], queryFn: () => api.get('/sport/stats').then(r => r.data) });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: () => api.get('/sport/templates').then(r => r.data) });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: () => api.get('/sport/sessions').then(r => r.data) });
  const { data: totals } = useQuery({ queryKey: ['nutrition-totals', today], queryFn: () => api.get(`/nutrition/totals?date=${today}`).then(r => r.data) });
  const { data: dueCards = [] } = useQuery({ queryKey: ['rev-due'], queryFn: () => api.get('/revision/flashcards/due').then(r => r.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['rev-subjects'], queryFn: () => api.get('/revision/subjects').then(r => r.data) });

  // ── Sport : contrat de la semaine ──
  const weekSessions = (sessions as any[]).filter((s: any) => isSameWeek(s.date, monday));
  const doneByTpl = new Map<string, number>();
  for (const s of weekSessions) { const id = attributeContract(s, templates as any[]); if (id) doneByTpl.set(id, (doneByTpl.get(id) ?? 0) + 1); }
  const totalTarget = (templates as any[]).reduce((n: number, t: any) => n + (t.weeklyTarget ?? 1), 0);
  const totalDone = (templates as any[]).reduce((n: number, t: any) => n + Math.min(doneByTpl.get(t.id) ?? 0, t.weeklyTarget ?? 1), 0);
  const contractPct = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
  const lastSession = (sessions as any[])[0];

  // ── Révisions : à réviser par matière ──
  const dueBySubject = new Map<string, number>();
  for (const c of dueCards as any[]) dueBySubject.set(c.subjectId, (dueBySubject.get(c.subjectId) ?? 0) + 1);
  const dueRows = (subjects as any[])
    .map((s: any) => ({ s, n: dueBySubject.get(s.id) ?? 0 }))
    .filter((r) => r.n > 0);

  const t = totals ?? { calories: 0, proteins: 0, carbs: 0, fats: 0 };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, Gaëtan 👋</h1>
          <p className="page-sub" style={{ textTransform: 'capitalize' }}>{dateLabel}</p>
        </div>
      </div>

      <div className="dash-grid">
        {/* ── SPORT ── */}
        <div className="dash-card" onClick={() => nav('/sport')}>
          <div className="dash-head">
            <span className="dash-ic" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}><i className="ti ti-barbell" /></span>
            <span className="dash-title">Sport</span>
            <i className="ti ti-chevron-right dash-go" />
          </div>

          <div className="dash-row-num">
            <div><div className="dash-num">{stats?.thisWeek ?? weekSessions.length}</div><div className="dash-num-lbl">cette semaine</div></div>
            <div><div className="dash-num">{stats?.thisMonth ?? 0}</div><div className="dash-num-lbl">ce mois</div></div>
          </div>

          {totalTarget > 0 && (
            <div className="dash-block">
              <div className="dash-block-head">
                <span>Contrat de la semaine</span>
                <span className={contractPct >= 100 ? 'dash-ok' : ''}>{totalDone}/{totalTarget}</span>
              </div>
              <div className="macro-track"><div className="macro-fill" style={{ width: `${contractPct}%`, background: 'var(--accent)' }} /></div>
            </div>
          )}

          {lastSession ? (
            <div className="dash-foot">
              Dernière : <b>{lastSession.name}</b> · {new Date(lastSession.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          ) : <div className="dash-foot">Aucune séance enregistrée.</div>}
        </div>

        {/* ── NUTRITION ── */}
        <div className="dash-card" onClick={() => nav('/nutrition')}>
          <div className="dash-head">
            <span className="dash-ic" style={{ background: 'var(--orange-bg)', color: 'var(--orange)' }}><i className="ti ti-salad" /></span>
            <span className="dash-title">Nutrition — aujourd'hui</span>
            <i className="ti ti-chevron-right dash-go" />
          </div>

          <div className="dash-row-num">
            <div><div className="dash-num">{Math.round(t.calories)}</div><div className="dash-num-lbl">/ {GOALS.calories} kcal</div></div>
          </div>

          <div className="dash-block">
            <MacroBar label="Protéines" value={t.proteins} goal={GOALS.proteins} color="var(--accent)" />
            <MacroBar label="Glucides"  value={t.carbs}    goal={GOALS.carbs}    color="var(--cyan)" />
            <MacroBar label="Lipides"   value={t.fats}     goal={GOALS.fats}     color="var(--orange)" />
          </div>
        </div>

        {/* ── RÉVISIONS ── */}
        <div className="dash-card" onClick={() => nav('/revision')}>
          <div className="dash-head">
            <span className="dash-ic" style={{ background: 'var(--cyan-bg)', color: 'var(--cyan)' }}><i className="ti ti-cards" /></span>
            <span className="dash-title">Révisions</span>
            <i className="ti ti-chevron-right dash-go" />
          </div>

          <div className="dash-row-num">
            <div><div className="dash-num">{(dueCards as any[]).length}</div><div className="dash-num-lbl">carte{(dueCards as any[]).length > 1 ? 's' : ''} à réviser</div></div>
          </div>

          <div className="dash-block">
            {dueRows.length === 0 ? (
              <div className="dash-empty-line">Rien à réviser aujourd'hui 🎉</div>
            ) : dueRows.map(({ s, n }) => (
              <div className="due-line" key={s.id}>
                <span className="due-ic" style={{ color: s.color }}><i className={`ti ${s.icon || 'ti-book'}`} /></span>
                <span className="due-name">{s.name}</span>
                <span className="due-badge">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RACCOURCIS ── */}
      <p className="section-head" style={{ marginTop: 26 }}>Raccourcis</p>
      <div className="dash-actions">
        <button className="dash-action" onClick={() => nav('/sport')}><i className="ti ti-plus" /> Logger une séance</button>
        <button className="dash-action" onClick={() => nav('/nutrition')}><i className="ti ti-plus" /> Ajouter un repas</button>
        <button className="dash-action" onClick={() => nav('/revision')}><i className="ti ti-player-play" /> Lancer une révision</button>
        <button className="dash-action" onClick={() => nav('/stats')}><i className="ti ti-chart-line" /> Voir les stats</button>
      </div>
    </div>
  );
}
