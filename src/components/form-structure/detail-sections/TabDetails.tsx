/**
 * TabDetails - Display properties for a form tab
 */

import { Badge, Card, CardHeader, Divider, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import type { FormTab } from '../../../types';
import { spacing } from '../../../styles/theme';
import LabelsList from './LabelsList';

const useStyles = makeStyles({
  detailsCard: {
    marginBottom: spacing.lg,
    boxShadow: tokens.shadow8,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  propertiesTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: spacing.sm,
    fontSize: tokens.fontSizeBase300,
    tableLayout: 'fixed',
    '@media (max-width: 768px)': { fontSize: tokens.fontSizeBase200 },
  },
  propertyRow: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  propertyLabel: {
    ...shorthands.padding(spacing.md),
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    width: '180px',
    verticalAlign: 'top',
    '@media (max-width: 768px)': {
      width: '120px',
      ...shorthands.padding(spacing.sm),
    },
  },
  propertyValue: {
    ...shorthands.padding(spacing.md),
    color: tokens.colorNeutralForeground1,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    '@media (max-width: 768px)': {
      ...shorthands.padding(spacing.sm),
    },
  },
});

export interface TabDetailsProps {
  tab: FormTab;
  readOnly: boolean;
  onUpdateLabel: (lcid: number, value: string) => void;
}

export default function TabDetails({ tab, readOnly, onUpdateLabel }: TabDetailsProps): JSX.Element {
  const styles = useStyles();

  return (
    <>
      <Card className={styles.detailsCard}>
        <CardHeader header={<Text weight='semibold'>Tab Properties</Text>} />
        <Divider />
        <table className={styles.propertiesTable}>
          <tbody>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>ID</td>
              <td className={styles.propertyValue}>
                <code>{tab.id}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Name</td>
              <td className={styles.propertyValue}>
                <code>{tab.name || '(none)'}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Visible</td>
              <td className={styles.propertyValue}>
                <Badge appearance='tint' color={tab.visible ?? true ? 'success' : 'danger'}>
                  {String(tab.visible ?? true)}
                </Badge>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Show Label</td>
              <td className={styles.propertyValue}>
                <Badge appearance='tint' color={tab.showlabel ?? true ? 'success' : 'danger'}>
                  {String(tab.showlabel ?? true)}
                </Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <LabelsList labels={tab.labels} readOnly={readOnly} onUpdateLabel={onUpdateLabel} />
    </>
  );
}
