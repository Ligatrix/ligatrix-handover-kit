// Small, line-oriented Markdown reader. It understands exactly what the
// handover checks need: headings, task-list items, pipe tables, fenced code
// and HTML comments. Line numbers are 1-based and survive comment removal.

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const TASK = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s*(.*)$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

/** Replace every HTML comment with spaces, keeping newlines in place. */
export function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, " "));
}

/**
 * Split a document into annotated lines.
 * @returns {{ number: number, text: string, raw: string, inFence: boolean }[]}
 */
export function readLines(text) {
  const raw = text.replace(/\r\n?/g, "\n").split("\n");
  const visible = stripComments(raw.join("\n")).split("\n");
  const lines = [];
  let fence = null;
  for (let i = 0; i < raw.length; i++) {
    const line = visible[i];
    const marker = line.match(FENCE);
    let inFence = fence !== null;
    if (marker) {
      if (fence === null) {
        fence = marker[1][0];
        inFence = true;
      } else if (marker[1][0] === fence) {
        fence = null;
        inFence = true;
      }
    }
    lines.push({ number: i + 1, text: line, raw: raw[i], inFence });
  }
  return lines;
}

/** Headings outside code fences. */
export function headings(lines) {
  const found = [];
  for (const line of lines) {
    if (line.inFence) continue;
    const match = line.text.match(HEADING);
    if (match) found.push({ level: match[1].length, title: match[2], line: line.number });
  }
  return found;
}

/**
 * Every heading with the content that belongs to it: the lines up to the next
 * heading of the same or a higher level. A section is empty when nothing but
 * whitespace, comments and its own sub-headings sits under it.
 */
export function sections(lines) {
  const heads = headings(lines);
  return heads.map((head, index) => {
    const next = heads.slice(index + 1).find((h) => h.level <= head.level);
    const end = next ? next.line - 1 : lines.length;
    const nextAny = heads[index + 1];
    const ownEnd = nextAny ? nextAny.line - 1 : lines.length;
    const body = lines.slice(head.line, end);
    const own = lines.slice(head.line, ownEnd);
    const isHeading = (l) => !l.inFence && HEADING.test(l.text);
    const hasText = (list) => list.some((l) => !isHeading(l) && l.text.trim() !== "");
    return { ...head, endLine: end, empty: !hasText(body), ownLines: own, lines: body };
  });
}

/** Task-list items (`- [ ]` and `- [x]`) outside code fences. */
export function tasks(lines) {
  const found = [];
  for (const line of lines) {
    if (line.inFence) continue;
    const match = line.text.match(TASK);
    if (match) found.push({ done: match[1] !== " ", text: match[2].trim(), line: line.number });
  }
  return found;
}

/** Split one table row into trimmed cells, honouring `\|` escapes. */
export function splitRow(row) {
  let text = row.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  const cells = [];
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\\" && text[i + 1] === "|") {
      current += "|";
      i++;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Pipe tables outside code fences.
 * @returns {{ line: number, headers: string[], rows: { line: number, cells: string[] }[] }[]}
 */
export function tables(lines) {
  const found = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const head = lines[i];
    const rule = lines[i + 1];
    if (head.inFence || !TABLE_ROW.test(head.text) || !TABLE_RULE.test(rule.text)) continue;
    const table = { line: head.number, headers: splitRow(head.text), rows: [] };
    let j = i + 2;
    while (j < lines.length && !lines[j].inFence && TABLE_ROW.test(lines[j].text)) {
      table.rows.push({ line: lines[j].number, cells: splitRow(lines[j].text) });
      j++;
    }
    found.push(table);
    i = j - 1;
  }
  return found;
}
