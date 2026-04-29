import { Textarea } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: string | null) => void;
}

export function MemoEditor({ field, onChange }: Props): JSX.Element {
  const value = field.currentValue == null ? '' : String(field.currentValue);
  return (
    <Textarea
      value={value}
      rows={3}
      onChange={(_e, d) => onChange(d.value === '' ? null : d.value)}
    />
  );
}
