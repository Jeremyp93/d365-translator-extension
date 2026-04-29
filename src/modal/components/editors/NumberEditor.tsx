import { Input } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: number | null) => void;
}

export function NumberEditor({ field, onChange }: Props): JSX.Element {
  const value = field.currentValue == null ? '' : String(field.currentValue);
  const step = field.attributeType === 'Integer' || field.attributeType === 'BigInt' ? '1' : 'any';
  return (
    <Input
      type="number"
      step={step}
      value={value}
      onChange={(_e, d) => {
        if (d.value === '') return onChange(null);
        const n = Number(d.value);
        onChange(Number.isFinite(n) ? n : null);
      }}
    />
  );
}
