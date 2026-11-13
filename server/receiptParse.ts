export type ReceiptRead = {
  storeName: string | null;
  purchasedOn: string | null;
  amount: number | null;
};

const SKIP_LINE = /^(tel|phone|fax|www\.|https?:|thank|welcome|visa|mastercard|debit|credit|change|cash|subtotal|tax|balance|auth|approval|mid|tid|aid|receipt|invoice|store #|st#)/i;

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeStore(line: string): boolean {
  if (line.length < 3 || line.length > 40) return false;
  if (!/[A-Za-z]/.test(line)) return false;
  if (SKIP_LINE.test(line)) return false;
  if (/^\d/.test(line)) return false;
  if (/\d{3}[-.)]\s*\d{3}/.test(line)) return false;
  if (/\$\s*\d/.test(line)) return false;
  const letters = line.replace(/[^A-Za-z]/g, "");
  return letters.length >= 3;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date.getTime() > today.getTime() + 2 * 24 * 60 * 60 * 1000) return null;
  if (year < 1990 || year > today.getFullYear() + 1) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function findDate(text: string): string | null {
  const numeric = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g;
  let match: RegExpExecArray | null;
  while ((match = numeric.exec(text))) {
    let year = Number(match[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const found = isoDate(year, Number(match[1]), Number(match[2]));
    if (found) return found;
  }

  const iso = /(\d{4})-(\d{2})-(\d{2})/;
  const isoMatch = iso.exec(text);
  if (isoMatch) {
    const found = isoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    if (found) return found;
  }

  const named = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i;
  const namedMatch = named.exec(text);
  if (namedMatch) {
    const month = MONTHS[namedMatch[1].toLowerCase().replace(".", "")];
    if (month) return isoDate(Number(namedMatch[3]), month, Number(namedMatch[2]));
  }
  return null;
}

function lineAmount(line: string): number | null {
  const match = /\$?\s*(\d{1,6}(?:,\d{3})*\.\d{2})\b/.exec(line);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  return Math.round(amount * 100) / 100;
}

function findAmount(lines: string[]): number | null {
  const ranked: { score: number; amount: number }[] = [];
  lines.forEach((line, index) => {
    const amount = lineAmount(line);
    if (amount == null) return;
    const lower = line.toLowerCase();
    let score = 0;
    if (/grand\s*total|amount\s*due|balance\s*due|total\s*due/.test(lower)) score = 100;
    else if (/\btotal\b/.test(lower) && !/sub\s*total|subtotal/.test(lower)) score = 80;
    else if (/sub\s*total|subtotal|\btax\b|change|cash|tender|visa|mastercard/.test(lower)) score = 10;
    else score = 20;
    score += index / 1000;
    ranked.push({ score, amount });
  });
  if (ranked.length === 0) return null;
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0].amount;
}

export function parseReceiptText(raw: string): ReceiptRead {
  const lines = raw
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
  const storeLine = lines.find(looksLikeStore) ?? null;
  return {
    storeName: storeLine ? storeLine.slice(0, 200) : null,
    purchasedOn: findDate(raw),
    amount: findAmount(lines),
  };
}
