import { makeStyles, Text, tokens } from "@fluentui/react-components";

import { useSharedStyles } from "../../styles/theme";

interface SectionProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

const useStyles = makeStyles({
  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: tokens.spacingVerticalM,
  },
  iconSpacing: {
    marginRight: tokens.spacingHorizontalS,
  },
});

export default function Section({
  title,
  icon,
  children,
  headerActions,
}: SectionProps): JSX.Element {
  const sharedStyles = useSharedStyles();
  const styles = useStyles();

  return (
    <div className={sharedStyles.section}>
      {title && (
        <div className={styles.headerContainer}>
          <Text className={sharedStyles.sectionHeader}>
            {icon && <span className={styles.iconSpacing}>{icon}</span>}
            {title}
          </Text>
          {headerActions}
        </div>
      )}
      {children}
    </div>
  );
}
