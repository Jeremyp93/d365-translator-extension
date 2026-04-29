import { Switch } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: boolean) => void;
}

export function BoolEditor({ field, onChange }: Props): JSX.Element {
  const checked = field.currentValue === true;
  return <Switch checked={checked} onChange={(_e, d) => onChange(d.checked)} />;
}
