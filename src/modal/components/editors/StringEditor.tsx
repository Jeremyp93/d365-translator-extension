import { Input } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: string | null) => void;
}

export function StringEditor({ field, onChange }: Props): JSX.Element {
  const value = field.currentValue == null ? '' : String(field.currentValue);
  return (
    <Input
      value={value}
      onChange={(_e, d) => onChange(d.value === '' ? null : d.value)}
    />
  );
}
