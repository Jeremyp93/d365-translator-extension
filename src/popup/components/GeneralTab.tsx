/**
 * General tab content - Quick Actions and Translation Tools
 */

import { Divider, makeStyles, tokens, Dropdown, Option, Label } from '@fluentui/react-components';
import {
  Eye24Regular,
  PaintBrush24Regular,
  EyeOff24Regular,
  DocumentTable24Regular,
  Database24Regular,
  Grid24Regular,
  LocalLanguage24Regular,
} from '@fluentui/react-icons';

import { spacing } from '../../styles/theme';
import { getLanguageDisplayName } from '../../utils/languageNames';
import { ActionButton } from './ActionButton';
import type { TooltipKey } from '../../types/popup';

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: spacing.xs,
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  languageDropdownContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  },
  languageIcon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
  },
  languageDropdown: {
    flex: 1,
    minHeight: '32px',
  },
  languageListbox: {
    backgroundColor: tokens.colorBrandBackground,
    boxShadow: tokens.shadow16,
    '& .fui-Option': {
      color: tokens.colorNeutralForegroundOnBrand,
      ':hover': {
        backgroundColor: tokens.colorNeutralForegroundInverted,
        color: tokens.colorNeutralForegroundOnBrand,
      },
      ':focus': {
        backgroundColor: tokens.colorNeutralForegroundInverted,
        color: tokens.colorNeutralForegroundOnBrand,
      },
    },
  },
});

interface GeneralTabProps {
  busy: boolean;
  active: boolean;
  isValidContext: boolean;
  isDynamicsEnv: boolean;
  contextChecking: boolean;
  switchingLanguage: boolean;
  availableLanguages: number[];
  currentUserLcid: number | null;
  onShowAllFields: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onOpenFormReport: () => void;
  onOpenGlobalOptionSets: () => void;
  onOpenEntityBrowser: () => void;
  onLanguageSwitch: (lcid: number) => void;
  onHoverButton: (key: TooltipKey | null) => void;
}

export function GeneralTab({
  busy,
  active,
  isValidContext,
  isDynamicsEnv,
  contextChecking,
  switchingLanguage,
  availableLanguages,
  currentUserLcid,
  onShowAllFields,
  onActivate,
  onDeactivate,
  onOpenFormReport,
  onOpenGlobalOptionSets,
  onOpenEntityBrowser,
  onLanguageSwitch,
  onHoverButton,
}: GeneralTabProps) {
  const styles = useStyles();

  return (
    <div className={styles.tabContent}>
      {/* Quick Actions Section */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Quick Actions</div>
        <div className={styles.buttonGroup}>
          <div
            className={styles.languageDropdownContainer}
            onMouseEnter={() => {
              if (!busy && isDynamicsEnv && !contextChecking && !switchingLanguage) {
                onHoverButton('languageSelector');
              }
            }}
            onMouseLeave={() => onHoverButton(null)}
          >
            <LocalLanguage24Regular className={styles.languageIcon} />
            <Dropdown
              className={styles.languageDropdown}
              placeholder="Select language"
              value={currentUserLcid ? getLanguageDisplayName(currentUserLcid) : 'Loading...'}
              selectedOptions={currentUserLcid ? [String(currentUserLcid)] : []}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  onLanguageSwitch(Number(data.optionValue));
                }
              }}
              disabled={busy || !isDynamicsEnv || contextChecking || switchingLanguage}
              listbox={{ className: styles.languageListbox }}
            >
              {availableLanguages.map(lcid => (
                <Option key={lcid} value={String(lcid)}>
                  {getLanguageDisplayName(lcid)}
                </Option>
              ))}
            </Dropdown>
          </div>

          <ActionButton
            icon={<Eye24Regular />}
            onClick={onShowAllFields}
            disabled={busy || !isValidContext || contextChecking}
            onMouseEnter={() => onHoverButton('showAllFields')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="showAllFields"
          >
            Show All Fields
          </ActionButton>
        </div>
      </div>

      <Divider />

      {/* Translation Tools Section */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Translation Tools</div>
        <div className={styles.buttonGroup}>
          <ActionButton
            appearance="primary"
            icon={<PaintBrush24Regular />}
            onClick={onActivate}
            disabled={busy || active || !isValidContext || contextChecking}
            onMouseEnter={() => onHoverButton('highlight')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="highlight"
          >
            Highlight Fields
          </ActionButton>

          <ActionButton
            icon={<EyeOff24Regular />}
            onClick={onDeactivate}
            disabled={busy || !active || !isValidContext || contextChecking}
            onMouseEnter={() => onHoverButton('removeHighlight')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="removeHighlight"
          >
            Remove Highlight
          </ActionButton>

          <ActionButton
            appearance="primary"
            icon={<DocumentTable24Regular />}
            onClick={onOpenFormReport}
            disabled={busy || !isDynamicsEnv || contextChecking}
            onMouseEnter={() => onHoverButton('formTranslations')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="formTranslations"
          >
            Form Translations
          </ActionButton>

          <ActionButton
            icon={<Database24Regular />}
            onClick={onOpenGlobalOptionSets}
            disabled={busy || !isDynamicsEnv || contextChecking}
            onMouseEnter={() => onHoverButton('globalOptionSets')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="globalOptionSets"
          >
            Global OptionSets
          </ActionButton>

          <ActionButton
            icon={<Grid24Regular />}
            onClick={onOpenEntityBrowser}
            disabled={busy || !isDynamicsEnv || contextChecking}
            onMouseEnter={() => onHoverButton('entityBrowser')}
            onMouseLeave={() => onHoverButton(null)}
            tooltipKey="entityBrowser"
          >
            Entity Browser
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
