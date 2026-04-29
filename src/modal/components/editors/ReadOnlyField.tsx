import { Text, tokens, makeStyles } from '@fluentui/react-components';
import type { FieldState } from '../../../services/recordFieldMerge';

const useStyles = makeStyles({
  value: {
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-all',
  },
  empty: { fontStyle: 'italic', color: tokens.colorNeutralForeground3 },
});

export function ReadOnlyField({ field }: { field: FieldState }): JSX.Element {
  const s = useStyles();
  const display = field.formattedValue ?? formatRaw(field.currentValue);
  if (!display) return <Text className={`${s.value} ${s.empty}`}>— empty —</Text>;
  return <Text className={s.value}>{display}</Text>;
}

function formatRaw(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
