/**
 * Language selector dropdown component
 * Handles language selection with loading, error, and empty states
 */

import { Dropdown, Option, makeStyles, tokens } from '@fluentui/react-components';
import { LocalLanguage24Regular } from '@fluentui/react-icons';

import { spacing } from '../../styles/theme';
import { getLanguageDisplayName } from '../../utils/languageNames';
import type { TooltipKey } from '../../types/popup';

const useStyles = makeStyles({
  languageDropdownContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    height: '48px',
    padding: `0 ${spacing.md}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.1s',
    transitionTimingFunction: 'ease-in-out',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      border: `1px solid ${tokens.colorNeutralStroke1Hover}`,
    },
  },
  languageIcon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
    fontSize: '24px',
  },
  languageDropdown: {
    flex: 1,
    minHeight: 'auto',
    border: 'none',
    backgroundColor: 'transparent',
    '& button': {
      border: 'none',
      backgroundColor: 'transparent',
      padding: 0,
      minHeight: 'auto',
      height: 'auto',
    },
  },
  languageListbox: {
    backgroundColor: tokens.colorBrandBackground,
    boxShadow: tokens.shadow16,
    '& .fui-Option': {
      color: tokens.colorNeutralForegroundOnBrand,
      ':hover': {
        backgroundColor: tokens.colorNeutralForegroundInverted,
      },
      ':focus': {
        backgroundColor: tokens.colorNeutralForegroundInverted,
      },
    },
  },
});

interface LanguageSelectorProps {
  availableLanguages: number[];
  currentUserLcid: number | null;
  languagesLoading: boolean;
  languagesError: string | null;
  switchingLanguage: boolean;
  busy: boolean;
  isDynamicsEnv: boolean;
  contextChecking: boolean;
  onLanguageSwitch: (lcid: number) => void;
  onHoverButton: (key: TooltipKey | null) => void;
}

export function LanguageSelector({
  availableLanguages,
  currentUserLcid,
  languagesLoading,
  languagesError,
  switchingLanguage,
  busy,
  isDynamicsEnv,
  contextChecking,
  onLanguageSwitch,
  onHoverButton,
}: LanguageSelectorProps) {
  const styles = useStyles();

  const getDropdownValue = () => {
    if (languagesError) return 'Failed to load languages';
    if (languagesLoading) return 'Loading...';
    if (currentUserLcid) return getLanguageDisplayName(currentUserLcid);
    return 'Select language';
  };

  const isDisabled = () => {
    return busy || !isDynamicsEnv || contextChecking || switchingLanguage || languagesError !== null;
  };

  return (
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
        value={getDropdownValue()}
        selectedOptions={currentUserLcid ? [String(currentUserLcid)] : []}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            onLanguageSwitch(Number(data.optionValue));
          }
        }}
        disabled={isDisabled()}
        listbox={{ className: styles.languageListbox }}
        onFocus={() => {
          if (!busy && isDynamicsEnv && !contextChecking && !switchingLanguage) {
            onHoverButton('languageSelector');
          }
        }}
        onBlur={() => onHoverButton(null)}
      >
        {availableLanguages.length === 0 ? (
          <Option disabled value="">
            No languages available
          </Option>
        ) : (
          availableLanguages.map(lcid => (
            <Option key={lcid} value={String(lcid)}>
              {getLanguageDisplayName(lcid)}
            </Option>
          ))
        )}
      </Dropdown>
    </div>
  );
}
