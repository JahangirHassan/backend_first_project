export interface ParsedLineItem {
  description: string;
  amount: number;
}

export interface ParsedReceipt {
  merchantName?: string;
  date?: string; // ISO date string (yyyy-mm-dd), best-effort
  total?: number;
  lineItems: ParsedLineItem[];
  rawText: string;
}

// Lines that look like summary/total rows rather than purchased items —
// excluded from lineItems so subtotal/tax/change don't get parsed as products.
const SUMMARY_LINE_KEYWORDS =
  /\b(sub ?total|total|tax|change|cash|card|balance|tender|amount due|visa|mastercard|debit|credit)\b/i;

const normalizeAmount = (raw: string): number =>
  Math.round(parseFloat(raw.replace(/,/g, "")) * 100) / 100;

// Best-effort merchant name: receipts almost always print the store/business
// name as the first printed line. This is a heuristic, not a guarantee —
// the user confirms/edits it before the expense is saved.
const extractMerchantName = (lines: string[]): string | undefined => {
  const firstMeaningfulLine = lines.find(
    (line) => line.trim().length >= 2 && !/^\d+$/.test(line.trim())
  );
  return firstMeaningfulLine?.trim();
};

// Looks for a "TOTAL" line specifically (not "SUBTOTAL"), and falls back to
// the largest dollar amount found anywhere in the receipt if no clear total
// label is found.
const extractTotal = (lines: string[]): number | undefined => {
  const amountPattern = /\$?\s*(\d{1,5}(?:[.,]\d{2}))/;

  const totalLine = lines.find(
    (line) => /\btotal\b/i.test(line) && !/\bsub ?total\b/i.test(line)
  );
  if (totalLine) {
    const match = totalLine.match(amountPattern);
    if (match) return normalizeAmount(match[1]);
  }

  // Fallback: largest amount anywhere on the receipt (usually the grand total)
  const allAmounts = lines
    .map((line) => line.match(amountPattern)?.[1])
    .filter((v): v is string => !!v)
    .map(normalizeAmount);

  if (allAmounts.length === 0) return undefined;
  return Math.max(...allAmounts);
};

// Matches common date formats: 12/31/2026, 12-31-26, 2026-12-31
const extractDate = (lines: string[]): string | undefined => {
  const datePatterns = [
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // yyyy-mm-dd
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // mm/dd/yyyy or dd/mm/yyyy
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (!match) continue;

      const parsed = new Date(match[0].replace(/-/g, "/"));
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
    }
  }

  return undefined;
};

// Matches "<description> ... $12.99" style lines, skipping summary rows.
const extractLineItems = (lines: string[]): ParsedLineItem[] => {
  const itemPattern = /^(.{2,40}?)\s+\$?(\d{1,4}\.\d{2})$/;
  const items: ParsedLineItem[] = [];

  for (const line of lines) {
    if (SUMMARY_LINE_KEYWORDS.test(line)) continue;

    const match = line.trim().match(itemPattern);
    if (match) {
      items.push({
        description: match[1].trim(),
        amount: normalizeAmount(match[2]),
      });
    }
  }

  return items;
};

export const parseReceiptText = (rawText: string): ParsedReceipt => {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    merchantName: extractMerchantName(lines),
    date: extractDate(lines),
    total: extractTotal(lines),
    lineItems: extractLineItems(lines),
    rawText,
  };
};
