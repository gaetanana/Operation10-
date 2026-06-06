import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const today = new Date().toISOString().split('T')[0];

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

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// ─── Helpers date ─────────────────────────────────────────────────────────────

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

function weekLabel(monday: Date): string {
  const now = new Date();
  const thisMonday = getMondayOf(now);
  if (monday.getTime() === thisMonday.getTime()) return 'Cette semaine';
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  if (monday.getTime() === lastMonday.getTime()) return 'Semaine dernière';
  return `Semaine du ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}

function groupByWeek(sessions: any[]): { monday: Date; label: string; days: { date: string; label: string; sessions: any[] }[] }[] {
  const weekMap = new Map<string, { monday: Date; label: string; dayMap: Map<string, any[]> }>();
  for (const s of sessions) {
    const monday = getMondayOf(new Date(s.date + 'T00:00:00'));
    const wKey = monday.toISOString();
    if (!weekMap.has(wKey)) weekMap.set(wKey, { monday, label: weekLabel(monday), dayMap: new Map() });
    const { dayMap } = weekMap.get(wKey)!;
    if (!dayMap.has(s.date)) dayMap.set(s.date, []);
    dayMap.get(s.date)!.push(s);
  }
  return Array.from(weekMap.values())
    .sort((a, b) => b.monday.getTime() - a.monday.getTime())
    .map(({ monday, label, dayMap }) => ({
      monday,
      label,
      days: Array.from(dayMap.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, sessions]) => ({
          date,
          label: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
          sessions,
        })),
    }));
}

const CARDIO_TYPES = new Set(['cardio']);

function isCardioType(type: string) { return CARDIO_TYPES.has(type); }

function fmtDuration(seconds: number) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min${s.toString().padStart(2, '0')}s` : `${m}min`;
}

function calcSpeed(distanceKm: number, durationSeconds: number): number {
  return Math.round((distanceKm / (durationSeconds / 3600)) * 10) / 10;
}

function fmtEx(ex: any, sessionType?: string) {
  const parts: string[] = [];
  if (isCardioType(sessionType ?? '')) {
    // Mode cardio
    if (ex.distanceKm) parts.push(`${ex.distanceKm} km`);
    if (ex.durationSeconds) parts.push(fmtDuration(ex.durationSeconds));
    if (ex.avgSpeedKmh) {
      parts.push(`${ex.avgSpeedKmh} km/h`);
    } else if (ex.distanceKm && ex.durationSeconds) {
      parts.push(`${calcSpeed(ex.distanceKm, ex.durationSeconds)} km/h moy.`);
    }
  } else {
    // Mode muscu
    if (ex.sets && ex.reps) parts.push(`${ex.sets}×${ex.reps}`);
    if (ex.weight) parts.push(`${ex.weight} kg`);
    if (ex.restSeconds) parts.push(`repos ${ex.restSeconds >= 60 ? Math.round(ex.restSeconds / 60) + 'min' : ex.restSeconds + 's'}`);
    if (ex.durationSeconds) parts.push(fmtDuration(ex.durationSeconds));
  }
  if (ex.notes) parts.push(ex.notes);
  return parts.join(' · ');
}

// ─── Formulaire exercice réutilisable ─────────────────────────────────────────

