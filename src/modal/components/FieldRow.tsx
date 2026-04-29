import { Button, Text, tokens, makeStyles, Tooltip } from '@fluentui/react-components';
import { ArrowUndo16Regular } from '@fluentui/react-icons';
import type { FieldState } from '../../services/recordFieldMerge';
import { isFieldDirty } from '../../services/recordFieldMerge';
import { ReadOnlyField } from './editors/ReadOnlyField';
import { StringEditor } from './editors/StringEditor';
import { MemoEditor } from './editors/MemoEditor';
import { NumberEditor } from './editors/NumberEditor';
import { BoolEditor } from './editors/BoolEditor';
import { DateTimeEditor } from './editors/DateTimeEditor';
import { PicklistEditor } from './editors/PicklistEditor';
import { LookupEditor } from './editors/LookupEditor';

const useStyles = makeStyles({
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr) 32px',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
  value: { minWidth: 0, '& > *': { width: '100%' } },
  logical: { color: tokens.colorNeutralForeground3, fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  dirty: { color: tokens.colorPaletteYellowForeground1, marginLeft: '4px' },
  readOnlyTag: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase100 },
});

interface Props {
  field: FieldState;
  onChange: (value: unknown) => void;
  onRevert: () => void;
  onRequestOptions: () => Promise<void>;
}

export function FieldRow({ field, onChange, onRevert, onRequestOptions }: Props): JSX.Element {
  const s = useStyles();
  const dirty = !field.isReadOnly && isFieldDirty(field);

  return (
    <div className={s.row} data-logical={field.logicalName}>
      <div className={s.label}>
        <Text weight="semibold">
          {field.displayName}
          {dirty && <span className={s.dirty}>●</span>}
        </Text>
        <Text className={s.logical}>
          {field.logicalName}
          {field.isReadOnly && <> · <span className={s.readOnlyTag}>read-only ({field.readOnlyReason ?? 'n/a'})</span></>}
        </Text>
      </div>

      <div className={s.value}>
        {renderEditor(field, onChange, onRequestOptions)}
      </div>

      <div>
        {dirty && (
          <Tooltip content="Revert this field" relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowUndo16Regular />}
              onClick={onRevert}
              aria-label="Revert"
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function renderEditor(
  field: FieldState,
  onChange: (value: unknown) => void,
  onRequestOptions: () => Promise<void>,
): JSX.Element {
  if (field.isReadOnly) return <ReadOnlyField field={field} />;
  switch (field.kind) {
    case 'string':   return <StringEditor field={field} onChange={onChange} />;
    case 'memo':     return <MemoEditor field={field} onChange={onChange} />;
    case 'number':   return <NumberEditor field={field} onChange={onChange} />;
    case 'boolean':  return <BoolEditor field={field} onChange={onChange} />;
    case 'datetime': return <DateTimeEditor field={field} onChange={onChange} />;
    case 'picklist': return <PicklistEditor field={field} onChange={onChange} onRequestOptions={onRequestOptions} />;
    case 'lookup':   return <LookupEditor field={field} onChange={onChange} />;
    default:         return <ReadOnlyField field={field} />;
  }
}
