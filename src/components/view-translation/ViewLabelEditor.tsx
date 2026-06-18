import { useState } from 'react';
import {
  makeStyles,
  Text,
  Spinner,
  Badge,
  Card,
  CardHeader,
  Divider,
  TabList,
  Tab,
  ProgressBar,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  tokens,
} from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { Grid24Regular, Code24Regular } from '@fluentui/react-icons';

import Section from '../ui/Section';
import CustomButton from '../ui/Button';
import TranslationsTable from '../TranslationsTable';
import { queryTypeLabel, type SavedQuerySummary } from '../../services/savedQueryService';
import type { ViewFieldValues, ViewField } from '../../hooks/useViewTranslations';
import { spacing } from '../../styles/theme';

const TAB_CONFIG: { key: ViewField; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
];

const useStyles = makeStyles({
  emptyState: { textAlign: 'center', padding: spacing.xl, color: tokens.colorNeutralForeground3 },
  spinner: { textAlign: 'center', padding: spacing.xl },
  cardPadding: { padding: spacing.md },
  dividerMargin: { margin: `${spacing.md} 0` },
  tabPanel: { marginTop: spacing.md },
  badges: { display: 'flex', alignItems: 'center', gap: spacing.sm },
  actions: { display: 'flex', gap: spacing.sm, marginTop: spacing.md },
  statusRibbon: { marginTop: spacing.md },
  progressBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
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
  saveError?: string | null;
  saveSuccess?: boolean;
  hasChanges: boolean;
  readOnly?: boolean;
}

export default function ViewLabelEditor({
  view, lcids, langs, loading, values, onChange, onSave, saving,
  saveError = null, saveSuccess = false, hasChanges, readOnly = false,
}: ViewLabelEditorProps): JSX.Element {
  const styles = useStyles();
  const [activeTab, setActiveTab] = useState<ViewField>('name');

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setActiveTab(data.value as ViewField);
  };

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

        <TabList appearance="subtle" size="small" selectedValue={activeTab} onTabSelect={handleTabSelect}>
          {TAB_CONFIG.map((tab) => (
            <Tab key={tab.key} value={tab.key}>
              {tab.label}
            </Tab>
          ))}
        </TabList>

        <div className={styles.tabPanel}>
          <TranslationsTable
            lcids={lcids}
            values={values[activeTab]}
            loading={false}
            disabled={disabled}
            placeholder="(empty)"
            onChange={(lcid, v) => onChange(activeTab, lcid, v)}
          />
        </div>

        <div className={styles.actions}>
          <CustomButton onClick={onSave} disabled={saving || disabled || !hasChanges} variant="primary">
            {saving ? 'Saving…' : 'Save Changes'}
          </CustomButton>
        </div>

        {saving && (
          <div className={styles.progressBlock}>
            <Text size={200}>Saving translations and publishing the entity…</Text>
            <ProgressBar shape="rounded" thickness="large" />
          </div>
        )}

        {!saving && saveError && (
          <MessageBar intent="error" className={styles.statusRibbon}>
            <MessageBarBody>
              <MessageBarTitle>Save failed</MessageBarTitle>
              {saveError}
            </MessageBarBody>
          </MessageBar>
        )}

        {!saving && !saveError && saveSuccess && (
          <MessageBar intent="success" className={styles.statusRibbon}>
            <MessageBarBody>
              <MessageBarTitle>Saved</MessageBarTitle>
              Translations saved and the entity was published.
            </MessageBarBody>
          </MessageBar>
        )}
      </Card>
    </Section>
  );
}
