import { Combobox, Option, Spinner } from '@fluentui/react-components';
import { useCallback, useState } from 'react';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: number | null) => void;
  onRequestOptions: () => Promise<void>;
}

export function PicklistEditor({ field, onChange, onRequestOptions }: Props): JSX.Element {
  const [requesting, setRequesting] = useState(false);

  const maybeLoad = useCallback(async () => {
    if (field.options && field.options.length > 0) return;
    if (requesting) return;
    setRequesting(true);
    try { await onRequestOptions(); } finally { setRequesting(false); }
  }, [field.options, onRequestOptions, requesting]);

  const currentNum = field.currentValue == null ? null : Number(field.currentValue);
  const current = field.options?.find((o) => o.value === currentNum);
  const display = current?.label ?? (field.formattedValue ?? (currentNum == null ? '' : String(currentNum)));

  return (
    <Combobox
      value={display}
      selectedOptions={currentNum == null ? [] : [String(currentNum)]}
      onOpenChange={(_e, data) => { if (data.open) void maybeLoad(); }}
      onOptionSelect={(_e, data) => {
        if (data.optionValue === '__none__') return onChange(null);
        const n = Number(data.optionValue);
        onChange(Number.isFinite(n) ? n : null);
      }}
    >
      <Option value="__none__">— clear —</Option>
      {requesting && <Option value="__loading__" text="Loading…" disabled><Spinner size="tiny" /> Loading…</Option>}
      {(field.options || []).map((o) => (
        <Option key={o.value} value={String(o.value)} text={o.label}>{o.label}</Option>
      ))}
    </Combobox>
  );
}
