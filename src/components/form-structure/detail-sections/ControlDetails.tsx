/**
 * ControlDetails - Display properties for a form control
 */

import { Badge, Card, CardHeader, Divider, makeStyles, Text, tokens } from '@fluentui/react-components';

import type { FormControl } from '../../../types';
import { spacing } from '../../../styles/theme';
import { getControlTypeName, isEditableControlType } from '../../../utils/controlClassIds';
import LabelsList from './LabelsList';

const useStyles = makeStyles({
  detailsCard: {
    marginBottom: spacing.lg,
    boxShadow: tokens.shadow8,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
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
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  propertyLabel: {
    paddingRight: spacing.md,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    width: '180px',
    verticalAlign: 'top',
    '@media (max-width: 768px)': {
      width: '120px',
      paddingLeft: spacing.sm,
    },
  },
  propertyValue: {
    padding: spacing.md,
    color: tokens.colorNeutralForeground1,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    '@media (max-width: 768px)': {
      padding: spacing.sm,
    },
  },
  smallCode: {
    fontSize: tokens.fontSizeBase200,
  },
});

export interface ControlDetailsProps {
  control: FormControl;
  readOnly: boolean;
  clientUrl?: string;
  entity?: string;
  formId?: string;
  onUpdateLabel: (lcid: number, value: string) => void;
}

export default function ControlDetails({
  control,
  readOnly,
  clientUrl,
  entity,
  formId,
  onUpdateLabel,
}: ControlDetailsProps): JSX.Element {
  const styles = useStyles();

  return (
    <>
      <Card className={styles.detailsCard}>
        <CardHeader header={<Text weight='semibold'>Control Properties</Text>} />
        <Divider />
        <table className={styles.propertiesTable}>
          <tbody>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>ID</td>
              <td className={styles.propertyValue}>
                <code>{control.id}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Name</td>
              <td className={styles.propertyValue}>
                <code>{control.name || '(none)'}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Data Field</td>
              <td className={styles.propertyValue}>
                <code>{control.datafieldname || '(none)'}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Label ID (Cell ID)</td>
              <td className={styles.propertyValue}>
                <code>{control.cellId || '(none)'}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Class ID</td>
              <td className={styles.propertyValue}>
                <code className={styles.smallCode}>{getControlTypeName(control.classId)}</code>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Visible</td>
              <td className={styles.propertyValue}>
                <Badge appearance='tint' color={control.visible ?? true ? 'success' : 'danger'}>
                  {String(control.visible ?? true)}
                </Badge>
              </td>
            </tr>
            <tr className={styles.propertyRow}>
              <td className={styles.propertyLabel}>Disabled</td>
              <td className={styles.propertyValue}>
                <Badge appearance='tint' color={control.disabled ?? false ? 'danger' : 'success'}>
                  {String(control.disabled ?? false)}
                </Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {isEditableControlType(control.classId) && (
        <LabelsList
          labels={control.labels}
          readOnly={readOnly}
          onUpdateLabel={onUpdateLabel}
          clientUrl={clientUrl}
          entity={entity}
          formId={formId}
          attribute={control.datafieldname}
          cellId={control.cellId}
        />
      )}
    </>
  );
}
