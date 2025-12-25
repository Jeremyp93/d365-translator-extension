/**
 * LabelsList - Display and edit multilanguage labels
 */

import {
  Badge,
  Button,
  Caption1,
  Card,
  CardHeader,
  Divider,
  makeStyles,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ArrowExport20Regular } from '@fluentui/react-icons';

import type { Label } from '../../../types';
import { spacing } from '../../../styles/theme';
import TranslationsTable from '../../TranslationsTable';

const useStyles = makeStyles({
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tableContainer: {
    padding: spacing.lg,
  },
  emptyState: {
    padding: spacing.lg,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

export interface LabelsListProps {
  labels: Label[];
  readOnly?: boolean;
  onUpdateLabel?: (lcid: number, value: string) => void;
  defaultLcid?: number;
  clientUrl?: string;
  entity?: string;
  formId?: string;
  attribute?: string;
  cellId?: string;
}

export default function LabelsList({
  labels,
  readOnly,
  onUpdateLabel,
  defaultLcid = 1033,
  clientUrl,
  entity,
  formId,
  attribute,
  cellId,
}: LabelsListProps): JSX.Element {
  const styles = useStyles();

  const handleOpenFieldReport = () => {
    if (!clientUrl || !entity || !attribute || !formId) return;

    const params = new URLSearchParams({
      clientUrl,
      entity,
      attribute,
      formId,
      ...(cellId ? { labelId: cellId } : {}),
    });

    const url = `${window.location.origin}${window.location.pathname}#/report/field?${params.toString()}`;
    window.open(url, '_blank');
  };

  if (labels.length === 0) {
    return (
      <Card>
        <CardHeader
          header={<Text weight='semibold'>Labels (0)</Text>}
          description='No language translations defined in the form XML'
        />
        <Divider />
        <div className={styles.emptyState}>
          <Caption1>No labels defined</Caption1>
        </div>
      </Card>
    );
  }

  const lcids = labels.map(l => l.languageCode);
  const values = labels.reduce((acc, l) => {
    acc[l.languageCode] = l.label;
    return acc;
  }, {} as Record<number, string>);

  return (
    <Card>
      <CardHeader
        header={
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <Text weight='semibold'>Labels</Text>
              <Badge appearance='filled' color='brand'>
                {labels.length}
              </Badge>
            </div>
            {clientUrl && entity && attribute && formId && (
              <Button appearance='subtle' size='small' icon={<ArrowExport20Regular />} onClick={handleOpenFieldReport}>
                Open in Field Editor
              </Button>
            )}
          </div>
        }
        description='Multi-language translations defined in the form XML'
      />
      <Divider />
      <div className={styles.tableContainer}>
        <TranslationsTable
          lcids={lcids}
          values={values}
          onChange={(lcid, value) => onUpdateLabel?.(lcid, value)}
          defaultLcid={defaultLcid}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>
    </Card>
  );
}
