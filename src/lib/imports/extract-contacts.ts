export type ExtractedContact = {
  name: string;
  email: string | null;
  phone: string | null;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?234|0)[789][01]\d{8}\b/g;

function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/["']/g, "").trim();
}

function cleanPhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.length < 10) return null;
  return digits;
}

function cleanEmail(raw: string | null): string | null {
  if (!raw) return null;
  const e = raw.trim().toLowerCase();
  return e.includes("@") ? e : null;
}

function looksLikeName(value: string): boolean {
  const v = cleanName(value);
  if (v.length < 2 || v.length > 80) return false;
  if (v.includes("@") || /\d{6,}/.test(v)) return false;
  return /[a-zA-Z]/.test(v);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else q = !q;
    } else if ((ch === "," || ch === ";" || ch === "\t") && !q) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function headerKey(h: string): "name" | "email" | "phone" | "other" {
  const k = h.toLowerCase().replace(/[^a-z]/g, "");
  if (["name", "fullname", "student", "client", "customer"].includes(k)) return "name";
  if (["email", "mail", "e"].includes(k)) return "email";
  if (["phone", "mobile", "tel", "whatsapp", "number"].includes(k)) return "phone";
  return "other";
}

export function parseContactCsv(text: string): ExtractedContact[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const headerCells = parseCsvLine(lines[0]!);
  const mapped = headerCells.map(headerKey);
  const hasHeader = mapped.some((m) => m !== "other");
  const rows = hasHeader ? lines.slice(1) : lines;
  const keys = hasHeader ? mapped : (["name", "email", "phone"] as const);

  const contacts: ExtractedContact[] = [];
  for (const line of rows) {
    const cells = parseCsvLine(line);
    let name = "";
    let email: string | null = null;
    let phone: string | null = null;
    cells.forEach((cell, i) => {
      const key = keys[i] ?? "other";
      if (key === "name") name = cleanName(cell);
      else if (key === "email") email = cleanEmail(cell);
      else if (key === "phone") phone = cleanPhone(cell);
      else if (!email && cell.includes("@")) email = cleanEmail(cell);
      else if (!phone && PHONE_RE.test(cell)) {
        PHONE_RE.lastIndex = 0;
        phone = cleanPhone(cell);
      } else if (!name && looksLikeName(cell)) name = cleanName(cell);
    });
    if (!name && email) name = email.split("@")[0] ?? "Customer";
    if (!name) continue;
    if (!email && !phone) continue;
    contacts.push({ name, email, phone });
  }
  return dedupeContacts(contacts);
}

export function extractContactsFromFreeText(text: string): ExtractedContact[] {
  const emails = [...new Set(text.match(EMAIL_RE)?.map((e) => e.toLowerCase()) ?? [])];
  const phones = [...new Set((text.match(PHONE_RE) ?? []).map((p) => cleanPhone(p)).filter(Boolean))] as string[];
  const lines = text
    .split(/\r?\n/)
    .map((l) => cleanName(l.replace(/name\s*[:\-]/i, "")))
    .filter(looksLikeName);

  const contacts: ExtractedContact[] = [];
  const max = Math.max(emails.length, phones.length, lines.length);
  for (let i = 0; i < max; i += 1) {
    const email = emails[i] ?? null;
    const phone = phones[i] ?? null;
    const name = lines[i] || (email ? email.split("@")[0]! : phone ? `Customer ${phone.slice(-4)}` : "");
    if (!name) continue;
    if (!email && !phone) continue;
    contacts.push({ name, email, phone });
  }
  return dedupeContacts(contacts);
}

function dedupeContacts(rows: ExtractedContact[]): ExtractedContact[] {
  const seen = new Set<string>();
  const out: ExtractedContact[] = [];
  for (const row of rows) {
    const key = `${row.email ?? ""}|${row.phone ?? ""}|${row.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function latin1Text(buf: ArrayBuffer): string {
  return new TextDecoder("latin1").decode(buf);
}

/** Pull readable strings from PDF/XLSX binaries (emails still appear as plain text). */
export function extractTextFromBinary(buf: ArrayBuffer): string {
  const raw = latin1Text(buf);
  const chunks: string[] = [];
  const paren = raw.matchAll(/\(([^)]{2,120})\)/g);
  for (const m of paren) chunks.push(m[1]!.replace(/\\n/g, "\n"));
  const xml = raw.matchAll(/>([^<]{2,120})</g);
  for (const m of xml) chunks.push(m[1]!);
  const emails = raw.match(EMAIL_RE) ?? [];
  chunks.push(...emails);
  return `${chunks.join("\n")}\n${raw.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ")}`;
}

export async function extractContactsFromFile(file: File): Promise<{
  contacts: ExtractedContact[];
  source: "csv" | "excel" | "pdf" | "text";
  warning: string | null;
}> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (name.endsWith(".csv") || type.includes("csv") || name.endsWith(".tsv")) {
    return { contacts: parseContactCsv(await file.text()), source: "csv", warning: null };
  }
  const buf = await file.arrayBuffer();
  const text = extractTextFromBinary(buf);
  const fromCsv = parseContactCsv(text);
  const fromFree = extractContactsFromFreeText(text);
  const contacts = fromCsv.length >= fromFree.length ? fromCsv : fromFree;
  const source = name.endsWith(".pdf") || type.includes("pdf") ? "pdf" : name.endsWith(".xlsx") || name.endsWith(".xls") || type.includes("sheet") ? "excel" : "text";
  const warning =
    contacts.length === 0
      ? "No names with email or phone were found. Use a CSV with columns name, email, phone."
      : source === "pdf"
        ? "PDF text extraction is best-effort. Check the preview before importing."
        : null;
  return { contacts, source, warning };
}
