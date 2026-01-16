import {
  makeStyles,
  tokens,
  Skeleton,
  SkeletonItem,
} from "@fluentui/react-components";
import { spacing } from "../styles/theme";

const useStyles = makeStyles({
  container: {
    borderRadius: tokens.borderRadiusMedium,
    overflow: "hidden",
    width: "100%",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  languageColumn: {
    width: "280px",
    minWidth: "200px",
    maxWidth: "320px",
  },
  labelColumn: {
    flex: 1,
  },
});

export interface TranslationsTableSkeletonProps {
  /** Number of rows to show in skeleton */
  rows?: number;
}

export default function TranslationsTableSkeleton({
  rows = 5,
}: TranslationsTableSkeletonProps): JSX.Element {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Skeleton>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className={styles.row}>
            <div className={styles.languageColumn}>
              <SkeletonItem size={16} />
            </div>
            <div className={styles.labelColumn}>
              <SkeletonItem size={16} />
            </div>
          </div>
        ))}
      </Skeleton>
    </div>
  );
}
