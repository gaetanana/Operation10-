import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '../services/api';

interface ProgramTemplate {
  name: string;
  type: string;
  dayOfWeek: number;
  weeklyTarget: number;
  description: string;
  exercises: { name: string; weight?: number; sets?: number; reps?: number; notes?: string }[];
}

export default function ProgramImport() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const reference = useQuery({
    queryKey: ['reference-program'],
    enabled: open,
    queryFn: () => api.get<ProgramTemplate[]>('/sport/reference-program').then(r => r.data),
  });
  const mutation = useMutation({
    mutationFn: () => api.post('/sport/templates/import', { templates: reference.data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
  const message = mutation.error instanceof AxiosError ? mutation.error.response?.data?.message : undefined;

  return (
    <section className="program-import card">
      <div className="panel-heading">
        <h2>Ton programme de quatre jours</h2>
        <button type="button" className="secondary-action" aria-expanded={open}
          onClick={() => setOpen(v => !v)}>{open ? 'Masquer l’aperçu' : 'Voir avant d’importer'}</button>
      </div>
      <p className="panel-description">Pecs, dos, jambes, épaules et bras. Import facultatif : aucun contrat existant ne sera remplacé.</p>
      {open && (
        <>
          {reference.isPending && <p role="status">Chargement de ton programme…</p>}
          {reference.isError && <div className="feedback-error" role="alert">Le programme n’a pas pu être chargé.
            <button type="button" onClick={() => reference.refetch()}>Réessayer</button>
          </div>}
          {reference.data && <>
            <p className="set-hint">Les charges sont des références. Seul le DC a un objectif de séries défini. Les finishers restent intégrés ; les informations manquantes sont indiquées dans les notes.</p>
            <div className="import-grid">
              {reference.data.map(t => (
                <article key={t.name}>
                  <h3>{t.name}</h3>
                  <ul>{t.exercises.map(e => (
                    <li key={e.name}><strong>{e.name}</strong>
                      {e.weight !== undefined && <span> · {e.weight} kg de référence</span>}
                      {e.sets && <span> · objectif {e.sets} × {e.reps}</span>}
                      {e.notes && <small>{e.notes}</small>}
                    </li>
                  ))}</ul>
                </article>
              ))}
            </div>
            {!mutation.isSuccess && <label className="import-confirm">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              Ajouter ces quatre contrats à mon programme, sans enregistrer de séance réalisée.
            </label>}
            {mutation.isError && <p className="feedback-error" role="alert">{typeof message === 'string' ? message : 'Import impossible. Vérifie la connexion et réessaie.'}</p>}
            {mutation.isSuccess ? <p role="status">Les quatre contrats sont ajoutés. Retrouve-les dans ton programme.</p>
              : <button className="primary-action" disabled={!confirmed || mutation.isPending}
                onClick={() => mutation.mutate()}>{mutation.isPending ? 'Import en cours…' : 'Confirmer l’import'}</button>}
          </>}
        </>
      )}
    </section>
  );
}
