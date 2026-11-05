import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const today = new Date().toISOString().split('T')[0];

export const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
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

function addDaysD(d: Date, n: number): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + n);
  return x;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameWeek(dateStr: string, monday: Date): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const end = new Date(monday);
  end.setDate(monday.getDate() + 7);
  return d >= monday && d < end;
}

function weekLabel(monday: Date): string {
  const thisMonday = getMondayOf(new Date());
  if (monday.getTime() === thisMonday.getTime()) return 'Cette semaine';
  const lastMonday = addDaysD(thisMonday, -7);
  if (monday.getTime() === lastMonday.getTime()) return 'Semaine dernière';
  const nextMonday = addDaysD(thisMonday, 7);
  if (monday.getTime() === nextMonday.getTime()) return 'Semaine prochaine';
  const end = addDaysD(monday, 6);
  return `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

// Numéro de semaine ISO 8601
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Libellé pour l'export : « Semaine N · du lundi … au dimanche … »
function weekExportLabel(monday: Date): string {
  const sunday = addDaysD(monday, 6);
  const fmt = (x: Date) => x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `Semaine ${isoWeek(monday)} · du ${fmt(monday)} au ${fmt(sunday)}`;
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
    if (ex.distanceKm) parts.push(`${ex.distanceKm} km`);
    if (ex.durationSeconds) parts.push(fmtDuration(ex.durationSeconds));
    if (ex.avgSpeedKmh) parts.push(`${ex.avgSpeedKmh} km/h`);
    else if (ex.distanceKm && ex.durationSeconds) parts.push(`${calcSpeed(ex.distanceKm, ex.durationSeconds)} km/h moy.`);
  } else {
    if (ex.sets && ex.reps) parts.push(`${ex.sets}×${ex.reps}`);
    if (ex.weight) parts.push(`${ex.weight} kg`);
    if (ex.restSeconds) parts.push(`repos ${ex.restSeconds >= 60 ? Math.round(ex.restSeconds / 60) + 'min' : ex.restSeconds + 's'}`);
    if (ex.durationSeconds) parts.push(fmtDuration(ex.durationSeconds));
  }
  if (ex.notes) parts.push(ex.notes);
  return parts.join(' · ');
}

// ─── Formulaire exercice réutilisable ─────────────────────────────────────────

export function ExForm({
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
      const speed = fc.avgSpeedKmh !== '' ? num(fc.avgSpeedKmh) : (dist && totalSec > 0 ? calcSpeed(dist, totalSec) : null);
      onSave({ name: fc.name, distanceKm: dist, durationSeconds: totalSec > 0 ? totalSec : null, avgSpeedKmh: speed, notes: fc.notes || null });
      if (!initial) setFc(emptyCardio);
    } else {
      if (!fm.name.trim()) return;
      onSave({ name: fm.name, sets: num(fm.sets), reps: num(fm.reps), weight: num(fm.weight), restSeconds: num(fm.restSeconds), notes: fm.notes || null });
      if (!initial) setFm(emptyMuscu);
    }
  };

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 20px 1fr', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <div>{lbl('Distance (km)')}<input className="food-input" type="number" step="0.1" placeholder="8.5" value={fc.distanceKm} onChange={e => setFc(p => ({ ...p, distanceKm: e.target.value }))} style={inp} /></div>
            <div>{lbl('Durée — min')}<input className="food-input" type="number" placeholder="42" value={fc.durationMin} onChange={e => setFc(p => ({ ...p, durationMin: e.target.value }))} style={inp} /></div>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, paddingBottom: 11, textAlign: 'center' }}>:</span>
            <div>{lbl('sec')}<input className="food-input" type="number" placeholder="30" min="0" max="59" value={fc.durationSec} onChange={e => setFc(p => ({ ...p, durationSec: e.target.value }))} style={inp} /></div>
          </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <div>{lbl('Séries')}<input className="food-input" type="number" placeholder="4" value={fm.sets} onChange={e => setFm(p => ({ ...p, sets: e.target.value }))} style={inp} /></div>
            <span style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', paddingBottom: 11, userSelect: 'none' as const }}>×</span>
            <div>{lbl('Reps')}<input className="food-input" type="number" placeholder="8" value={fm.reps} onChange={e => setFm(p => ({ ...p, reps: e.target.value }))} style={inp} /></div>
          </div>
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

export function ExerciseRow({ ex, onUpdate, onDelete, sessionType = '' }: { ex: any; onUpdate: (data: any) => void; onDelete: () => void; sessionType?: string }) {
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

// ─── Carte contrat (template) — objectif ×N / semaine ─────────────────────────

function TemplateCard({ t, onDelete }: { t: any; onDelete: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editHeader, setEditHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    name: t.name,
    weeklyTarget: t.weeklyTarget ?? 1,
    durationMinutes: t.durationMinutes ?? 60,
    description: t.description ?? '',
  });
  const cfg = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.other;

  const updateTemplate = useMutation({
    mutationFn: (data: any) => api.patch(`/sport/templates/${t.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setEditHeader(false); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Échec de la modification du contrat.'),
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
  const target = t.weeklyTarget ?? 1;

  return (
    <div className="session-card" style={{ marginBottom: 8 }}>
      <div className="session-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div className={`sess-icon ${cfg.color}`} style={{ flexShrink: 0 }}>
            <i className={`ti ${cfg.icon}`} />
          </div>
          {editHeader ? (
            <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="food-input" value={headerForm.name} onChange={e => setHeaderForm(p => ({ ...p, name: e.target.value }))} style={{ flex: 1, minWidth: 110 }} />
              <input className="food-input" type="number" min={1} max={14} title="× / semaine" value={headerForm.weeklyTarget} onChange={e => setHeaderForm(p => ({ ...p, weeklyTarget: Number(e.target.value) }))} style={{ width: 64 }} />
              <input className="food-input" type="number" placeholder="min" value={headerForm.durationMinutes} onChange={e => setHeaderForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} style={{ width: 72 }} />
              <button className="food-btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => updateTemplate.mutate(headerForm)}>OK</button>
              <button className="food-btn" style={{ fontSize: 12, padding: '5px 10px', background: 'var(--border)', color: 'var(--text-muted)' }} onClick={() => setEditHeader(false)}>✕</button>
            </div>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sess-name">{t.name}</div>
              <div className="sess-meta">
                <b style={{ color: 'var(--accent)' }}>×{target}</b> / sem · {t.durationMinutes} min
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

// ─── Carte séance réalisée (détail / édition) ─────────────────────────────────

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

// ─── Attribution d'une séance au bon contrat ──────────────────────────────────
// 1) contrat explicitement choisi (templateId) · 2) seul contrat de ce type ·
// 3) plusieurs contrats du même type → meilleure correspondance de nom.
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
  return best; // null si aucun mot commun (ambigu → non crédité)
}

// ─── Suivi du contrat : objectif ×N par semaine (jours libres) ────────────────

function WeekTracker({ templates, weekSessions }: { templates: any[]; weekSessions: any[] }) {
  if (!templates.length) return null;

  const doneByTpl = new Map<string, number>();
  for (const s of weekSessions) {
    const id = attributeContract(s, templates);
    if (id) doneByTpl.set(id, (doneByTpl.get(id) ?? 0) + 1);
  }

  const rows = templates.map((t: any) => {
    const target = t.weeklyTarget ?? 1;
    const done = doneByTpl.get(t.id) ?? 0;
    return { t, target, done, ok: done >= target };
  });
  const totalTarget = rows.reduce((n, r) => n + r.target, 0);
  const totalDone = rows.reduce((n, r) => n + Math.min(r.done, r.target), 0);
  const allOk = rows.every(r => r.ok);

  return (
    <div className="card wk-track">
      <div className="wk-track-head">
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Contrat de la semaine</span>
        <span className={`wk-score${allOk && totalTarget > 0 ? ' ok' : ''}`}>{totalDone} / {totalTarget} séances</span>
      </div>
      <div className="wk-rows">
        {rows.map(({ t, target, done, ok }) => {
          const cfg = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.other;
          return (
            <div className="wk-row" key={t.id}>
              <span className={`wk-ic ${cfg.color}`}><i className={`ti ${cfg.icon}`} /></span>
              <span className="wk-name">{t.name}</span>
              <span className="wk-dots">
                {Array.from({ length: target }).map((_, i) => (
                  <span key={i} className={`wk-dot${i < done ? ' on' : ''}`} />
                ))}
                {done > target && <span className="wk-extra">+{done - target}</span>}
              </span>
              <span className={`wk-count${ok ? ' ok' : ''}`}>{done}/{target}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pastille séance compacte (vue semaine) ───────────────────────────────────

function SessionChip({ s, selected, onClick }: { s: any; selected: boolean; onClick: () => void }) {
  const cfg = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.other;
  const exCount = s.exercises?.length ?? 0;
  return (
    <button className={`sess-chip${selected ? ' sel' : ''}`} onClick={onClick}>
      <span className={`chip-ic ${cfg.color}`}><i className={`ti ${cfg.icon}`} /></span>
      <span className="chip-body">
        <span className="chip-name">{s.name}</span>
        <span className="chip-meta">
          {s.durationMinutes ? `${s.durationMinutes}min` : ''}{exCount ? `${s.durationMinutes ? ' · ' : ''}${exCount} ex` : ''}
        </span>
      </span>
    </button>
  );
}

// ─── Export PDF (vrai fichier, via jsPDF chargé en CDN) ────────────────────────

let jspdfPromise: Promise<any> | null = null;
function loadJsPDF(): Promise<any> {
  const w = window as any;
  if (w.jspdf?.jsPDF) return Promise.resolve(w.jspdf.jsPDF);
  if (!jspdfPromise) {
    jspdfPromise = new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      sc.onload = () => resolve((window as any).jspdf.jsPDF);
      sc.onerror = () => reject(new Error('Chargement de jsPDF impossible (vérifie ta connexion).'));
      document.head.appendChild(sc);
    });
  }
  return jspdfPromise;
}

// jsPDF (polices standard) gère le Latin-1 : on remplace les caractères hors jeu
function clean(s: any): string {
  return String(s ?? '')
    .replace(/[—–]/g, '-')
    .replace(/[•·]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[→←⬅➜]/g, '->');
}

async function exportWeekPDF(label: string, filename: string, days: { label: string; sessions: any[] }[]) {
  try {
    const JsPDF = await loadJsPDF();
    const doc = new JsPDF({ unit: 'pt', format: 'a4' });
    const left = 48;
    const right = doc.internal.pageSize.getWidth() - 48;
    const pageH = doc.internal.pageSize.getHeight();
    let y = 50;
    const ensure = (h: number) => { if (y + h > pageH - 48) { doc.addPage(); y = 50; } };

    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(20);
    doc.text('Seances de sport - Operation10', left, y); y += 18;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(110);
    doc.text(clean(label), left, y); y += 22; doc.setTextColor(20);

    const withSessions = days.filter(d => d.sessions.length);
    if (withSessions.length === 0) {
      doc.setFontSize(12); doc.text('Aucune seance cette semaine.', left, y);
      doc.save(filename); return;
    }

    for (const d of withSessions) {
      ensure(30);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5);
      const dl = clean(d.label); doc.text(dl.charAt(0).toUpperCase() + dl.slice(1), left, y); y += 6;
      doc.setDrawColor(205); doc.line(left, y, right, y); y += 15;

      for (const s of d.sessions) {
        const cfg = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.other;
        ensure(20);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text(clean(`${s.name} - ${cfg.label}${s.durationMinutes ? ` (${s.durationMinutes} min)` : ''}`), left, y); y += 14;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);

        if (s.notes) {
          doc.setTextColor(110);
          const lines = doc.splitTextToSize(clean(s.notes), right - left - 10);
          ensure(lines.length * 12);
          doc.text(lines, left + 10, y); y += lines.length * 12; doc.setTextColor(20);
        }

        const exs = s.exercises ?? [];
        if (exs.length === 0) {
          ensure(13); doc.setTextColor(150);
          doc.text('- aucun exercice detaille -', left + 10, y); y += 13; doc.setTextColor(20);
        }
        for (const ex of exs) {
          ensure(13);
          doc.text(clean(`- ${ex.name}`), left + 10, y);
          const meta = fmtEx(ex, s.type);
          if (meta) doc.text(clean(meta), 300, y);
          y += 13;
        }
        y += 5;
      }
      y += 8;
    }

    doc.save(filename);
  } catch (e: any) {
    alert(e?.message ?? 'Export PDF impossible.');
  }
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SportPage() {
  const qc = useQueryClient();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [sessionForm, setSessionForm] = useState<{ name: string; type: string; templateId: string | null; durationMinutes: number; notes: string; date: string }>({ name: '', type: 'pecs_triceps', templateId: null, durationMinutes: 60, notes: '', date: today });
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'pecs_triceps', weeklyTarget: 1, durationMinutes: 60, description: '' });

  const [weekMonday, setWeekMonday] = useState<Date>(() => getMondayOf(new Date()));
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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

  const addSession = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/sport/sessions', {
        name: data.name, type: data.type, date: data.date,
        durationMinutes: data.durationMinutes, notes: data.notes || undefined,
        templateId: data.templateId || undefined,
      });
      const newSession = res.data;
      // Import des exercices du contrat CHOISI (par id), pas par type
      const tpl = (templates as any[]).find((t: any) => t.id === data.templateId);
      if (tpl && tpl.templateExercises?.length > 0) {
        for (const ex of tpl.templateExercises) {
          await api.post(`/sport/sessions/${newSession.id}/exercises`, {
            name: ex.name, sets: ex.sets ?? null, reps: ex.reps ?? null, weight: ex.weight ?? null,
            restSeconds: ex.restSeconds ?? null, durationSeconds: ex.durationSeconds ?? null, notes: ex.notes ?? null,
          });
        }
      }
      return newSession;
    },
    onSuccess: (newSession: any) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sport-stats'] });
      setShowSessionForm(false);
      if (newSession?.date) setWeekMonday(getMondayOf(new Date(newSession.date + 'T00:00:00')));
      if (newSession?.id) setSelectedSessionId(newSession.id);
      setSessionForm({ name: '', type: 'pecs_triceps', templateId: null, durationMinutes: 60, notes: '', date: today });
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Échec de l\'enregistrement de la séance.'),
  });

  const addTemplate = useMutation({
    // dayOfWeek: 0 envoyé pour compat (anciens backends qui l'exigeaient encore)
    mutationFn: (data: any) => api.post('/sport/templates', { dayOfWeek: 0, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setShowTemplateForm(false);
      setTemplateForm({ name: '', type: 'pecs_triceps', weeklyTarget: 1, durationMinutes: 60, description: '' });
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Échec de la création du contrat.'),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => api.delete(`/sport/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  // ── Données de la semaine sélectionnée ──
  const weekSessions = (sessions as any[]).filter((s: any) => isSameWeek(s.date, weekMonday));
  const days = Array.from({ length: 7 }).map((_, dow) => {
    const dDate = addDaysD(weekMonday, dow);
    const date = ymd(dDate);
    return {
      dow, date,
      short: DAY_NAMES[dow],
      num: dDate.getDate(),
      isToday: date === today,
      label: dDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
      sessions: weekSessions.filter((s: any) => s.date === date),
    };
  });
  const detailSession = (sessions as any[]).find((s: any) => s.id === selectedSessionId) ?? null;

  const openFormForDate = (date: string) => {
    setSessionForm(f => ({ ...f, date }));
    setShowSessionForm(true);
    setShowTemplateForm(false);
  };

  const thisWeekCount = (sessions as any[]).filter((s: any) => isSameWeek(s.date, getMondayOf(new Date()))).length;

  return (
    <div className="page" style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sport</h1>
          <p className="page-sub">{stats?.thisMonth ?? 0} séances ce mois · {thisWeekCount} cette semaine</p>
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
            <select className="food-input"
              value={sessionForm.templateId ? `c:${sessionForm.templateId}` : `t:${sessionForm.type}`}
              onChange={e => {
                const v = e.target.value;
                if (v.startsWith('c:')) {
                  const tpl = (templates as any[]).find((t: any) => t.id === v.slice(2));
                  if (tpl) setSessionForm(f => ({ ...f, templateId: tpl.id, type: tpl.type, name: f.name || tpl.name, durationMinutes: tpl.durationMinutes ?? f.durationMinutes }));
                } else {
                  setSessionForm(f => ({ ...f, templateId: null, type: v.slice(2) }));
                }
              }}
              style={{ cursor: 'pointer' }}>
              {templates.length > 0 && (
                <optgroup label="Mes contrats">
                  {(templates as any[]).map((t: any) => (
                    <option key={t.id} value={`c:${t.id}`}>{t.name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Type générique (sans contrat)">
                {Object.entries(TYPE_CONFIG).map(([v, { label }]) => <option key={v} value={`t:${v}`}>{label}</option>)}
              </optgroup>
            </select>
            <input className="food-input" type="date" value={sessionForm.date}
              onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} />
            <input className="food-input" type="number" placeholder="Durée (min)" value={sessionForm.durationMinutes}
              onChange={e => setSessionForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            <input className="food-input" placeholder="Notes (optionnel)" value={sessionForm.notes}
              onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} style={{ gridColumn: 'span 4' }} />
          </div>
          {(() => {
            const tpl = sessionForm.templateId ? (templates as any[]).find((t: any) => t.id === sessionForm.templateId) : null;
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
              {Object.entries(TYPE_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
            </select>
            <div>
              <input className="food-input" type="number" min={1} max={14} placeholder="× / semaine" value={templateForm.weeklyTarget}
                onChange={e => setTemplateForm(f => ({ ...f, weeklyTarget: Number(e.target.value) }))} style={{ width: '100%' }} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>séances / semaine</div>
            </div>
            <input className="food-input" type="number" placeholder="Durée (min)" value={templateForm.durationMinutes}
              onChange={e => setTemplateForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
            <input className="food-input" placeholder="Description (optionnel)" value={templateForm.description}
              onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} style={{ gridColumn: 'span 4' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="food-btn" onClick={() => addTemplate.mutate(templateForm)} disabled={!templateForm.name.trim()}>Créer</button>
            <button className="food-btn" style={{ background: 'var(--border)', color: 'var(--text-muted)' }} onClick={() => setShowTemplateForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Layout : contrats à gauche, semaine à droite */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ width: 320, flexShrink: 0 }}>
          <p className="section-head">Contrats hebdo</p>
          {templates.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun contrat. Crée-en un pour fixer tes objectifs.</p>}
          {templates.map((t: any) => (
            <TemplateCard key={t.id} t={t} onDelete={() => deleteTemplate.mutate(t.id)} />
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Navigation semaine + export */}
          <div className="week-nav">
            <button className="wk-arrow" onClick={() => setWeekMonday(m => addDaysD(m, -7))} title="Semaine précédente"><i className="ti ti-chevron-left" /></button>
            <div className="wk-title">
              <span>{weekLabel(weekMonday)}</span>
              <span className="wk-range">{weekSessions.length} séance{weekSessions.length > 1 ? 's' : ''}</span>
            </div>
            <button className="wk-arrow" onClick={() => setWeekMonday(m => addDaysD(m, 7))} title="Semaine suivante"><i className="ti ti-chevron-right" /></button>
            {weekMonday.getTime() !== getMondayOf(new Date()).getTime() && (
              <button className="wk-today" onClick={() => setWeekMonday(getMondayOf(new Date()))}>Aujourd'hui</button>
            )}
            <button className="wk-export" onClick={() => exportWeekPDF(weekExportLabel(weekMonday), `operation10-semaine-${isoWeek(weekMonday)}.pdf`, days)} title="Exporter la semaine en PDF">
              <i className="ti ti-file-export" /> Exporter PDF
            </button>
          </div>

          {/* Suivi du contrat (×N) */}
          <WeekTracker templates={templates} weekSessions={weekSessions} />

          {/* Grille 7 jours */}
          <div className="week-grid">
            {days.map(d => (
              <div className={`day-col${d.isToday ? ' today' : ''}`} key={d.dow}>
                <div className="day-col-head">
                  <span>{d.short} {d.num}</span>
                  <button className="day-add" title="Logger une séance ce jour" onClick={() => openFormForDate(d.date)}><i className="ti ti-plus" /></button>
                </div>
                {d.sessions.length === 0 && <div className="day-empty">—</div>}
                {d.sessions.map((s: any) => (
                  <SessionChip key={s.id} s={s} selected={s.id === selectedSessionId} onClick={() => setSelectedSessionId(s.id)} />
                ))}
              </div>
            ))}
          </div>

          {/* Détail de la séance sélectionnée */}
          <div className="week-detail">
            {detailSession ? (
              <SessionCard key={detailSession.id} s={detailSession} />
            ) : (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '22px' }}>
                <i className="ti ti-hand-click" style={{ fontSize: 22, display: 'block', marginBottom: 6, color: 'var(--border-md)' }} />
                Sélectionne une séance ci-dessus pour voir le détail, ajouter des exercices ou la modifier.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
