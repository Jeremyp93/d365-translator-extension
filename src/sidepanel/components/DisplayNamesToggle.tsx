import { Switch, makeStyles, Spinner, tokens, type SwitchOnChangeData } from '@fluentui/react-components';
import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  helperText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

interface DisplayNamesToggleProps {
  checked: boolean;
  loading: boolean;
  onChange: (ev: React.ChangeEvent<HTMLInputElement>, data: SwitchOnChangeData) => void;
  disabled?: boolean;
}

export function DisplayNamesToggle({
  checked,
  loading,
  onChange,
  disabled = false,
}: DisplayNamesToggleProps): JSX.Element {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <Switch
          checked={checked}
          onChange={onChange}
          disabled={disabled || loading}
          label="Show Display Names"
        />
        {loading && <Spinner size="tiny" />}
      </div>
    </div>
  );
}
