import { useEffect, useState, ReactNode } from 'react';

// ─── Maths IPv4 ──────────────────────────────────────────────────────────────────
const ri = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(a: T[]): T => a[ri(0, a.length - 1)];
const ipToInt = (o: number[]) => ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
const intToIp = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ipStr = (n: number) => intToIp(n).join('.');
const maskInt = (c: number) => (c === 0 ? 0 : (0xffffffff << (32 - c)) >>> 0);
const netOf = (ip: number, c: number) => (ip & maskInt(c)) >>> 0;
const bcOf = (ip: number, c: number) => (netOf(ip, c) | (~maskInt(c) >>> 0)) >>> 0;
const maskDotted = (c: number) => ipStr(maskInt(c));

function parseIp(s: string): number | null {
  if (!s) return null;
  const p = s.trim().split('.');
  if (p.length !== 4) return null;
  const o: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(p[i])) return null;
    const v = +p[i];
    if (v < 0 || v > 255) return null;
    o.push(v);
  }
  return ipToInt(o) >>> 0;
}

function parseCidr(s: string): number | null {
  if (!s) return null;
  const m = s.trim().replace(/^\//, '');
  if (!/^\d{1,2}$/.test(m)) return null;
  const v = +m;
  return v >= 0 && v <= 32 ? v : null;
}

function pasInfo(c: number): { octet: number; pas: number } {
  const m = intToIp(maskInt(c));
  for (let i = 0; i < 4; i++) if (m[i] !== 255 && m[i] !== 0) return { octet: i + 1, pas: 256 - m[i] };
  for (let j = 0; j < 4; j++) if (m[j] === 0) return { octet: j + 1, pas: 256 };
  return { octet: 4, pas: 1 };
}

// ─── Générateurs ──────────────────────────────────────────────────────────────────
type Mode = 'rb' | 'sub' | 'bin';

type RB = { type: 'rb'; ip: number[]; c: number; net: number; bc: number };
type Sub = {
  type: 'sub'; shownInt: number; baseP: number; nSub: number; bits: number;
  newP: number; count: number; realNet: number; subs: { net: number; bc: number }[];
  kAsk: number; trap: boolean;
};
type Bin = { type: 'bin'; dir: 'd2b' | 'b2d'; val: string | number; ans: string };
type Ex = RB | Sub | Bin;

function genRB(): RB {
  let o1 = ri(1, 223);
  if (o1 === 127) o1 = 126;
  const ip = [o1, ri(0, 255), ri(0, 255), ri(1, 254)];
  const c = pick([8, 9, 12, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  const ipInt = ipToInt(ip);
  return { type: 'rb', ip, c, net: netOf(ipInt, c), bc: bcOf(ipInt, c) };
}

function genSub(): Sub {
  const base = pick([
    { ip: [192, 168, ri(0, 255), 0], p: 24 },
    { ip: [10, ri(0, 255), 0, 0], p: 16 },
    { ip: [172, 16, 0, 0], p: 16 },
    { ip: [192, 168, 0, 0], p: 16 },
    { ip: [192, 168, ri(0, 63) * 4, 0], p: 22 },
  ]);
  let nSub = pick([2, 3, 4, 5, 6, 8]);
  let bits = Math.ceil(Math.log2(nSub));
  let newP = base.p + bits;
  if (newP > 30) { bits = 30 - base.p; nSub = Math.min(nSub, Math.pow(2, bits)); newP = base.p + bits; }
  const count = Math.pow(2, bits);
  let shownInt = ipToInt(base.ip);
  let trap = false;
  if (Math.random() < 0.3) {
    const bs0 = Math.pow(2, 32 - base.p);
    if (bs0 > 1) { shownInt = (ipToInt(base.ip) + ri(1, bs0 - 1)) >>> 0; trap = true; }
  }
  const realNet = netOf(shownInt, base.p);
  const bsNew = Math.pow(2, 32 - newP);
  const subs: { net: number; bc: number }[] = [];
  for (let k = 0; k < count; k++) { const n = (realNet + k * bsNew) >>> 0; subs.push({ net: n, bc: (n + bsNew - 1) >>> 0 }); }
  const kAsk = ri(1, count);
  return { type: 'sub', shownInt, baseP: base.p, nSub, bits, newP, count, realNet, subs, kAsk, trap };
}

function genBin(): Bin {
  if (Math.random() < 0.5) {
    const n = ri(0, 255);
    return { type: 'bin', dir: 'd2b', val: n, ans: n.toString(2).padStart(8, '0') };
  }
  const m = ri(0, 255);
  const b = m.toString(2).padStart(8, '0');
  return { type: 'bin', dir: 'b2d', val: b.slice(0, 4) + ' ' + b.slice(4), ans: String(m) };
}

function generate(mode: Mode): Ex {
  return mode === 'rb' ? genRB() : mode === 'sub' ? genSub() : genBin();
}

// ─── Composant ────────────────────────────────────────────────────────────────────
const MODES: { key: Mode; label: string }[] = [
  { key: 'rb', label: '@Réseau & Broadcast' },
  { key: 'sub', label: 'Sous-réseaux' },
  { key: 'bin', label: 'Binaire' },
];

export default function ReseauTrainer() {
  const [mode, setMode] = useState<Mode>('rb');
  const [cur, setCur] = useState<Ex>(() => generate('rb'));
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean | null; body: ReactNode } | null>(null);
  const [answered, setAnswered] = useState(false);
  const [stats, setStats] = useState({ ok: 0, tot: 0, streak: 0 });

  const newExercise = (m: Mode = mode) => {
    setCur(generate(m));
    setInputs({});
    setMarks({});
    setFeedback(null);
    setAnswered(false);
  };

  // change de mode → nouvel exercice
  useEffect(() => { newExercise(mode); /* eslint-disable-next-line */ }, [mode]);

  const set = (k: string, v: string) => setInputs((s) => ({ ...s, [k]: v }));

  const record = (ok: boolean) => {
    setAnswered(true);
    setStats((s) => ({ ok: s.ok + (ok ? 1 : 0), tot: s.tot + 1, streak: ok ? s.streak + 1 : 0 }));
  };

  const check = () => {
    if (answered) return;
    if (cur.type === 'rb') {
      const okN = parseIp(inputs.iNet ?? '') === cur.net;
      const okB = parseIp(inputs.iBc ?? '') === cur.bc;
      setMarks({ iNet: okN, iBc: okB });
      const ok = okN && okB;
      setFeedback({ ok, body: solRB(cur) });
      record(ok);
    } else if (cur.type === 'sub') {
      const sub = cur.subs[cur.kAsk - 1];
      const okBits = /^\d+$/.test((inputs.iBits ?? '').trim()) && +inputs.iBits === cur.bits;
      const okCidr = parseCidr(inputs.iCidr ?? '') === cur.newP;
      const okSnet = parseIp(inputs.iSnet ?? '') === sub.net;
      const okSbc = parseIp(inputs.iSbc ?? '') === sub.bc;
      setMarks({ iBits: okBits, iCidr: okCidr, iSnet: okSnet, iSbc: okSbc });
      const ok = okBits && okCidr && okSnet && okSbc;
      setFeedback({ ok, body: solSub(cur) });
      record(ok);
    } else {
      const raw = (inputs.iBin ?? '').replace(/\s+/g, '').trim();
      let ok: boolean;
      if (cur.dir === 'd2b') ok = raw.replace(/^0+(?=\d)/, '') === cur.ans.replace(/^0+(?=\d)/, '') || raw === cur.ans;
      else ok = /^\d+$/.test(raw) && +raw === +cur.ans;
      setMarks({ iBin: ok });
      setFeedback({ ok, body: solBin(cur) });
      record(ok);
    }
  };

  const showSolution = () => {
    if (answered) return;
    const body = cur.type === 'rb' ? solRB(cur) : cur.type === 'sub' ? solSub(cur) : solBin(cur);
    setFeedback({ ok: null, body });
    setAnswered(true);
    setStats((s) => ({ ...s, tot: s.tot + 1, streak: 0 }));
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); check(); } };
  const pct = stats.tot ? Math.round((stats.ok / stats.tot) * 100) : 0;

  return (
    <div className="trainer">
      <div className="tr-modes">
        {MODES.map((m) => (
          <button key={m.key} className={`tr-mode${m.key === mode ? ' active' : ''}`} onClick={() => setMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="card tr-card">
        {cur.type === 'rb' && <RBView cur={cur} inputs={inputs} marks={marks} set={set} onKey={onKey} />}
        {cur.type === 'sub' && <SubView cur={cur} inputs={inputs} marks={marks} set={set} onKey={onKey} />}
        {cur.type === 'bin' && <BinView cur={cur} inputs={inputs} marks={marks} set={set} onKey={onKey} />}

        <div className="tr-btns">
          <button className="food-btn" onClick={check} disabled={answered}>Vérifier</button>
          <button className="tr-btn-sec" onClick={showSolution} disabled={answered}>Voir la solution</button>
          <button className="tr-btn-sec" onClick={() => newExercise()}>Nouvel exercice ▸</button>
        </div>

        {feedback && (
          <div className={`tr-feedback ${feedback.ok === null ? 'neutral' : feedback.ok ? 'ok' : 'ko'}`}>
            <div className="tr-fb-head">
              {feedback.ok === null ? 'Solution' : feedback.ok ? '✓ Correct !' : '✗ Pas tout à fait'}
            </div>
            {feedback.body}
          </div>
        )}
      </div>

      <div className="tr-score">
        <span>Réussis : <b>{stats.ok}</b> / {stats.tot}{stats.tot ? ` (${pct}%)` : ''}</span>
        {stats.streak >= 2 && <span className="tr-streak">🔥 série de {stats.streak}</span>}
        <button className="tr-reset" onClick={() => setStats({ ok: 0, tot: 0, streak: 0 })}>remettre à zéro</button>
      </div>

      <p className="tr-tip">Astuce : appuie sur Entrée pour vérifier · méthode du « pas » dans les corrections.</p>
    </div>
  );
}

// ─── Vues d'exercice ──────────────────────────────────────────────────────────────
type ViewProps = {
  inputs: Record<string, string>;
  marks: Record<string, boolean>;
  set: (k: string, v: string) => void;
  onKey: (e: React.KeyboardEvent) => void;
};

function field(id: string, label: string, ph: string, p: ViewProps) {
  const cls = id in p.marks ? (p.marks[id] ? ' good' : ' bad') : '';
  return (
    <div className="tr-field">
      <label>{label}</label>
      <input
        className={`food-input tr-input${cls}`}
        placeholder={ph}
        value={p.inputs[id] ?? ''}
        onChange={(e) => p.set(id, e.target.value)}
        onKeyDown={p.onKey}
        autoComplete="off"
      />
    </div>
  );
}

function RBView({ cur, ...p }: { cur: RB } & ViewProps) {
  return (
    <>
      <div className="tr-q-label">Adresse réseau & broadcast</div>
      <div className="tr-q-text">Donne l'<b>adresse réseau</b> et l'<b>adresse de broadcast dirigé</b> :</div>
      <div className="tr-given">{cur.ip.join('.')} /{cur.c}</div>
      <div className="tr-sub">Masque : {maskDotted(cur.c)}</div>
      <div className="tr-row2">
        {field('iNet', 'Adresse réseau', 'ex : 192.168.1.0', p)}
        {field('iBc', 'Adresse de broadcast', 'ex : 192.168.1.255', p)}
      </div>
    </>
  );
}

function SubView({ cur, ...p }: { cur: Sub } & ViewProps) {
  return (
    <>
      <div className="tr-q-label">Création de sous-réseaux</div>
      <div className="tr-q-text">Découpe ce réseau en <b>{cur.nSub}</b> sous-réseaux égaux.</div>
      <div className="tr-given">{ipStr(cur.shownInt)} /{cur.baseP}</div>
      {cur.trap && <div className="tr-sub">⚠️ Vérifie d'abord qu'il s'agit bien d'une adresse réseau.</div>}
      <div className="tr-row2">
        {field('iBits', 'Bits à emprunter', 'ex : 2', p)}
        {field('iCidr', 'Nouveau masque (CIDR)', 'ex : /26', p)}
      </div>
      {field('iSnet', `Adresse du sous-réseau n°${cur.kAsk} (sur ${cur.count})`, `@réseau du SR n°${cur.kAsk}`, p)}
      {field('iSbc', `Broadcast du sous-réseau n°${cur.kAsk}`, `broadcast du SR n°${cur.kAsk}`, p)}
      <div className="tr-hint">Rappel : {cur.nSub} sous-réseaux → il faut 2ⁿ ≥ {cur.nSub}.</div>
    </>
  );
}

function BinView({ cur, ...p }: { cur: Bin } & ViewProps) {
  return (
    <>
      <div className="tr-q-label">Conversion binaire</div>
      <div className="tr-q-text">
        {cur.dir === 'd2b'
          ? <>Convertis ce nombre <b>décimal</b> en <b>binaire</b> (8 bits) :</>
          : <>Convertis cet octet <b>binaire</b> en <b>décimal</b> :</>}
      </div>
      <div className="tr-given">{cur.val}</div>
      {field('iBin', 'Ta réponse', cur.dir === 'd2b' ? 'ex : 1010 1100' : 'ex : 172', p)}
      <div className="tr-hint">Poids des bits : 128 · 64 · 32 · 16 · 8 · 4 · 2 · 1</div>
    </>
  );
}

// ─── Corrections ──────────────────────────────────────────────────────────────────
function solRB(cur: RB): ReactNode {
  const pi = pasInfo(cur.c);
  return (
    <pre className="tr-sol">
      <span className="cm"># Masque {maskDotted(cur.c)} (/{cur.c})</span>{'\n'}
      <span className="cm"># pas de {pi.pas} sur le {pi.octet}ᵉ octet</span>{'\n'}
      @réseau    = <span className="rs">{ipStr(cur.net)}</span>   <span className="cm">(bits machine à 0)</span>{'\n'}
      @broadcast = <span className="rs">{ipStr(cur.bc)}</span>   <span className="cm">(bits machine à 1)</span>
    </pre>
  );
}

function solSub(cur: Sub): ReactNode {
  const pi = pasInfo(cur.newP);
  return (
    <pre className="tr-sol">
      {cur.trap && <><span className="cm"># Adresse donnée = @machine → @réseau réelle {ipStr(cur.realNet)}/{cur.baseP}</span>{'\n'}</>}
      <span className="cm"># {cur.nSub} sous-réseaux → {cur.bits} bit(s) (2^{cur.bits}={cur.count} ≥ {cur.nSub})</span>{'\n'}
      <span className="cm"># nouveau masque /{cur.baseP} + {cur.bits} = </span><span className="hl">/{cur.newP}</span> <span className="cm">→ pas de {pi.pas} sur le {pi.octet}ᵉ octet</span>{'\n\n'}
      {cur.subs.map((s, k) => {
        const hit = k === cur.kAsk - 1;
        return (
          <span key={k} className={hit ? 'pk' : undefined}>
            SR{k + 1} : {ipStr(s.net)}/{cur.newP}  bc {ipStr(s.bc)}{hit ? '  ⬅ demandé' : ''}{'\n'}
          </span>
        );
      })}
    </pre>
  );
}

function solBin(cur: Bin): ReactNode {
  const weights = [128, 64, 32, 16, 8, 4, 2, 1];
  if (cur.dir === 'd2b') {
    const n = +cur.val;
    const parts: number[] = [];
    let rem = n;
    weights.forEach((w) => { if (rem >= w) { parts.push(w); rem -= w; } });
    return (
      <pre className="tr-sol">
        <span className="cm"># {n} = {parts.length ? parts.join(' + ') : '0'}</span>{'\n'}
        → <span className="rs">{cur.ans.slice(0, 4)} {cur.ans.slice(4)}</span>
      </pre>
    );
  }
  const b = String(cur.val).replace(/\s/g, '');
  const terms: number[] = [];
  for (let i = 0; i < 8; i++) if (b[i] === '1') terms.push(weights[i]);
  return (
    <pre className="tr-sol">
      <span className="cm"># {terms.length ? terms.join(' + ') : '0'}</span>{'\n'}
      → <span className="rs">{cur.ans}</span>
    </pre>
  );
}
