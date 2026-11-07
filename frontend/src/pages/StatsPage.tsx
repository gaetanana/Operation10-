import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  pecs_triceps: { label: 'Pecs / Triceps', color: '#d070ff' },
  dos_biceps:   { label: 'Dos / Biceps',   color: '#40c0ff' },
  epaules:      { label: 'Épaules',          color: '#ffcc40' },
  jambes:       { label: 'Jambes',           color: '#40ffaa' },
  bras_abdos:   { label: 'Bras / Abdos',    color: '#ff9040' },
  cardio:       { label: 'Cardio',           color: '#40c0ff' },
  emom:         { label: 'EMOM',             color: '#ff9040' },
  circuit:      { label: 'Circuit',          color: '#ff40cc' },
  other:        { label: 'Autre',            color: '#4a6080' },
};

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface SessionSummary {
  id: string;
  type: string;
  date: string;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localMonday(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .5s ease' }} />
    </div>
  );
}

// ─── Mini graphe de progression ───────────────────────────────────────────────

function StrengthChart({ data }: { data: { date: string; weight: number }[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.weight));
  const min = Math.min(...data.map(d => d.weight));
  const range = max - min || 1;
  const W = 300;
  const H = 70;
  const PAD = { top: 8, right: 8, bottom: 20, left: 30 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * innerW,
    y: PAD.top + innerH - ((d.weight - min) / range) * innerH,
    weight: d.weight,
    date: d.date,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const first = pts[0];
  const last = pts[pts.length - 1];
  const gained = last.weight - first.weight;

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Lignes de grille */}
        {[0, 0.5, 1].map(t => {
          const y = PAD.top + innerH * (1 - t);
          const val = Math.round(min + range * t);
          return (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.5} />
              <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize={8} fill="var(--text-muted)">{val}</text>
            </g>
          );
        })}
        {/* Ligne de progression */}
        <polyline points={polyline} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Points */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--accent)" />
        ))}
        {/* Labels date début/fin */}
        <text x={PAD.left} y={H - 4} fontSize={8} fill="var(--text-muted)">{first.date.slice(5)}</text>
        <text x={W - PAD.right} y={H - 4} textAnchor="end" fontSize={8} fill="var(--text-muted)">{last.date.slice(5)}</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>{first.weight} kg → <strong style={{ color: 'var(--text-secondary)' }}>{last.weight} kg</strong></span>
        <span style={{ color: gained >= 0 ? 'var(--accent)' : '#ff6060', fontWeight: 600 }}>
          {gained >= 0 ? '+' : ''}{Math.round(gained * 10) / 10} kg
        </span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<SessionSummary[]>('/sport/sessions').then(r => r.data),
  });

  const sessions = sessionsQuery.data ?? [];
  const now = new Date();
  const thisMonday = localMonday(now);
  const monthStart = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const weekStart = localDateKey(thisMonday);
  const thisWeek = sessions.filter(session => session.date >= weekStart && session.date <= localDateKey(now)).length;
  const thisMonthSessions = sessions.filter(session => session.date >= monthStart && session.date <= monthEnd);
  const byType = thisMonthSessions.reduce<Record<string, number>>((counts, session) => {
    counts[session.type] = (counts[session.type] ?? 0) + 1;
    return counts;
  }, {});
  const maxByType = Math.max(...Object.values(byType), 1);
  const last8Weeks = Array.from({ length: 8 }, (_, index) => {
    const monday = new Date(thisMonday);
    monday.setDate(monday.getDate() - (7 * (7 - index)));
    const week = localDateKey(monday);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    return {
      week,
      count: sessions.filter(session => session.date >= week && session.date < localDateKey(nextMonday)).length,
      current: index === 7,
    };
  });
  const maxWeek = Math.max(...last8Weeks.map(w => w.count), 1);

  const { data: strengthData = [] } = useQuery<{ name: string; data: { date: string; weight: number }[] }[]>({
    queryKey: ['strength-progress'],
    queryFn: () => api.get('/sport/strength-progress').then(r => r.data),
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Statistiques</h1>
          <p className="page-sub">Des repères construits uniquement à partir de tes séances enregistrées.</p>
        </div>
      </div>
      {sessionsQuery.isError && <p className="feedback-error" role="alert">L’historique sportif n’a pas pu être chargé. <button type="button" onClick={() => sessionsQuery.refetch()}>Réessayer</button></p>}

      {/* ── Chiffres clés ── */}
      <div className="stat-row" style={{ marginBottom: 24 }}>
        <div className="stat-card accent">
          <div className="stat-val">{sessionsQuery.isPending ? '…' : thisMonthSessions.length}</div>
          <div className="stat-lbl">Séances ce mois</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{sessionsQuery.isPending ? '…' : thisWeek}</div>
          <div className="stat-lbl">Séances cette semaine</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{sessionsQuery.isPending ? '…' : sessions.length}</div>
          <div className="stat-lbl">Séances totales</div>
        </div>
      </div>

      <div className="cols-2">
        {/* ── Répartition par groupe musculaire ce mois ── */}
        <div>
          <p className="section-head">Répartition ce mois</p>
          <div className="card">
            {Object.keys(TYPE_LABELS).filter(k => byType[k] > 0).length === 0 && !sessionsQuery.isPending && !sessionsQuery.isError && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune séance enregistrée ce mois.</p>
            )}
            {Object.entries(TYPE_LABELS)
              .filter(([k]) => byType[k] > 0)
              .sort(([a], [b]) => (byType[b] ?? 0) - (byType[a] ?? 0))
              .map(([key, { label, color }]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{byType[key] ?? 0}</span>
                  </div>
                  <MiniBar value={byType[key] ?? 0} max={maxByType} color={color} />
                </div>
              ))}
          </div>
        </div>

        {/* ── Activité 8 dernières semaines ── */}
        <div>
          <p className="section-head">Activité — 8 semaines</p>
          <div className="card">
            {sessionsQuery.isPending ? <p role="status">Chargement de l’historique…</p> : null}
            {!sessionsQuery.isPending && !sessionsQuery.isError && sessions.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune séance enregistrée pour le moment.</p>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {last8Weeks.map((w) => {
                const pct = maxWeek > 0 ? (w.count / maxWeek) * 100 : 0;
                const date = new Date(w.week + 'T00:00:00');
                return (
                  <div key={w.week} aria-label={`${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} : ${w.count} séance${w.count === 1 ? '' : 's'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: w.count > 0 ? 600 : 400 }}>{w.count}</span>
                    <div style={{
                      width: '100%', borderRadius: 4,
                      height: `${w.count ? Math.max(pct, 4) : 0}%`,
                      background: w.current ? 'var(--accent)' : 'var(--border-md)',
                      minHeight: 4,
                      transition: 'height .4s ease',
                    }} />
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                      {date.getDate()}/{MONTH_NAMES[date.getMonth()]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Progression des charges ── */}
      <p className="section-head" style={{ marginTop: 24 }}>Progression des charges</p>
      <p className="page-sub">Charge maximale d’une série réellement renseignée, par date. Les charges de référence du programme ne sont pas incluses.</p>
      {strengthData.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 16px', textAlign: 'center' }}>
          <i className="ti ti-chart-line" style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: .4 }} />
          Les graphiques apparaîtront dès que tu auras loggé un même exercice sur plusieurs séances.
        </div>
      ) : (
        <>
          {/* Sélecteur d'exercice */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {strengthData.map(ex => (
              <button
                key={ex.name}
                onClick={() => setSelectedExercise(ex.name === selectedExercise ? null : ex.name)}
                style={{
                  background: selectedExercise === ex.name ? 'var(--accent-bg)' : 'var(--border)',
                  border: selectedExercise === ex.name ? '1px solid var(--accent-dark)' : '1px solid transparent',
                  borderRadius: 7,
                  padding: '5px 12px',
                  fontSize: 12,
                  color: selectedExercise === ex.name ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {ex.name}
                <span style={{ marginLeft: 6, fontSize: 10, opacity: .6 }}>{ex.data.length} pts</span>
              </button>
            ))}
          </div>
          {/* Graphe */}
          {(selectedExercise
            ? strengthData.filter(ex => ex.name === selectedExercise)
            : strengthData.slice(0, 4)
          ).map(ex => (
            <div key={ex.name} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{ex.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ex.data.length} séances</span>
              </div>
              <StrengthChart data={ex.data} />
            </div>
          ))}
          {!selectedExercise && strengthData.length > 4 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
              Clique sur un exercice ci-dessus pour le voir en détail · {strengthData.length} exercices trackés au total
            </p>
          )}
        </>
      )}
    </div>
  );
}
