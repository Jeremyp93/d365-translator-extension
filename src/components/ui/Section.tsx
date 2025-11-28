import * as React from "react";
import { Text } from "@fluentui/react-components";
import { useSharedStyles } from "../../styles/theme";

interface SectionProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export default function Section({
  title,
  icon,
  children,
  headerActions,
}: SectionProps): JSX.Element {
  const sharedStyles = useSharedStyles();

  return (
    <div className={sharedStyles.section}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <Text className={sharedStyles.sectionHeader}>
            {icon && <span style={{ marginRight: "8px" }}>{icon}</span>}
            {title}
          </Text>
          {headerActions}
        </div>
      )}
      {children}
    </div>
  );
}
