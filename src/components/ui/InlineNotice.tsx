import { makeStyles, tokens, shorthands } from "@fluentui/react-components";
import {
  Info20Regular,
  ErrorCircle20Regular,
  CheckmarkCircle20Regular,
} from "@fluentui/react-icons";
import { spacing } from "../../styles/theme";

const useStyles = makeStyles({
  notice: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(spacing.sm),
    ...shorthands.padding(spacing.sm, spacing.md),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    animationName: {
      from: { opacity: 0, transform: "translateY(-4px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    },
    animationDuration: "0.2s",
    animationTimingFunction: "ease-out",
  },
  info: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
  },
  error: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    color: tokens.colorPaletteRedForeground1,
  },
  success: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    color: tokens.colorPaletteGreenForeground1,
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
  },
});

export type InlineNoticeVariant = "info" | "error" | "success";

export interface InlineNoticeProps {
  variant?: InlineNoticeVariant;
  children: React.ReactNode;
}

export default function InlineNotice({
  variant = "info",
  children,
}: InlineNoticeProps): JSX.Element {
  const styles = useStyles();

  const Icon =
    variant === "error"
      ? ErrorCircle20Regular
      : variant === "success"
      ? CheckmarkCircle20Regular
      : Info20Regular;

  return (
    <div className={`${styles.notice} ${styles[variant]}`}>
      <Icon className={styles.icon} />
      <div className={styles.text}>{children}</div>
    </div>
  );
}