function ExForm({
  initial, onSave, onCancel, saveLabel = 'Ajouter', sessionType = '',
}: {
  initial?: any;
  onSave: (data: any) => void;
  onCancel?: () => void;
  saveLabel?: string;
  sessionType?: string;
}) {
  const cardio = isCardioType(sessionType);
  const emptyMuscu = { name: '', sets: '', reps: '', weight: '', restSeconds: '', notes: '' };
  const emptyCardio = { name: '', distanceKm: '', durationMin: '', durationSec: '', avgSpeedKmh: '', notes: '' };

  const [fm, setFm] = useState(initial ? {
    name: initial.name ?? '',
    sets: initial.sets ?? '',
    reps: initial.reps ?? '',
    weight: initial.weight ?? '',
    restSeconds: initial.restSeconds ?? '',
    notes: initial.notes ?? '',
  } : emptyMuscu);

  const [fc, setFc] = useState(initial ? {
    name: initial.name ?? '',
    distanceKm: initial.distanceKm ?? '',
    durationMin: initial.durationSeconds ? String(Math.floor(initial.durationSeconds / 60)) : '',
    durationSec: initial.durationSeconds ? String(initial.durationSeconds % 60) : '',
    avgSpeedKmh: initial.avgSpeedKmh ?? '',
    notes: initial.notes ?? '',
  } : emptyCardio);

  const num = (v: any) => v !== '' && v != null ? Number(v) : null;
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box' as const };
  const lbl = (t: string) => <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' as const }}>{t}</div>;

  const handleSave = () => {
    if (cardio) {
      if (!fc.name.trim()) return;
      const totalSec = (num(fc.durationMin) ?? 0) * 60 + (num(fc.durationSec) ?? 0);
      const dist = num(fc.distanceKm);
      // Calcul vitesse automatique si non renseignée
      const speed = fc.avgSpeedKmh !== '' ? num(fc.avgSpeedKmh) : (dist && totalSec > 0 ? calcSpeed(dist, totalSec) : null);
      onSave({ name: fc.name, distanceKm: dist, durationSeconds: totalSec > 0 ? totalSec : null, avgSpeedKmh: speed, notes: fc.notes || null });
      if (!initial) setFc(emptyCardio);
    } else {
      if (!fm.name.trim()) return;
      onSave({ name: fm.name, sets: num(fm.sets), reps: num(fm.reps), weight: num(fm.weight), restSeconds: num(fm.restSeconds), notes: fm.notes || null });
      if (!initial) setFm(emptyMuscu);
    }
  };

  // Calcul vitesse en temps réel pour cardio
  const distVal = num(fc.distanceKm);
  const totalSec = (num(fc.durationMin) ?? 0) * 60 + (num(fc.durationSec) ?? 0);
  const autoSpeed = distVal && totalSec > 0 && !fc.avgSpeedKmh ? calcSpeed(distVal, totalSec) : null;

  return (
    <div style={{ background: 'var(--bg-main)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
      <input
        className="food-input"
        placeholder={cardio ? 'Type de sortie (ex : Course à pied, Vélo…)' : "Nom de l'exercice"}
        value={cardio ? fc.name : fm.name}
        onChange={e => cardio ? setFc(p => ({ ...p, name: e.target.value })) : setFm(p => ({ ...p, name: e.target.value }))}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        style={{ ...inp, marginBottom: 8 }}
      />

      {cardio ? (
        <>
          {/* Distance + Durée */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 20px 1fr', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <div>{lbl('Distance (km)')}<input className="food-input" type="number" step="0.1" placeholder="8.5" value={fc.distanceKm} onChange={e => setFc(p => ({ ...p, distanceKm: e.target.value }))} style={inp} /></div>
            <div>{lbl('Durée — min')}<input className="food-input" type="number" placeholder="42" value={fc.durationMin} onChange={e => setFc(p => ({ ...p, durationMin: e.target.value }))} style={inp} /></div>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, paddingBottom: 11, textAlign: 'center' }}>:</span>
            <div>{lbl('sec')}<input className="food-input" type="number" placeholder="30" min="0" max="59" value={fc.durationSec} onChange={e => setFc(p => ({ ...p, durationSec: e.target.value }))} style={inp} /></div>
          </div>
          {/* Vitesse */}
          <div style={{ marginBottom: 8 }}>
            {lbl('Vitesse moy. km/h')}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="food-input" type="number" step="0.1" placeholder={autoSpeed ? String(autoSpeed) : '12.0'} value={fc.avgSpeedKmh} onChange={e => setFc(p => ({ ...p, avgSpeedKmh: e.target.value }))} style={{ ...inp, flex: 1 }} />
              {autoSpeed && !fc.avgSpeedKmh && (
                <span style={{ fontSize: 12, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                  <i className="ti ti-calculator" style={{ marginRight: 4 }} />{autoSpeed} km/h calculés
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Séries × Reps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <div>{lbl('Séries')}<input className="food-input" type="number" placeholder="4" value={fm.sets} onChange={e => setFm(p => ({ ...p, sets: e.target.value }))} style={inp} /></div>
            <span style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', paddingBottom: 11, userSelect: 'none' as const }}>×</span>
            <div>{lbl('Reps')}<input className="food-input" type="number" placeholder="8" value={fm.reps} onChange={e => setFm(p => ({ ...p, reps: e.target.value }))} style={inp} /></div>
          </div>
          {/* Poids · Repos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>{lbl('Poids (kg)')}<input className="food-input" type="number" placeholder="30" value={fm.weight} onChange={e => setFm(p => ({ ...p, weight: e.target.value }))} style={inp} /></div>
            <div>{lbl('Repos (s)')}<input className="food-input" type="number" placeholder="120" value={fm.restSeconds} onChange={e => setFm(p => ({ ...p, restSeconds: e.target.value }))} style={inp} /></div>
          </div>
        </>
      )}

      <input className="food-input" placeholder="Notes (optionnel)" value={cardio ? fc.notes : fm.notes} onChange={e => cardio ? setFc(p => ({ ...p, notes: e.target.value })) : setFm(p => ({ ...p, notes: e.target.value }))} style={{ ...inp, marginBottom: 8 }} />

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="food-btn" style={{ fontSize: 12, padding: '5px 16px' }} onClick={handleSave} disabled={cardio ? !fc.name.trim() : !fm.name.trim()}>
          <i className="ti ti-check" style={{ marginRight: 5 }} />{saveLabel}
        </button>
        {onCancel && (
          <button className="food-btn" style={{ fontSize: 12, padding: '5px 14px', background: 'var(--border)', color: 'var(--text-muted)' }} onClick={onCancel}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Ligne exercice avec édition inline ───────────────────────────────────────

function ExerciseRow({ ex, onUpdate, onDelete, sessionType = '' }: { ex: any; onUpdate: (data: any) => void; onDelete: () => void; sessionType?: string }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ExForm
        initial={ex}
        saveLabel="Sauvegarder"
        sessionType={sessionType}
        onSave={data => { onUpdate(data); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const meta = fmtEx(ex, sessionType);
  return (
    <div className="exercise-row">
      <div className="ex-dot" />
      <div className="ex-info">
        <span className="ex-name">{ex.name}</span>
        {meta && <span className="ex-meta">{meta}</span>}
      </div>
      <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px' }}>
        <i className="ti ti-pencil" />
      </button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px' }}>
        <i className="ti ti-x" />
      </button>
    </div>
  );
}

// ─── Carte contrat (template) dépliable ───────────────────────────────────────

function TemplateCard({ t, onDelete }: { t: any; onDelete: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editHeader, setEditHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({ name: t.name, durationMinutes: t.durationMinutes ?? 60, description: t.description ?? '' });
  const cfg = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.other;

  const updateTemplate = useMutation({
    mutationFn: (data: any) => api.patch(`/sport/templates/${t.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setEditHeader(false); },
  });

  const addEx = useMutation({
    mutationFn: (data: any) => api.post(`/sport/templates/${t.id}/exercises`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const updateEx = useMutation({
    mutationFn: ({ exId, data }: { exId: string; data: any }) => api.patch(`/sport/templates/${t.id}/exercises/${exId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const deleteEx = useMutation({
    mutationFn: (exId: string) => api.delete(`/sport/templates/${t.id}/exercises/${exId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const exercises: any[] = t.templateExercises ?? [];

  return (
    <div className="session-card" style={{ marginBottom: 8 }}>
      <div className="session-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div className={`sess-icon ${cfg.color}`} style={{ flexShrink: 0 }}>
            <i className={`ti ${cfg.icon}`} />
          </div>
          {editHeader ? (
            <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="food-input" value={headerForm.name} onChange={e => setHeaderForm(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, minWidth: 120 }} />
              <input className="food-input" type="number" placeholder="Durée min" value={headerForm.durationMinutes} onChange={e => setHeaderForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} style={{ width: 90 }} />
              <input className="food-input" placeholder="Description" value={headerForm.description} onChange={e => setHeaderForm(p => ({ ...p, description: e.target.value }))} style={{ flex: 1, minWidth: 120 }} />
              <button className="food-btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => updateTemplate.mutate(headerForm)}>OK</button>
              <button className="food-btn" style={{ fontSize: 12, padding: '5px 10px', background: 'var(--border)', color: 'var(--text-muted)' }} onClick={() => setEditHeader(false)}>✕</button>
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sess-name">{t.name}</div>
              <div className="sess-meta">
                {t.dayOfWeek >= 0 ? DAY_NAMES[t.dayOfWeek] + ' · ' : 'Quotidien · '}
                {t.durationMinutes} min
                {exercises.length > 0 ? ` · ${exercises.length} exercice${exercises.length > 1 ? 's' : ''}` : ''}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span className="pill pill-green" style={{ fontSize: 11 }}>Contrat</span>
          <button onClick={() => setEditHeader(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }} title="Modifier">
            <i className="ti ti-pencil" />
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }} title="Supprimer ce contrat">
            <i className="ti ti-trash" />
          </button>
          <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }} title={open ? 'Replier' : 'Déplier'}>
            <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
          </button>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingLeft: 46 }}>
          {exercises.map((ex: any, i: number) => (
            <div key={ex.id}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
                Exercice {i + 1}
              </div>
              <ExerciseRow
                ex={ex}
                sessionType={t.type}
                onUpdate={data => updateEx.mutate({ exId: ex.id, data })}
                onDelete={() => deleteEx.mutate(ex.id)}
              />
            </div>
          ))}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
              + Exercice {exercises.length + 1}
            </div>
            <ExForm onSave={data => addEx.mutate(data)} sessionType={t.type} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Carte séance réalisée ─────────────────────────────────────────────────────

function SessionCard({ s }: { s: any }) {
  const qc = useQueryClient();
  const [editHeader, setEditHeader] = useState(false);
  const [showExForm, setShowExForm] = useState(false);
  const [headerForm, setHeaderForm] = useState({ name: s.name, type: s.type, durationMinutes: s.durationMinutes ?? 60, notes: s.notes ?? '', date: s.date });
  const cfg = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.other;

  const updateSession = useMutation({
    mutationFn: (data: any) => api.patch(`/sport/sessions/${s.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); setEditHeader(false); },
  });

  const removeSession = useMutation({
    mutationFn: () => api.delete(`/sport/sessions/${s.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sport-stats'] });
    },
  });

  const addEx = useMutation({
    mutationFn: (data: any) => api.post(`/sport/sessions/${s.id}/exercises`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const updateEx = useMutation({
    mutationFn: ({ exId, data }: { exId: string; data: any }) => api.patch(`/sport/exercises/${exId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const deleteEx = useMutation({
    mutationFn: (exId: string) => api.delete(`/sport/exercises/${exId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const exercises: any[] = s.exercises ?? [];

  return (
    <div className="session-card">
      <div className="session-card-header">
        {editHeader ? (
          <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="food-input" value={headerForm.name} onChange={e => setHeaderForm(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, minWidth: 130 }} placeholder="Nom" />
            <select className="food-input" value={headerForm.type} onChange={e => setHeaderForm(p => ({ ...p, type: e.target.value }))} style={{ width: 160, cursor: 'pointer' }}>
              {Object.entries(TYPE_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <input className="food-input" type="number" value={headerForm.durationMinutes} onChange={e => setHeaderForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} style={{ width: 85 }} placeholder="min" />
            <input className="food-input" type="date" value={headerForm.date} onChange={e => setHeaderForm(p => ({ ...p, date: e.target.value }))} style={{ width: 140 }} />
            <input className="food-input" value={headerForm.notes} onChange={e => setHeaderForm(p => ({ ...p, notes: e.target.value }))} style={{ flex: 1, minWidth: 130 }} placeholder="Notes" />
            <button className="food-btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => updateSession.mutate(headerForm)}>OK</button>
            <button className="food-btn" style={{ fontSize: 12, padding: '5px 10px', background: 'var(--border)', color: 'var(--text-muted)' }} onClick={() => setEditHeader(false)}>✕</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={`sess-icon ${cfg.color}`}>
                <i className={`ti ${cfg.icon}`} />
              </div>
              <div>
                <div className="sess-name">{s.name}</div>
                <div className="sess-meta">
                  {new Date(s.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                  {exercises.length > 0 ? ` · ${exercises.length} exercice${exercises.length > 1 ? 's' : ''}` : ''}
                  {s.notes ? ` · ${s.notes}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="pill pill-green" style={{ fontSize: 11 }}>{cfg.label}</span>
              <button onClick={() => setEditHeader(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }} title="Modifier la séance">
                <i className="ti ti-pencil" />
              </button>
              <button onClick={() => removeSession.mutate()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}>
                <i className="ti ti-x" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Exercices */}
      {exercises.length > 0 && (
        <div style={{ marginTop: 12, paddingLeft: 46 }}>
          {exercises.map((ex: any, i: number) => (
            <div key={ex.id}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
                Exercice {i + 1}
              </div>
              <ExerciseRow
                ex={ex}
                sessionType={s.type}
                onUpdate={data => updateEx.mutate({ exId: ex.id, data })}
                onDelete={() => deleteEx.mutate(ex.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bouton toggle + formulaire ajout */}
      <div style={{ marginTop: 10, paddingLeft: 46 }}>
        <button
          onClick={() => setShowExForm(v => !v)}
          style={{ background: 'none', border: '0.5px dashed var(--border-md)', borderRadius: 7, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: '6px 14px', width: '100%', textAlign: 'left' }}
        >
          <i className={`ti ${showExForm ? 'ti-chevron-up' : 'ti-plus'}`} style={{ marginRight: 6 }} />
          {showExForm
            ? 'Masquer'
            : `Ajouter un ${isCardioType(s.type) ? 'effort cardio' : 'exercice'}${exercises.length > 0 ? ` · ${exercises.length} déjà enregistré${exercises.length > 1 ? 's' : ''}` : ''}`
          }
          {!showExForm && (
            <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)', background: 'var(--border)', borderRadius: 4, padding: '2px 6px' }}>
              {isCardioType(s.type) ? 'Mode cardio' : 'Mode muscu'}
            </span>
          )}
        </button>
        {showExForm && (
          <div style={{ marginTop: 8 }}>
            <ExForm onSave={data => addEx.mutate(data)} onCancel={() => setShowExForm(false)} sessionType={s.type} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bandeau suivi contrat de la semaine ─────────────────────────────────────

// Jours du contrat = templates avec dayOfWeek >= 0, indexés par jour
// On compare avec les séances réalisées cette semaine par type

function WeekTracker({ templates, sessions }: { templates: any[]; sessions: any[] }) {
  const now = new Date();
  const monday = getMondayOf(now);
  const todayDow = (now.getDay() + 6) % 7; // 0=lun, 6=dim

  // Séances réalisées cette semaine, indexées par jour de la semaine
  const weekSessions = sessions.filter((s: any) => isSameWeek(s.date, monday));

  // Pour chaque séance, on récupère son jour de la semaine (0=lun)
  const sessionsByDow = new Map<number, Set<string>>();
  for (const s of weekSessions) {
    const dow = (new Date(s.date + 'T00:00:00').getDay() + 6) % 7;
    if (!sessionsByDow.has(dow)) sessionsByDow.set(dow, new Set());
    sessionsByDow.get(dow)!.add(s.type);
  }

  // Templates planifiés (hors quotidien dayOfWeek=-1)
  const scheduled = templates.filter((t: any) => t.dayOfWeek >= 0);

  if (scheduled.length === 0) return null;

  // isDone = le bon TYPE a été fait le BON JOUR
  const isDoneTemplate = (t: any) => sessionsByDow.get(t.dayOfWeek)?.has(t.type) ?? false;

  // Calcul du score : jours passés respectés
  const pastScheduled = scheduled.filter((t: any) => t.dayOfWeek <= todayDow);
  const doneCount = pastScheduled.filter(isDoneTemplate).length;

  return (
    <div className="card" style={{ marginBottom: 4, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Contrat cette semaine
        </span>
        <span style={{ fontSize: 12, color: doneCount === pastScheduled.length && pastScheduled.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {doneCount} / {pastScheduled.length} jour{pastScheduled.length > 1 ? 's' : ''} réalisé{doneCount > 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {DAY_NAMES.map((day, dow) => {
          const tpl = scheduled.find((t: any) => t.dayOfWeek === dow);
          const isPast = dow <= todayDow;
          const isToday = dow === todayDow;
          const isDone = tpl ? isDoneTemplate(tpl) : false;
          const cfg = tpl ? (TYPE_CONFIG[tpl.type] ?? TYPE_CONFIG.other) : null;

          let bg = 'var(--border)';
          let color = 'var(--text-muted)';
          let icon = '';

          if (!tpl) {
            // Repos
            bg = 'var(--bg-main)';
            color = 'var(--text-muted)';
          } else if (isDone) {
            bg = 'var(--accent-bg)';
            color = 'var(--accent)';
            icon = '✓';
          } else if (isPast) {
            bg = '#1a0a0a';
            color = '#ff6060';
            icon = '✗';
          } else {
            bg = 'var(--border)';
            color = 'var(--text-muted)';
          }

          return (
            <div key={dow} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: bg, borderRadius: 8, padding: '8px 10px', minWidth: 52,
              border: isToday ? '1px solid var(--border-md)' : '1px solid transparent',
              flex: 1,
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: isToday ? 'var(--text-secondary)' : color, textTransform: 'uppercase' }}>{day}</span>
              {cfg ? (
                <>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 14, color }} />
                  <span style={{ fontSize: 9, color, textAlign: 'center', lineHeight: 1.2 }}>{icon || cfg.label.split(' / ')[0]}</span>
                </>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SportPage() {
  const qc = useQueryClient();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ name: '', type: 'pecs_triceps', durationMinutes: 60, notes: '', date: today });
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'pecs_triceps', dayOfWeek: 0, durationMinutes: 60, description: '' });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/sport/templates').then(r => r.data),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sport/sessions').then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['sport-stats'],
    queryFn: () => api.get('/sport/stats').then(r => r.data),
  });

  // Crée la séance puis importe les exercices du contrat correspondant
  const addSession = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/sport/sessions', data);
      const newSession = res.data;
      // Trouver le template correspondant au type
      const tpl = (templates as any[]).find((t: any) => t.type === data.type);
      if (tpl && tpl.templateExercises?.length > 0) {
        for (const ex of tpl.templateExercises) {
          await api.post(`/sport/sessions/${newSession.id}/exercises`, {
            name: ex.name,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            weight: ex.weight ?? null,
            restSeconds: ex.restSeconds ?? null,
            durationSeconds: ex.durationSeconds ?? null,
            notes: ex.notes ?? null,
          });
        }
      }
      return newSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sport-stats'] });
      setShowSessionForm(false);
      setSessionForm({ name: '', type: 'pecs_triceps', durationMinutes: 60, notes: '', date: today });
    },
  });

  const addTemplate = useMutation({
    mutationFn: (data: any) => api.post('/sport/templates', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setShowTemplateForm(false);
      setTemplateForm({ name: '', type: 'pecs_triceps', dayOfWeek: 0, durationMinutes: 60, description: '' });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => api.delete(`/sport/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const thisWeek = sessions.filter((s: any) => {
    const d = new Date(s.date);
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return d >= monday;
  });

  return (
    <div className="page" style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sport</h1>
          <p className="page-sub">{stats?.thisMonth ?? 0} séances ce mois · {thisWeek.length} cette semaine</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="food-btn" style={{ background: 'var(--border)', color: 'var(--text-muted)' }} onClick={() => { setShowTemplateForm(v => !v); setShowSessionForm(false); }}>
            <i className="ti ti-plus" style={{ marginRight: 6 }} />
            Nouveau contrat
          </button>
          <button className="food-btn" onClick={() => { setShowSessionForm(v => !v); setShowTemplateForm(false); }}>
            <i className="ti ti-plus" style={{ marginRight: 6 }} />
            Logger une séance
          </button>
        </div>
      </div>

      {/* Formulaire nouvelle séance */}
      {showSessionForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="section-head" style={{ marginTop: 0 }}>Nouvelle séance</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input className="food-input" placeholder="Nom de la séance" value={sessionForm.name}
              onChange={e => setSessionForm(f => ({ ...f, name: e.target.value }))} />
            <select className="food-input" value={sessionForm.type}
              onChange={e => {
                const tpl = (templates as any[]).find((t: any) => t.type === e.target.value);
                setSessionForm(f => ({ ...f, type: e.target.value, name: f.name || (tpl?.name ?? ''), durationMinutes: tpl?.durationMinutes ?? f.durationMinutes }));
              }}
              style={{ cursor: 'pointer' }}>
              {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <input className="food-input" type="date" value={sessionForm.date}
              onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} />
            <input className="food-input" type="number" placeholder="Durée (min)" value={sessionForm.durationMinutes}
              onChange={e => setSessionForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            <input className="food-input" placeholder="Notes (optionnel)" value={sessionForm.notes}
              onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
              style={{ gridColumn: 'span 4' }} />
          </div>
          {(() => {
            const tpl = (templates as any[]).find((t: any) => t.type === sessionForm.type);
            return tpl?.templateExercises?.length > 0 ? (
              <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10 }}>
                <i className="ti ti-copy" style={{ marginRight: 5 }} />
                {tpl.templateExercises.length} exercice{tpl.templateExercises.length > 1 ? 's' : ''} du contrat "{tpl.name}" seront importés automatiquement.
              </p>
            ) : null;
          })()}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="food-btn" onClick={() => addSession.mutate(sessionForm)} disabled={addSession.isPending}>
              {addSession.isPending ? 'Création…' : 'Enregistrer'}
            </button>
            <button className="food-btn" style={{ background: 'var(--border)', color: 'var(--text-muted)' }} onClick={() => setShowSessionForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Formulaire nouveau contrat */}
      {showTemplateForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="section-head" style={{ marginTop: 0 }}>Nouveau contrat</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input className="food-input" placeholder="Nom (ex : Pecs / Triceps)" value={templateForm.name}
              onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
            <select className="food-input" value={templateForm.type} onChange={e => setTemplateForm(f => ({ ...f, type: e.target.value }))} style={{ cursor: 'pointer' }}>
              {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <select className="food-input" value={templateForm.dayOfWeek} onChange={e => setTemplateForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))} style={{ cursor: 'pointer' }}>
              {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              <option value={-1}>Quotidien</option>
            </select>
            <input className="food-input" type="number" placeholder="Durée (min)" value={templateForm.durationMinutes}
              onChange={e => setTemplateForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            <input className="food-input" placeholder="Description (optionnel)" value={templateForm.description}
              onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))}
              style={{ gridColumn: 'span 4' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="food-btn" onClick={() => addTemplate.mutate(templateForm)} disabled={!templateForm.name.trim()}>Créer</button>
            <button className="food-btn" style={{ background: 'var(--border)', color: 'var(--text-muted)' }} onClick={() => setShowTemplateForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Layout pleine largeur : contrat gauche (fixe) + séances droite (flex) */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ width: 340, flexShrink: 0 }}>
          <p className="section-head">Contrat hebdo</p>
          {templates.map((t: any) => (
            <TemplateCard key={t.id} t={t} onDelete={() => deleteTemplate.mutate(t.id)} />
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="section-head">Séances réalisées</p>

          {/* ── Bandeau suivi contrat de la semaine ── */}
          <WeekTracker templates={templates} sessions={sessions} />

          {sessions.length === 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune séance enregistrée.</p>
            </div>
          )}

          {/* ── Sessions groupées par semaine puis par jour ── */}
          {groupByWeek(sessions).map(({ monday, label, days }) => {
            const totalSessions = days.reduce((n, d) => n + d.sessions.length, 0);
            return (
            <div key={monday.toISOString()} style={{ marginTop: 16 }}>
              {/* Header semaine */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--border)', borderRadius: 99, padding: '1px 8px' }}>
                  {totalSessions} séance{totalSessions > 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {/* Jours */}
              {days.map(({ date, label: dayLabel, sessions: daySessions }) => (
                <div key={date} style={{ marginBottom: 12 }}>
                  {/* Header jour */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {dayLabel}
                    </span>
                    {daySessions.length > 1 && (
                      <span style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 99, padding: '1px 8px' }}>
                        {daySessions.length} séances
                      </span>
                    )}
                  </div>
                  {/* Si plusieurs séances ce jour : grille 2 colonnes, sinon pleine largeur */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: daySessions.length > 1 ? 'repeat(auto-fit, minmax(360px, 1fr))' : '1fr',
                    gap: 10,
                  }}>
                    {daySessions.map((s: any) => <SessionCard key={s.id} s={s} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
          )}
        </div>
      </div>
    </div>
  );
}
