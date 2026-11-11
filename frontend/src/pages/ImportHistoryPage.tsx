import { ChangeEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { apiError } from '../services/training';

interface HistoryBundle {
  sourceHash: string;
  sessions: {
    name: string;
    type: string;
    date: string;
    durationMinutes?: number;
    notes?: string;
    exercises?: {
      name: string;
      performedSets?: { reps: number; weight?: number }[];
      durationSeconds?: number;
      distanceKm?: number;
      avgSpeedKmh?: number;
      notes?: string;
    }[];
  }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isHistoryBundle(value: unknown): value is HistoryBundle {
  if (!isRecord(value) || typeof value.sourceHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(value.sourceHash) || !Array.isArray(value.sessions) ||
      value.sessions.length < 1 || value.sessions.length > 50) return false;
  return value.sessions.every(session => isRecord(session) &&
    typeof session.name === 'string' && session.name.length > 0 &&
    typeof session.type === 'string' &&
    typeof session.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(session.date) &&
    (session.exercises === undefined || Array.isArray(session.exercises) && session.exercises.every(ex =>
      isRecord(ex) && typeof ex.name === 'string' && ex.name.length > 0 &&
      (ex.performedSets === undefined || Array.isArray(ex.performedSets) && ex.performedSets.every(set =>
        isRecord(set) && Number.isInteger(set.reps) && Number(set.reps) > 0 &&
        (set.weight === undefined || Number.isFinite(set.weight) && Number(set.weight) >= 0))))));
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ImportHistoryPage() {
  const [fileName, setFileName] = useState('');
  const [bundle, setBundle] = useState<HistoryBundle | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.post<{ imported: number; duplicate: boolean }>('/sport/sessions/import', bundle),
    onSuccess: async () => {
      await Promise.all(['sessions', 'sport-stats', 'strength-progress'].map(key =>
        queryClient.invalidateQueries({ queryKey: [key] })));
    },
  });

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setBundle(null);
    setFileName('');
    setError('');
    mutation.reset();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 2_000_000) {
      setError('Choisis le fichier JSON d’historique préparé pour cette application (2 Mo maximum).');
      event.target.value = '';
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isHistoryBundle(parsed)) throw new Error('Le fichier ne contient pas un historique valide.');
      setBundle(parsed);
      setFileName(file.name);
    } catch (reason) {
      setError(reason instanceof Error && reason.message !== 'Unexpected end of JSON input'
        ? reason.message : 'Le fichier est illisible ou son contenu JSON est invalide.');
      event.target.value = '';
    }
  };
  const dates = bundle?.sessions.map(session => session.date).sort();
  const message = mutation.isError ? apiError(mutation.error, 'Import impossible. Aucune séance n’a été ajoutée ; réessaie.') : '';

  return (
    <div className="training-page history-import-page">
      <header className="training-heading">
        <div><Link className="back-link" to="/?view=history"><i className="ti ti-arrow-left" aria-hidden="true" /> Historique</Link>
          <p className="kicker" style={{ marginTop: 24 }}>IMPORT PONCTUEL · HISTORIQUE SPORTIF</p>
          <h1>Rassembler ton parcours<span>.</span></h1>
        </div>
      </header>
      <section className="import-history-panel">
        <div className="history-import-icon"><i className="ti ti-file-import" aria-hidden="true" /></div>
        <h2>Ajouter tes anciennes séances</h2>
        <p>Choisis le fichier JSON préparé à partir de ton carnet. Les séances seront ajoutées à l’historique, sans modifier ton programme ni remplacer tes données.</p>
        <label className="history-file-picker">
          <i className="ti ti-upload" aria-hidden="true" />
          <span>{fileName || 'Choisir le fichier d’historique (.json)'}</span>
          <input type="file" accept=".json,application/json" onChange={event => void chooseFile(event)} />
        </label>
        {error && <p className="training-error" role="alert">{error}</p>}
        {bundle && dates && (
          <div className="history-import-preview" aria-live="polite">
            <p className="kicker">APERÇU · AUCUNE DONNÉE ENCORE ENREGISTRÉE</p>
            <div className="import-summary">
              <div><strong>{bundle.sessions.length}</strong><span>séances</span></div>
              <div><strong>{bundle.sessions.reduce((n, s) => n + (s.exercises?.length ?? 0), 0)}</strong><span>exercices</span></div>
              <div><strong>{bundle.sessions.reduce((n, s) => n + (s.exercises ?? []).reduce((m, e) => m + (e.performedSets?.length ?? 0), 0), 0)}</strong><span>séries renseignées</span></div>
            </div>
            <p className="import-date-range">Du {formatDate(dates[0])} au {formatDate(dates[dates.length - 1])}</p>
            <p className="import-idempotent-note"><i className="ti ti-shield-check" aria-hidden="true" /> Cet import est ajouté une seule fois. Le relancer ne créera pas de doublons.</p>
            {mutation.isError && <p className="training-error" role="alert">{message}</p>}
            {mutation.isSuccess && mutation.data.data.duplicate
              ? <div className="training-notice" role="status"><i className="ti ti-circle-check" aria-hidden="true" />Cet historique a déjà été importé : aucune nouvelle séance créée.</div>
              : mutation.isSuccess
                ? <div className="training-notice" role="status"><i className="ti ti-circle-check" aria-hidden="true" />{mutation.data.data.imported} séances ajoutées à ton historique.</div>
                : <button className="button button-primary import-confirm-button" disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}>{mutation.isPending ? 'Ajout en cours…' : `Ajouter les ${bundle.sessions.length} séances à mon historique`} <i className="ti ti-arrow-right" aria-hidden="true" /></button>}
          </div>
        )}
      </section>
    </div>
  );
}
