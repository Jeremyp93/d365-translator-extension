import { makeStyles, Text, Spinner, Badge, Card, CardHeader, Divider, tokens } from '@fluentui/react-components';
import { Grid24Regular, Code24Regular } from '@fluentui/react-icons';

import Section from '../ui/Section';
import CustomButton from '../ui/Button';
import TranslationsTable from '../TranslationsTable';
import { queryTypeLabel, type SavedQuerySummary } from '../../services/savedQueryService';
import type { ViewFieldValues, ViewField } from '../../hooks/useViewTranslations';
import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  emptyState: { textAlign: 'center', padding: spacing.xl, color: tokens.colorNeutralForeground3 },
  spinner: { textAlign: 'center', padding: spacing.xl },
  cardPadding: { padding: spacing.md },
  dividerMargin: { margin: `${spacing.md} 0` },
  fieldBlock: { marginBottom: '24px' },
  fieldLabel: { fontWeight: tokens.fontWeightSemibold, marginBottom: spacing.sm, display: 'block' },
  badges: { display: 'flex', alignItems: 'center', gap: spacing.sm },
  actions: { display: 'flex', gap: spacing.sm, marginTop: spacing.md },
});

interface ViewLabelEditorProps {
  view: SavedQuerySummary | null;
  lcids: number[];
  langs: number[] | null;
  loading: boolean;
  values: ViewFieldValues;
  onChange: (field: ViewField, lcid: number, value: string) => void;
  onSave: () => void;
  saving: boolean;
  hasChanges: boolean;
  readOnly?: boolean;
}

export default function ViewLabelEditor({
  view, lcids, langs, loading, values, onChange, onSave, saving, hasChanges, readOnly = false,
}: ViewLabelEditorProps): JSX.Element {
  const styles = useStyles();

  if (!view) {
    return (
      <Section title="Select a view" icon={<Code24Regular />}>
        <div className={styles.emptyState}><Text>Select a view from the list to edit its translations.</Text></div>
      </Section>
    );
  }
  if (loading) {
    return (
      <Section title="Loading…" icon={<Code24Regular />}>
        <div className={styles.spinner}><Spinner size="large" label="Loading view translations…" /></div>
      </Section>
    );
  }

  const disabled = !langs?.length || readOnly;

  return (
    <Section title={`Translating: ${view.name}`} icon={<Grid24Regular />}>
      <Card className={styles.cardPadding}>
        <CardHeader
          header={
            <div className={styles.badges}>
              <Text weight="semibold">{view.name}</Text>
              <Badge color="informative" appearance="filled">{queryTypeLabel(view.queryType)}</Badge>
              {view.isDefault && <Badge appearance="outline">Default</Badge>}
              {!view.isCustomizable && <Badge color="warning" appearance="outline">Not customizable</Badge>}
            </div>
          }
        />
        <Divider className={styles.dividerMargin} />

        <div className={styles.fieldBlock}>
          <Text className={styles.fieldLabel}>Name</Text>
          <TranslationsTable
            lcids={lcids}
            values={values.name}
            loading={false}
            disabled={disabled}
            placeholder="(empty)"
            onChange={(lcid, v) => onChange('name', lcid, v)}
          />
        </div>

        <div className={styles.fieldBlock}>
          <Text className={styles.fieldLabel}>Description</Text>
          <TranslationsTable
            lcids={lcids}
            values={values.description}
            loading={false}
            disabled={disabled}
            placeholder="(empty)"
            onChange={(lcid, v) => onChange('description', lcid, v)}
          />
        </div>

        <div className={styles.actions}>
          <CustomButton onClick={onSave} disabled={saving || disabled || !hasChanges} variant="primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </CustomButton>
        </div>
      </Card>
    </Section>
  );
}
