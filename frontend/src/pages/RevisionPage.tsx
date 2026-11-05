import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Markdown from '../components/Markdown';
import { getTrainer } from '../components/trainers';

type Subject = { id: string; name: string; icon: string; color: string; trainerKey: string | null };
type Sheet = { id: string; title: string; content: string; subjectId: string; updatedAt: string };
type Card = {
  id: string; question: string; answer: string; subjectId: string;
  repetitions: number; easeFactor: number; intervalDays: number; dueDate: string;
};

type Tab = 'sheets' | 'review' | 'train';

// Boutons d'évaluation SM-2
const GRADES = [
  { grade: 0, label: 'À revoir', sub: 'Oublié',   cls: 'grade-again' },
  { grade: 3, label: 'Difficile', sub: '+1 j',     cls: 'grade-hard'  },
  { grade: 4, label: 'Correct',   sub: 'Bien',     cls: 'grade-good'  },
  { grade: 5, label: 'Facile',    sub: 'Acquis',   cls: 'grade-easy'  },
];

export default function RevisionPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('sheets');
  const [subjectId, setSubjectId] = useState<string>('');
  const [showGen, setShowGen] = useState(false);

  // ─── Données ──────────────────────────────────────────────────────────────────
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['rev-subjects'],
    queryFn: () => api.get('/revision/subjects').then(r => r.data),
  });

  // Matière active : la sélection, sinon la première
  const activeId = subjectId || subjects[0]?.id || '';
  const activeSubject = subjects.find(s => s.id === activeId) || null;
  const Trainer = getTrainer(activeSubject?.trainerKey);

  // Si on quitte vers une matière sans entraîneur, on sort de l'onglet
  useEffect(() => {
    if (tab === 'train' && !Trainer) setTab('sheets');
  }, [activeId, Trainer, tab]);

  const { data: sheets = [] } = useQuery<Sheet[]>({
    queryKey: ['rev-sheets', activeId],
    queryFn: () => api.get(`/revision/sheets?subjectId=${activeId}`).then(r => r.data),
    enabled: !!activeId,
  });

  const { data: dueCards = [] } = useQuery<Card[]>({
    queryKey: ['rev-due', activeId],
    queryFn: () => api.get(`/revision/flashcards/due?subjectId=${activeId}`).then(r => r.data),
    enabled: !!activeId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['rev-subjects'] });
    qc.invalidateQueries({ queryKey: ['rev-sheets'] });
    qc.invalidateQueries({ queryKey: ['rev-due'] });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Révisions</h1>
          <p className="page-sub">
            {subjects.length} matière{subjects.length > 1 ? 's' : ''} · {dueCards.length} carte{dueCards.length > 1 ? 's' : ''} à réviser aujourd'hui
          </p>
        </div>
        <button className="gen-open-btn" onClick={() => setShowGen(true)}>
          <i className="ti ti-sparkles" /> Générer
        </button>
      </div>

      {/* Sélecteur de matière */}
      {subjects.length > 0 && (
        <div className="subj-bar">
          {subjects.map(s => (
            <button
              key={s.id}
              className={`subj-chip${s.id === activeId ? ' active' : ''}`}
              style={s.id === activeId ? { borderColor: s.color, color: s.color } : undefined}
              onClick={() => setSubjectId(s.id)}
            >
              <i className={`ti ${s.icon || 'ti-book'}`} />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div className="rev-tabs">
        <button className={`rev-tab${tab === 'sheets' ? ' active' : ''}`} onClick={() => setTab('sheets')}>
          <i className="ti ti-file-text" /> Fiches
        </button>
        <button className={`rev-tab${tab === 'review' ? ' active' : ''}`} onClick={() => setTab('review')}>
          <i className="ti ti-cards" /> Réviser
          {dueCards.length > 0 && <span className="rev-badge">{dueCards.length}</span>}
        </button>
        {Trainer && (
          <button className={`rev-tab${tab === 'train' ? ' active' : ''}`} onClick={() => setTab('train')}>
            <i className="ti ti-target-arrow" /> Entraînement
          </button>
        )}
      </div>

      {tab === 'sheets' && <SheetsTab sheets={sheets} hasSubject={!!activeId} onChange={refresh} />}
      {tab === 'review' && <ReviewTab cards={dueCards} hasSubject={!!activeId} subjectId={activeId} onDone={refresh} />}
      {tab === 'train'  && Trainer && <Trainer />}

      {showGen && (
        <div className="modal-overlay" onClick={() => setShowGen(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span><i className="ti ti-sparkles" /> Générer avec l'IA</span>
              <button className="icon-btn" onClick={() => setShowGen(false)}><i className="ti ti-x" /></button>
            </div>
            <GenerateTab
              subjects={subjects}
              activeId={activeId}
              onDone={() => { refresh(); setShowGen(false); setTab('sheets'); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onglet Fiches ──────────────────────────────────────────────────────────────
function SheetsTab({ sheets, hasSubject, onChange }: { sheets: Sheet[]; hasSubject: boolean; onChange: () => void }) {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/revision/sheets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rev-sheets'] }); onChange(); },
  });

  const genCards = useMutation({
    mutationFn: (sheetId: string) => api.post(`/revision/sheets/${sheetId}/generate-cards`, { cardCount: 8 }).then(r => r.data),
    onSuccess: (cards: any[]) => {
      qc.invalidateQueries({ queryKey: ['rev-due'] });
      onChange();
      alert(`${cards.length} flashcard${cards.length > 1 ? 's' : ''} ajoutée${cards.length > 1 ? 's' : ''} à réviser.`);
    },
    onError: () => alert('La génération des cartes a échoué.'),
  });

  if (!hasSubject) return <Empty icon="ti-folder-open" text="Crée une matière en générant ta première fiche (bouton Générer)." />;
  if (sheets.length === 0) return <Empty icon="ti-file-text" text="Aucune fiche pour cette matière. Clique sur Générer." />;

  return (
    <div className="sheet-list">
      {sheets.map(s => {
        const open = openId === s.id;
        return (
          <div key={s.id} className="card sheet-card">
            <div className="sheet-head" onClick={() => setOpenId(open ? null : s.id)}>
              <i className={`ti ${open ? 'ti-chevron-down' : 'ti-chevron-right'}`} />
              <span className="sheet-title">{s.title}</span>
              <button
                className="icon-btn"
                title="Générer des flashcards depuis cette fiche"
                disabled={genCards.isPending}
                onClick={(e) => { e.stopPropagation(); genCards.mutate(s.id); }}
              >
                {genCards.isPending && genCards.variables === s.id
                  ? <i className="ti ti-loader-2 spin" />
                  : <i className="ti ti-cards" />}
              </button>
              <button
                className="icon-btn"
                title="Supprimer"
                onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer cette fiche ?')) remove.mutate(s.id); }}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
            {open && <div className="sheet-body md-paper"><Markdown content={s.content} /></div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Auto-évaluation de la réponse tapée ────────────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['le','la','les','un','une','de','des','du','et','en','a','au','aux','est','dans','sur','pour','par','ou','que','qui','se','ce','il','elle','d','l','the','to','of']);

// Verdict indicatif : 'ok' (probablement bon), 'mid' (presque), 'no' (à revoir)
function judge(user: string, expected: string): 'ok' | 'mid' | 'no' {
  const nu = normalize(user);
  const ne = normalize(expected);
  if (!nu) return 'no';
  if (nu === ne) return 'ok';
  const eTokens = ne.split(' ').filter(t => t.length > 1 && !STOP.has(t));
  if (eTokens.length === 0) return nu === ne ? 'ok' : 'no';
  const uTokens = new Set(nu.split(' '));
  const hit = eTokens.filter(t => uTokens.has(t)).length;
  const cov = hit / eTokens.length;
  if (ne.includes(nu) && nu.length >= 3 && cov >= 0.5) return 'ok';
  if (cov >= 0.7) return 'ok';
  if (cov >= 0.4) return 'mid';
  return 'no';
}

const VERDICT = {
  ok:  { head: '✓ Probablement correct', sug: 4 },
  mid: { head: '≈ Presque — compare bien', sug: 3 },
  no:  { head: '✗ À revoir', sug: 0 },
};

// ─── Onglet Réviser ─────────────────────────────────────────────────────────────
function ReviewTab({ cards, hasSubject, subjectId, onDone }: { cards: Card[]; hasSubject: boolean; subjectId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ ok: 0, again: 0 });

  // saisie de la réponse
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [userAns, setUserAns] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<'ok' | 'mid' | 'no' | null>(null);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);

  const review = useMutation({
    mutationFn: ({ id, grade }: { id: string; grade: number }) =>
      api.patch(`/revision/flashcards/${id}/review`, { grade }),
    // rafraîchit le compteur de cartes dues immédiatement (même si on quitte en cours de session)
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rev-due'] }),
  });

  const regen = useMutation({
    mutationFn: () => api.post(`/revision/subjects/${subjectId}/regenerate-cards`, { cardCount: 12 }).then(r => r.data),
    onSuccess: (cards: any[]) => {
      qc.invalidateQueries({ queryKey: ['rev-due'] });
      onDone();
      alert(`Paquet régénéré : ${cards.length} nouvelle${cards.length > 1 ? 's' : ''} carte${cards.length > 1 ? 's' : ''}.`);
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'La régénération a échoué.'),
  });

  const handleRegen = () => {
    if (confirm('Régénérer va SUPPRIMER les cartes actuelles de cette matière (et leur progression) et en recréer via l\'IA depuis les fiches. Continuer ?')) {
      regen.mutate();
    }
  };

  const RegenBtn = () => (
    <button className="rv-regen" onClick={handleRegen} disabled={regen.isPending}>
      {regen.isPending
        ? <><i className="ti ti-loader-2 spin" /> Régénération…</>
        : <><i className="ti ti-refresh" /> Régénérer le paquet (IA)</>}
    </button>
  );

  const resetCard = () => {
    setAnswer(''); setRevealed(false); setUserAns(null); setVerdict(null);
    setChecking(false); setNote(null); setAiUsed(false);
  };

  const start = () => {
    setQueue([...cards]);
    setIdx(0);
    setStats({ ok: 0, again: 0 });
    resetCard();
  };

  // Hybride : vérif locale d'abord, Claude en renfort si douteux/faux
  const check = async () => {
    if (revealed || checking || !queue) return;
    const card = queue[idx];
    const typed = answer.trim();
    if (!typed) { reveal(); return; }

    setUserAns(typed);
    const local = judge(typed, card.answer);

    if (local === 'ok') {
      // réponse clairement bonne → pas besoin d'appeler Claude (économie de tokens)
      setVerdict('ok');
      setRevealed(true);
      return;
    }

    // cas ambigu ou faux → on demande à Claude (rattrape les formulations différentes)
    setChecking(true);
    try {
      const { data } = await api.post(`/revision/flashcards/${card.id}/check`, { userAnswer: typed });
      setVerdict(data.verdict);
      setNote(data.note || null);
      setAiUsed(true);
    } catch {
      setVerdict(local); // repli sur le verdict local si l'IA échoue
    } finally {
      setChecking(false);
      setRevealed(true);
    }
  };

  const reveal = () => { // « je sèche »
    setUserAns(null);
    setVerdict('no');
    setRevealed(true);
  };

  const grade = (g: number) => {
    if (!queue) return;
    const card = queue[idx];
    review.mutate({ id: card.id, grade: g });

    const again = g < 3;
    setStats(s => ({ ok: s.ok + (again ? 0 : 1), again: s.again + (again ? 1 : 0) }));

    // Carte ratée → on la remet en fin de file pour la session
    const next = [...queue];
    if (again) next.push(card);

    if (idx + 1 >= next.length) {
      setQueue(null);
      qc.invalidateQueries({ queryKey: ['rev-due'] });
      onDone();
    } else {
      setQueue(next);
      setIdx(idx + 1);
      resetCard();
    }
  };

  if (!hasSubject) return <Empty icon="ti-cards" text="Aucune matière. Génère d'abord une fiche." />;

  // Écran de démarrage / fin
  if (!queue) {
    if (cards.length === 0) {
      return (
        <div className="card review-start">
          <i className="ti ti-circle-check rv-empty-ic" />
          <p className="review-start-txt">Rien à réviser pour le moment 🎉<br />Les cartes réapparaîtront selon le planning.</p>
          <RegenBtn />
        </div>
      );
    }
    return (
      <div className="card review-start">
        <div className="review-start-num">{cards.length}</div>
        <p className="review-start-txt">carte{cards.length > 1 ? 's' : ''} à réviser</p>
        <button className="food-btn big" onClick={start}>
          <i className="ti ti-player-play" /> Commencer la session
        </button>
        <RegenBtn />
      </div>
    );
  }

  const card = queue[idx];
  const remaining = queue.length - idx;
  const suggested = verdict ? VERDICT[verdict].sug : null;

  return (
    <div className="review-zone">
      <div className="review-progress">
        <span>{remaining} restante{remaining > 1 ? 's' : ''}</span>
        <span className="review-counts">
          <span className="cnt-ok"><i className="ti ti-check" /> {stats.ok}</span>
          <span className="cnt-again"><i className="ti ti-rotate" /> {stats.again}</span>
        </span>
      </div>

      <div className="rv-card">
        <span className="rv-label">Question</span>
        <div className="rv-question">{card.question}</div>

        {!revealed ? (
          checking ? (
            <div className="rv-checking"><i className="ti ti-loader-2 spin" /> Claude vérifie ta réponse…</div>
          ) : (
            <>
              <input
                className="rv-input"
                placeholder="Tape ta réponse…"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); check(); } }}
                autoFocus
              />
              <div className="rv-actions">
                <button className="rv-btn-primary" onClick={check}>Vérifier</button>
                <button className="rv-btn-sec" onClick={reveal}>Je sèche, montrer</button>
              </div>
            </>
          )
        ) : (
          <>
            {verdict && (
              <div className={`rv-verdict v-${verdict}`}>
                {VERDICT[verdict].head}
                {aiUsed && <span className="rv-ai"><i className="ti ti-sparkles" /> IA</span>}
              </div>
            )}
            {note && <div className="rv-note">{note}</div>}
            {userAns !== null && userAns !== '' && (
              <div className="rv-your"><span className="rv-mini">Ta réponse</span>{userAns}</div>
            )}
            <div className="rv-answer"><span className="rv-mini">Réponse attendue</span>{card.answer}</div>

            <div className="rv-grade-label">Comment l'as-tu su ?</div>
            <div className="grade-row">
              {GRADES.map(g => (
                <button
                  key={g.grade}
                  className={`grade-btn ${g.cls}${g.grade === suggested ? ' suggested' : ''}`}
                  onClick={() => grade(g.grade)}
                >
                  <span className="grade-label">{g.label}</span>
                  <span className="grade-sub">{g.sub}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Onglet Générer ─────────────────────────────────────────────────────────────
function GenerateTab({ subjects, activeId, onDone }: { subjects: Subject[]; activeId: string; onDone: () => void }) {
  const [mode, setMode] = useState<'existing' | 'new'>(subjects.length ? 'existing' : 'new');
  const [pickedSubject, setPickedSubject] = useState(activeId);
  const [newName, setNewName] = useState('');
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [cardCount, setCardCount] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const gen = useMutation({
    mutationFn: (body: any) => api.post('/revision/generate', body).then(r => r.data),
    onSuccess: () => { setTopic(''); setSourceText(''); onDone(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Erreur lors de la génération'),
  });

  const canSubmit = topic.trim() && (mode === 'existing' ? pickedSubject : newName.trim());

  const submit = () => {
    setError(null);
    const body: any = { topic: topic.trim(), cardCount };
    if (sourceText.trim()) body.sourceText = sourceText.trim();
    if (mode === 'existing') body.subjectId = pickedSubject || subjects[0]?.id;
    else body.subjectName = newName.trim();
    gen.mutate(body);
  };

  return (
    <div className="card gen-card">
      <div className="gen-row">
        <div className="gen-mode">
          <button className={`mode-btn${mode === 'existing' ? ' active' : ''}`} disabled={!subjects.length} onClick={() => setMode('existing')}>Matière existante</button>
          <button className={`mode-btn${mode === 'new' ? ' active' : ''}`} onClick={() => setMode('new')}>Nouvelle matière</button>
        </div>
      </div>

      {mode === 'existing' ? (
        <div className="field-block">
          <label>Matière</label>
          <select className="food-input" value={pickedSubject || subjects[0]?.id} onChange={e => setPickedSubject(e.target.value)}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      ) : (
        <div className="field-block">
          <label>Nom de la nouvelle matière</label>
          <input className="food-input" placeholder="ex : Linux, Réseaux…" value={newName} onChange={e => setNewName(e.target.value)} />
        </div>
      )}

      <div className="field-block">
        <label>Sujet de la fiche</label>
        <input className="food-input" placeholder="ex : la commande find et les redirections" value={topic} onChange={e => setTopic(e.target.value)} />
      </div>

      <div className="field-block">
        <label>Texte de cours <span className="opt">(optionnel — collé ici, l'IA s'appuiera dessus)</span></label>
        <textarea className="food-input gen-textarea" rows={6} placeholder="Colle tes notes de cours ici…" value={sourceText} onChange={e => setSourceText(e.target.value)} />
      </div>

      <div className="field-block">
        <label>Nombre de flashcards : <b>{cardCount}</b></label>
        <input type="range" min={3} max={20} value={cardCount} onChange={e => setCardCount(+e.target.value)} className="gen-range" />
      </div>

      {error && <div className="gen-error"><i className="ti ti-alert-triangle" /> {error}</div>}

      <button className="food-btn big" disabled={!canSubmit || gen.isPending} onClick={submit}>
        {gen.isPending
          ? <><i className="ti ti-loader-2 spin" /> Génération en cours…</>
          : <><i className="ti ti-sparkles" /> Générer fiche + flashcards</>}
      </button>
      {gen.isPending && <p className="gen-wait">Claude rédige la fiche et les cartes, ça prend quelques secondes…</p>}
    </div>
  );
}

// ─── Utilitaire ───────────────────────────────────────────────────────────────
function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="card rev-empty">
      <i className={`ti ${icon}`} />
      <p>{text}</p>
    </div>
  );
}
