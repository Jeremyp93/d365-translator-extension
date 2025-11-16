import { useEffect, useMemo, useState, useCallback } from 'react';
import { Text, Divider } from '@fluentui/react-components';
import TranslationsTable from '../components/TranslationsTable';
import Button from './ui/Button';
import { ErrorBox, Info } from './ui/Notice';
import * as entityLabelService from '../services/entityLabelService';
import * as d365ApiService from '../services/d365Api';

type Editable = Record<number, string>;

interface Props {
  clientUrl: string;
  entity: string;
  attribute: string;
  langs?: number[] | null;
  langsLoading?: boolean;
  onReloadLangs?: () => void;
}

interface Label {
  languageCode: number;
  label: string;
}

export default function EntityLabelEditor({
  clientUrl,
  entity,
  attribute,
  langs,
  langsLoading,
  onReloadLangs,
}: Props): JSX.Element {
  const [entityLabels, setEntityLabels] = useState<Label[] | null>(null);
  const [values, setValues] = useState<Editable>({});
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const langList = useMemo(() => (langs ?? []).slice().sort((a, b) => a - b), [langs]);

  useEffect(() => {
    (async () => {
      if (!clientUrl || !entity || !attribute) return;
      if (!langs || langsLoading) return;

      setInfo('Loading entity labels…');
      setError(null);

      try {
        const labels = await entityLabelService.getAttributeLabelTranslations(
          clientUrl,
          entity,
          attribute
        );
        setEntityLabels(labels);

        const map: Editable = {};
        for (const lcid of langList) {
          const hit = labels.find((l) => Number(l.languageCode) === lcid);
          map[lcid] = hit?.label ?? '';
        }
        setValues(map);
        setInfo(null);
      } catch (e: any) {
        setError(e?.message ?? String(e));
        setInfo(null);
      }
    })();
  }, [clientUrl, entity, attribute, langs, langsLoading, langList]);

  const onChange = (lcid: number, v: string) => setValues((prev) => ({ ...prev, [lcid]: v }));

  const onSave = useCallback(async () => {
    if (!clientUrl || !entity || !attribute || !langs?.length) return;
    try {
      setSaving(true);
      setInfo('Saving entity labels…');
      setError(null);

      const labels = langList.map((lcid) => ({
        LanguageCode: lcid,
        Label: values[lcid] ?? '',
      }));

      await entityLabelService.updateAttributeLabelsViaSoap(
        clientUrl,
        entity,
        attribute,
        labels
      );

      setInfo('Publishing entity…');
      await d365ApiService.publishEntityViaWebApi(clientUrl, entity);

      setInfo('Saved & published. If apps still show old text, hard-refresh (Ctrl/Cmd+Shift+R).');
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setInfo(null);
    } finally {
      setSaving(false);
    }
  }, [clientUrl, entity, attribute, langs, langList, values]);

  return (
    <section style={{ marginTop: 16 }}>
      <Text weight="semibold" size={500}>
        DisplayName labels (Entity metadata)
      </Text>
      <Divider style={{ margin: '8px 0 12px' }} />

      <TranslationsTable
        lcids={langList}
        values={values}
        loading={langsLoading}
        disabled={!langs || !langs.length}
        placeholder="(empty)"
        onChange={(lcid, v) => onChange(lcid, v)}
        />

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Button onClick={onSave} disabled={saving || !langs?.length} variant="primary">
          {saving ? 'Saving…' : 'Save & Publish'}
        </Button>
        {onReloadLangs && (
          <Button onClick={onReloadLangs} variant="ghost">
            Reload languages
          </Button>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 10 }}>
          <ErrorBox>Error: {error}</ErrorBox>
        </div>
      )}
      {info && !error && (
        <div style={{ marginTop: 10 }}>
          <Info>{info}</Info>
        </div>
      )}
    </section>
  );
}
