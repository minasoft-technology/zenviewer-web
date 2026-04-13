/**
 * Deduplicate anamnesis entries across multiple orders.
 * Matches the logic in ZenViewer's PatientCaseInfoPanel.java:
 * Two anamnesis entries are duplicates if ALL 5 fields match.
 */

export interface AnamnesisEntry {
  complaints: string;
  symptoms: string;
  history: string;
  prediagnosis: string;
  cure: string;
}

export function deduplicateAnamnesis(orders: Array<{
  anamnesis?: string;
  prediagnosis?: string;
}>): AnamnesisEntry[] {
  const seen = new Set<string>();
  const result: AnamnesisEntry[] = [];

  for (const order of orders) {
    // Parse anamnesis field — may contain structured JSON or plain text
    let entry: AnamnesisEntry;

    try {
      const parsed = JSON.parse(order.anamnesis || '{}');
      entry = {
        complaints: parsed.complaints || '',
        symptoms: parsed.symptoms || '',
        history: parsed.history || '',
        prediagnosis: order.prediagnosis || parsed.prediagnosis || '',
        cure: parsed.cure || '',
      };
    } catch {
      // Plain text anamnesis
      entry = {
        complaints: order.anamnesis || '',
        symptoms: '',
        history: '',
        prediagnosis: order.prediagnosis || '',
        cure: '',
      };
    }

    // Skip empty entries
    const hasContent = entry.complaints || entry.symptoms || entry.history || entry.prediagnosis || entry.cure;
    if (!hasContent) continue;

    // Dedup key: all 5 fields concatenated
    const key = [entry.complaints, entry.symptoms, entry.history, entry.prediagnosis, entry.cure].join('|');
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(entry);
  }

  return result;
}
