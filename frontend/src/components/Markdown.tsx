import { ReactNode } from 'react';

// ─── Mini-renderer Markdown (sans dépendance) ───────────────────────────────────
// Gère : titres, gras/italique, code inline, blocs de code, listes (ul/ol),
// tableaux, citations, règles horizontales, liens. Suffisant pour des fiches.

let keySeq = 0;
const k = () => `md-${keySeq++}`;

// Inline : **gras**, *italique*, `code`, [texte](url)
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Ordre des motifs : code d'abord (protège son contenu)
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      nodes.push(<code key={k()} className="md-code-inline">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('**')) {
      nodes.push(<strong key={k()}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('*')) {
      nodes.push(<em key={k()}>{tok.slice(1, -1)}</em>);
    } else {
      const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      nodes.push(
        <a key={k()} href={mm[2]} target="_blank" rel="noreferrer" className="md-link">{mm[1]}</a>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function isTableSep(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
}

function splitRow(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
}

export default function Markdown({ content }: { content: string }) {
  keySeq = 0;
  const lines = (content ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bloc de code ```
    if (/^\s*```/.test(line)) {
      const lang = line.replace(/^\s*```/, '').trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; // ferme la fence
      blocks.push(
        <pre key={k()} className="md-pre" data-lang={lang}>
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Tableau
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      i += 2; // saute l'en-tête + séparateur
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={k()} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>{header.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Titres
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const Tag = `h${Math.min(level + 1, 5)}` as any; // h2..h5
      blocks.push(<Tag key={k()} className={`md-h md-h${level}`}>{renderInline(h[2])}</Tag>);
      i++;
      continue;
    }

    // Règle horizontale
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={k()} className="md-hr" />);
      i++;
      continue;
    }

    // Citation
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(<blockquote key={k()} className="md-quote">{renderInline(quote.join(' '))}</blockquote>);
      continue;
    }

    // Liste à puces
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push(<ul key={k()} className="md-ul">{items.map(it => <li key={k()}>{renderInline(it)}</li>)}</ul>);
      continue;
    }

    // Liste numérotée
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(<ol key={k()} className="md-ol">{items.map(it => <li key={k()}>{renderInline(it)}</li>)}</ol>);
      continue;
    }

    // Ligne vide
    if (line.trim() === '') { i++; continue; }

    // Paragraphe (regroupe les lignes consécutives non vides)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\s*(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !(lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={k()} className="md-p">{renderInline(para.join(' '))}</p>);
  }

  return <div className="md">{blocks}</div>;
}
