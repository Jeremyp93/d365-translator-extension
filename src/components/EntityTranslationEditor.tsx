import { useState, useMemo, useEffect } from 'react';
import {
  TabList,
  Tab,
  Card,
  CardHeader,
  Text,
  Divider,
  makeStyles,
} from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import TranslationsTable from './TranslationsTable';
import Button from './ui/Button';
import { ErrorBox, Info } from './ui/Notice';
import { useLanguages } from '../hooks/useLanguages';
import {
  updateEntityLabelsViaWebApi,
  type EntityLabelField,
  type EntityLabelsResult,
  type Label,
} from '../services/entityLabelService';
import { publishEntityViaWebApi } from '../services/d365Api';
import { spacing } from '../styles/theme';

const useStyles = makeStyles({
  root: {
    padding: spacing.md,
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  noticeContainer: {
    marginTop: spacing.sm,
  },
  sectionGap: {
    marginTop: spacing.md,
  },
});

const TAB_CONFIG: { key: EntityLabelField; label: string }[] = [
  { key: 'DisplayName', label: 'Display Name' },
  { key: 'Description', label: 'Description' },
];

function getLabelsForField(labels: EntityLabelsResult, field: EntityLabelField): Label[] {
  switch (field) {
    case 'DisplayName': return labels.displayName;
    case 'Description': return labels.description;
  }
}

type Editable = Record<number, string>;
type EditablePerTab = Record<EntityLabelField, Editable>;

interface EntityTranslationEditorProps {
  clientUrl: string;
  entityLogicalName: string;
  labels: EntityLabelsResult;
  readOnly?: boolean;
  onSaved?: () => void;
}

export function EntityTranslationEditor({
  clientUrl,
  entityLogicalName,
  labels,
  readOnly = false,
  onSaved,
}: EntityTranslationEditorProps): JSX.Element {
  const styles = useStyles();
  const { langs, baseLcid, error: langsError } = useLanguages(clientUrl);
  const langsLoading = !langs && !langsError;

  const [activeTab, setActiveTab] = useState<EntityLabelField>('DisplayName');
  const [editedValues, setEditedValues] = useState<EditablePerTab>({
    DisplayName: {},
    Description: {},
  });
  const [originalValues, setOriginalValues] = useState<EditablePerTab>({
    DisplayName: {},
    Description: {},
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const lcids = useMemo(
    () => (langs ?? []).slice().sort((a, b) => a - b),
    [langs],
  );

  // Initialize / re-initialize when labels prop or lcids change
  useEffect(() => {
    const buildMap = (field: EntityLabelField): Editable => {
      const fieldLabels = getLabelsForField(labels, field);
      const map: Editable = {};
      const allLcids = new Set<number>([
        ...lcids,
        ...fieldLabels.map((l) => l.languageCode),
      ]);
      allLcids.forEach((lcid) => {
        const hit = fieldLabels.find((l) => l.languageCode === lcid);
        map[lcid] = hit?.label ?? '';
      });
      return map;
    };

    const newEdited: EditablePerTab = {
      DisplayName: buildMap('DisplayName'),
      Description: buildMap('Description'),
    };
    const newOriginal: EditablePerTab = {
      DisplayName: { ...newEdited.DisplayName },
      Description: { ...newEdited.Description },
    };

    setEditedValues(newEdited);
    setOriginalValues(newOriginal);
    setError(null);
    setInfo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, lcids.join(',')]);

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setActiveTab(data.value as EntityLabelField);
  };

  const handleChange = (lcid: number, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [lcid]: value },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setInfo('Saving\u2026');

      const edited = editedValues[activeTab];
      const original = originalValues[activeTab];

      const changedLabels: { LanguageCode: number; Label: string }[] = [];
      lcids.forEach((lcid) => {
        const oldValue = original[lcid] ?? '';
        const newValue = edited[lcid] ?? '';
        if (oldValue !== newValue) {
          changedLabels.push({ LanguageCode: lcid, Label: newValue });
        }
      });

      if (changedLabels.length === 0) {
        setInfo('No changes to save');
        setSaving(false);
        return;
      }

      // Always include base language in entity-level updates.
      // Unlike attribute PUTs, entity PUTs without the base language label
      // cause D365 to overwrite it with the first provided label.
      if (baseLcid) {
        const baseLabel = changedLabels.find((l) => l.LanguageCode === baseLcid);
        if (baseLabel) {
          // Base language is being changed — ensure it's not empty
          if (!baseLabel.Label.trim()) {
            baseLabel.Label = original[baseLcid] || entityLogicalName;
          }
        } else {
          // Base language not changed — include current value to prevent overwrite
          const currentBaseValue = edited[baseLcid] ?? original[baseLcid] ?? '';
          if (currentBaseValue) {
            changedLabels.push({ LanguageCode: baseLcid, Label: currentBaseValue });
          }
        }
      }

      await updateEntityLabelsViaWebApi(
        clientUrl,
        entityLogicalName,
        labels.metadataId,
        activeTab,
        changedLabels,
      );

      setInfo('Publishing\u2026');
      await publishEntityViaWebApi(clientUrl, entityLogicalName);

      // Update originals for active tab to match saved state
      setOriginalValues((prev) => ({
        ...prev,
        [activeTab]: { ...editedValues[activeTab] },
      }));

      setInfo('Saved & published.');
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={styles.root}>
      <CardHeader
        header={
          <Text weight="semibold">Entity labels</Text>
        }
      />

      {error && (
        <div className={styles.noticeContainer}>
          <ErrorBox>Error: {error}</ErrorBox>
        </div>
      )}
      {info && !error && (
        <div className={styles.noticeContainer}>
          <Info>{info}</Info>
        </div>
      )}

      <Divider className={styles.sectionGap} />

      <TabList
        appearance="subtle"
        size="small"
        selectedValue={activeTab}
        onTabSelect={handleTabSelect}
      >
        {TAB_CONFIG.map((tab) => (
          <Tab key={tab.key} value={tab.key}>
            {tab.label}
          </Tab>
        ))}
      </TabList>

      <div className={styles.sectionGap}>
        <TranslationsTable
          lcids={lcids}
          values={editedValues[activeTab]}
          loading={langsLoading}
          disabled={!langs || !langs.length || saving || readOnly}
          placeholder="(empty)"
          onChange={handleChange}
        />
      </div>

      <div className={styles.actions}>
        <Button
          onClick={handleSave}
          disabled={saving || !langs?.length || readOnly}
          variant="primary"
        >
          {saving ? 'Saving\u2026' : 'Save & Publish'}
        </Button>
      </div>
    </Card>
  );
}
