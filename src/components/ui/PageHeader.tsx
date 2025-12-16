import * as React from "react";
import { Text, makeStyles, shorthands, tokens } from "@fluentui/react-components";
import { useSharedStyles, spacing } from "../../styles/theme";
import { Building20Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    //...shorthands.gap(spacing.sm),
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.md),
  },
  actions: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
  }
});

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  connectionInfo?: {
    clientUrl: string;
    apiVersion: string | undefined;
  };
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  connectionInfo,
  icon,
  actions,
}: PageHeaderProps): JSX.Element {
  const styles = useStyles();
  const sharedStyles = useSharedStyles();

  return (
    <div className={sharedStyles.pageHeader}>
      <div className={styles.container}>
        <div className={styles.titleRow}>
          {icon && <div className={sharedStyles.iconContainer}>{icon}</div>}
          <Text className={sharedStyles.pageTitle}>{title}</Text>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        {subtitle && (
          <Text className={sharedStyles.pageSubtitle}>{subtitle}</Text>
        )}
        {connectionInfo && <Text className={sharedStyles.pageConnectionInfo}><Building20Regular /> Connected to: {connectionInfo.clientUrl} - Api Version: {connectionInfo.apiVersion ?? "v9.2"}</Text>}
      </div>
    </div>
  );
}
