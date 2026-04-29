import { Input, Text, tokens, makeStyles } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

interface Props {
  field: FieldState;
  onChange: (value: string | null) => void;
}

const useStyles = makeStyles({
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

export function LookupEditor({ field, onChange }: Props): JSX.Element {
  const s = useStyles();
  const value = field.currentValue == null ? '' : String(field.currentValue);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Input
        value={value}
        placeholder={field.formattedValue ?? 'Enter target record GUID'}
        onChange={(_e, d) => onChange(d.value === '' ? null : d.value)}
      />
      {field.lookupTargetEntity && (
        <Text className={s.hint}>Points to <code>{field.lookupTargetEntity}</code></Text>
      )}
    </div>
  );
}
