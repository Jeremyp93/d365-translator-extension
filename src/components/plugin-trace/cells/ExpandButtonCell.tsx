import { makeStyles, TableCellLayout, tokens } from "@fluentui/react-components";
import {
  ChevronRight20Regular,
  ChevronDown20Regular,
} from "@fluentui/react-icons";

import { spacing } from "../../../styles/theme";

const useStyles = makeStyles({
  expandButton: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: spacing.xs,
    color: tokens.colorBrandForeground1,
  },
});

interface ExpandButtonCellProps {
  isExpanded: boolean;
  onToggle: () => void;
}

function ExpandButtonCell({ isExpanded, onToggle }: ExpandButtonCellProps) {
  const styles = useStyles();

  return (
    <TableCellLayout>
      <div
        className={styles.expandButton}
        onClick={onToggle}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
            if (e.key === " " || e.key === "Spacebar") {
              e.preventDefault(); // Prevent page scroll
            }
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown20Regular />
        ) : (
          <ChevronRight20Regular />
        )}
      </div>
    </TableCellLayout>
  );
}

export default ExpandButtonCell;
