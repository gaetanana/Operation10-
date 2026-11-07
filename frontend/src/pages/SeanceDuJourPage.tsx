import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { TYPE_CONFIG, ExForm, ExerciseRow } from './SportPage';
import { getLocalDateString } from '../utils/date';

type DraftEx = any & { _id: string };

export default function SeanceDuJourPage() {
  const today = getLocalDateString();
  const [searchParams] = useSearchParams();
  const requestedTemplate = searchParams.get('template');
  const initializedTemplate = useRef<string | null>(null);
  const qc = useQueryClient();
  const idRef = useRef(0);
  const newId = () => `d${idRef.current++}`;

  const [type, setType] = useState('pecs_triceps');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<DraftEx[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/sport/templates').then(r => r.data),
  });

  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.other;

  // Choix d'un contrat ou d'un type → pré-remplit + importe les exercices du contrat
  const pick = (value: string) => {
    if (value.startsWith('c:')) {
      const tpl = (templates as any[]).find((t: any) => t.id === value.slice(2));
      if (!tpl) return;
      setTemplateId(tpl.id);
      setType(tpl.type);
      setName(tpl.name);
      setDurationMinutes(tpl.durationMinutes ?? 60);
      setExercises((tpl.templateExercises ?? []).map((e: any) => ({
        _id: newId(),
        name: e.name, sets: e.sets ?? null, reps: e.reps ?? null, weight: e.weight ?? null,
        restSeconds: e.restSeconds ?? null, durationSeconds: e.durationSeconds ?? null,
        distanceKm: e.distanceKm ?? null, avgSpeedKmh: e.avgSpeedKmh ?? null, notes: e.notes ?? null,
      })));
    } else {
      setTemplateId(null);
      setType(value.slice(2));
    }
  };

  useEffect(() => {
    if (!requestedTemplate || initializedTemplate.current === requestedTemplate) return;
    if (!(templates as any[]).some(t => t.id === requestedTemplate)) return;
    initializedTemplate.current = requestedTemplate;
    pick(`c:${requestedTemplate}`);
  }, [requestedTemplate, templates]);

  const addEx = (data: any) => { setExercises(xs => [...xs, { ...data, _id: newId() }]); setShowAdd(false); };
  const updateEx = (id: string, data: any) => setExercises(xs => xs.map(x => x._id === id ? { ...x, ...data, _id: id } : x));
  const deleteEx = (id: string) => setExercises(xs => xs.filter(x => x._id !== id));

  const reset = () => {
    setTemplateId(null); setType('pecs_triceps'); setName(''); setDurationMinutes(60);
    setNotes(''); setExercises([]); setShowAdd(false);
  };

  const validate = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sport/sessions', {
        name: name.trim() || cfg.label, type, date: today,
        durationMinutes, notes: notes.trim() || undefined, templateId: templateId || undefined,
      });
      const sid = res.data.id;
      for (const ex of exercises) {
        await api.post(`/sport/sessions/${sid}/exercises`, {
          name: ex.name, sets: ex.sets ?? null, reps: ex.reps ?? null, weight: ex.weight ?? null,
          restSeconds: ex.restSeconds ?? null, durationSeconds: ex.durationSeconds ?? null,
          distanceKm: ex.distanceKm ?? null, avgSpeedKmh: ex.avgSpeedKmh ?? null, notes: ex.notes ?? null,
        });
      }
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sport-stats'] });
      reset();
      alert('Séance enregistrée ✅');
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Échec de l\'enregistrement.'),
  });

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page sdj">
      <div className="page-header">
        <div>
          <h1 className="page-title">Séance du jour</h1>
          <p className="page-sub" style={{ textTransform: 'capitalize' }}>{dateLabel}</p>
        </div>
      </div>

      {/* Choix de la séance */}
      <div className="card sdj-card">
        <label htmlFor="session-choice" className="sdj-label">Quelle séance aujourd'hui ?</label>
        <select
          id="session-choice"
          className="food-input sdj-select"
          value={templateId ? `c:${templateId}` : `t:${type}`}
          onChange={e => pick(e.target.value)}
        >
          {templates.length > 0 && (
            <optgroup label="Mes contrats">
              {(templates as any[]).map((t: any) => (
                <option key={t.id} value={`c:${t.id}`}>{t.name} (×{t.weeklyTarget ?? 1}/sem)</option>
              ))}
            </optgroup>
          )}
          <optgroup label="Type libre (hors contrat)">
            {Object.entries(TYPE_CONFIG).map(([v, { label }]) => <option key={v} value={`t:${v}`}>{label}</option>)}
          </optgroup>
        </select>

        <div className="sdj-meta">
          <div className={`sess-icon ${cfg.color}`}><i className={`ti ${cfg.icon}`} /></div>
          <input aria-label="Nom de la séance" className="food-input" placeholder="Nom de la séance" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
          <input className="food-input" type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} style={{ width: 80 }} title="Durée (min)" />
        </div>
      </div>

      {/* Exercices (adaptables) */}
      <p className="section-head">Exercices {exercises.length > 0 && `· ${exercises.length}`}</p>
      <div className="card">
        {exercises.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Choisis un contrat pour importer ses exercices, ou ajoute-les un par un.</p>}
        {exercises.map((ex, i) => (
          <div key={ex._id}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Exercice {i + 1}</div>
            <ExerciseRow ex={ex} sessionType={type} onUpdate={d => updateEx(ex._id, d)} onDelete={() => deleteEx(ex._id)} />
          </div>
        ))}

        <div style={{ marginTop: 10 }}>
          {showAdd ? (
            <ExForm sessionType={type} onSave={addEx} onCancel={() => setShowAdd(false)} />
          ) : (
            <button className="sdj-addbtn" onClick={() => setShowAdd(true)}>
              <i className="ti ti-plus" /> Ajouter un {type === 'cardio' ? 'effort cardio' : 'exercice'}
            </button>
          )}
        </div>
      </div>

      {/* Notes + validation */}
      <input className="food-input" placeholder="Notes (optionnel)" value={notes} onChange={e => setNotes(e.target.value)} style={{ marginTop: 14, marginBottom: 14 }} />

      <button className="sdj-validate" onClick={() => validate.mutate()} disabled={validate.isPending}>
        {validate.isPending
          ? <><i className="ti ti-loader-2 spin" /> Enregistrement…</>
          : <><i className="ti ti-circle-check" /> Valider la séance</>}
      </button>
      <p className="sdj-hint">La séance sera enregistrée à la date d'aujourd'hui et apparaîtra dans ta vue semaine et tes stats.</p>
    </div>
  );
}
