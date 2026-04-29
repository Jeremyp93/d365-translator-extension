import { Input } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: string | null) => void;
}

export function DateTimeEditor({ field, onChange }: Props): JSX.Element {
  // `datetime-local` wants "YYYY-MM-DDTHH:mm" (local, no tz).
  // D365 round-trip: parse ISO → render local; on change, convert back to ISO UTC.
  const iso = field.currentValue == null ? '' : String(field.currentValue);
  const local = isoToLocalInput(iso);
  return (
    <Input
      type="datetime-local"
      value={local}
      onChange={(_e, d) => {
        if (!d.value) return onChange(null);
        const asDate = new Date(d.value);
        onChange(Number.isNaN(asDate.getTime()) ? null : asDate.toISOString());
      }}
    />
  );
}

function isoToLocalInput(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
