/**
 * SectionDetails - Display properties for a form section
 */

import { Badge, Card, CardHeader, Divider, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import type { FormSection } from '../../../types';
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

export interface SectionDetailsProps {
  section: FormSection;
  isSaving: boolean;
  onUpdateLabel: (lcid: number, value: string) => void;
}

export default function SectionDetails({ section, isSaving, onUpdateLabel }: SectionDetailsProps): JSX.Element {
  const styles = useStyles();

  return (
    <>
      <Card className={styles.detailsCard}>
        <CardHeader header={<Text weight='semibold'>Section Properties</Text>} />
        <Divider />
        <table className={styles.propertiesTable}>
          <tbody>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>ID</td>
              <td className={styles.propertyValue}>
                <code>{section.id}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Name</td>
              <td className={styles.propertyValue}>
                <code>{section.name || '(none)'}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Visible</td>
              <td className={styles.propertyValue}>
                <Badge appearance='tint' color={section.visible ?? true ? 'success' : 'danger'}>
                  {String(section.visible ?? true)}
                </Badge>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Show Label</td>
              <td className={styles.propertyValue}>
                <Badge appearance='tint' color={section.showlabel ?? true ? 'success' : 'danger'}>
                  {String(section.showlabel ?? true)}
                </Badge>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Controls</td>
              <td className={styles.propertyValue}>
                <Badge appearance='filled' color='brand'>
                  {section.controls.length}
                </Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <LabelsList labels={section.labels} isSaving={isSaving} onUpdateLabel={onUpdateLabel} />
    </>
  );
}
