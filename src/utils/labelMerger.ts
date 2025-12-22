export interface LabelInput {
  languageCode: number;
  label: string;
}

export interface MergedLabel {
  languageCode: number;
  label: string;
}

interface MergeLabelOptions {
  baseLcid: number;
  fallbackLabel?: string;
  allowEmpty?: boolean;
}

/**
 * Merge edited labels with current labels, ensuring base language is non-empty
 * Used by both entity attributes and option sets
 */
export function mergeLabels(
  editedLabels: LabelInput[],
  currentLabels: Record<number, string>,
  options: MergeLabelOptions
): MergedLabel[] {
  const { baseLcid, fallbackLabel = '', allowEmpty = false } = options;

  // Collect all unique language codes
  const allLcids = new Set<number>([
    ...Object.keys(currentLabels).map(Number),
    ...editedLabels.map(l => l.languageCode),
  ]);

  const merged: MergedLabel[] = [];

  for (const lcid of allLcids) {
    const editedLabel = editedLabels.find(l => l.languageCode === lcid);
    const currentLabel = currentLabels[lcid] ?? '';

    const editedText = editedLabel?.label ?? '';
    const editedEmpty = editedText.trim() === '';
    const currentEmpty = currentLabel.trim() === '';

    // Skip if both are empty and we don't allow empty (unless explicitly clearing)
    if (!allowEmpty && editedEmpty && currentEmpty) {
      continue;
    }

    // If edited is empty but current had value → CLEAR IT (explicit deletion)
    if (editedLabel !== undefined && editedEmpty && !currentEmpty) {
      merged.push({
        languageCode: lcid,
        label: '',
      });
      continue;
    }

    // Normal case: use edited if provided, otherwise keep current
    const finalLabel = editedLabel !== undefined ? editedText : currentLabel;

    merged.push({
      languageCode: lcid,
      label: finalLabel,
    });
  }

  // Ensure base language has non-empty value
  ensureBaseLabelNonEmpty(merged, baseLcid, fallbackLabel);

  // Sort: base language first
  merged.sort((a, b) =>
    a.languageCode === baseLcid ? -1 : b.languageCode === baseLcid ? 1 : 0
  );

  return merged;
}

function ensureBaseLabelNonEmpty(
  labels: MergedLabel[],
  baseLcid: number,
  fallback: string
): void {
  const baseLabel = labels.find(l => l.languageCode === baseLcid);

  if (!baseLabel || !baseLabel.label.trim()) {
    const anyNonEmpty = labels.find(l => l.label.trim())?.label;
    const finalLabel = anyNonEmpty || fallback.trim() || 'Untitled';

    if (baseLabel) {
      baseLabel.label = finalLabel;
    } else {
      labels.push({ languageCode: baseLcid, label: finalLabel });
    }
  }
}

/**
 * Merge option set labels (supports multiple options, each with multiple language labels)
 */
export function mergeOptionSetLabels(
  editedOptions: Array<{ value: number; labels: LabelInput[] }>,
  currentOptions: Array<{ value: number; labels: LabelInput[] }>,
  baseLcid: number
): Array<{ value: number; labels: MergedLabel[] }> {
  const allValues = new Set([
    ...currentOptions.map(o => o.value),
    ...editedOptions.map(o => o.value),
  ]);

  return Array.from(allValues).map(value => {
    const edited = editedOptions.find(o => o.value === value);
    const current = currentOptions.find(o => o.value === value);

    const currentMap: Record<number, string> = {};
    current?.labels.forEach(l => {
      currentMap[l.languageCode] = l.label;
    });

    const merged = mergeLabels(
      edited?.labels || [],
      currentMap,
      { baseLcid, allowEmpty: true }
    );

    return { value, labels: merged };
  });
}
