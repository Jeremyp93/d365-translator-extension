/**
 * SaveStatusBar - Display save status messages
 */

import { makeStyles, MessageBar, MessageBarBody, MessageBarTitle, tokens } from '@fluentui/react-components';
import { CheckmarkCircle20Regular, ErrorCircle20Regular, Info20Regular } from '@fluentui/react-icons';

import { spacing } from '../../styles/theme';

const useStyles = makeStyles({
  container: {
    padding: `${spacing.lg} ${spacing.xl}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
});

export interface SaveStatusBarProps {
  saveSuccess: boolean;
  saveError: string | null;
  saveStatus: string | null;
}

export default function SaveStatusBar({ saveSuccess, saveError, saveStatus }: SaveStatusBarProps): JSX.Element | null {
  const styles = useStyles();

  if (!saveSuccess && !saveError && !saveStatus) {
    return null;
  }

  return (
    <div className={styles.container}>
      {saveSuccess && (
        <MessageBar intent='success'>
          <MessageBarBody>
            <MessageBarTitle>
              <CheckmarkCircle20Regular /> Saved & Published Successfully
            </MessageBarTitle>
            Form structure has been updated for all languages and published.
          </MessageBarBody>
        </MessageBar>
      )}

      {saveError && (
        <MessageBar intent='error'>
          <MessageBarBody>
            <MessageBarTitle>
              <ErrorCircle20Regular /> Save Failed
            </MessageBarTitle>
            {saveError}
          </MessageBarBody>
        </MessageBar>
      )}

      {saveStatus && !saveError && (
        <MessageBar intent='info'>
          <MessageBarBody>
            <MessageBarTitle>
              <Info20Regular /> Saving
            </MessageBarTitle>
            {saveStatus}
          </MessageBarBody>
        </MessageBar>
      )}
    </div>
  );
}
