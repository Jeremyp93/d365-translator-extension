import { makeStyles, TableCellLayout, Badge, Text, tokens } from "@fluentui/react-components";

import { spacing } from "../../../styles/theme";

const useStyles = makeStyles({
  flexColumn: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
  exceptionText: {
    fontFamily: "monospace",
    fontSize: tokens.fontSizeBase200,
    maxWidth: "400px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

interface ExceptionCellProps {
  exceptionDetails?: string;
}

function ExceptionCell({ exceptionDetails }: ExceptionCellProps) {
  const styles = useStyles();

  return (
    <TableCellLayout truncate title={exceptionDetails}>
      {exceptionDetails ? (
        <div className={styles.flexColumn}>
          <Badge color="danger">Yes</Badge>
          <Text className={styles.exceptionText}>
            {exceptionDetails}
          </Text>
        </div>
      ) : (
        "-"
      )}
    </TableCellLayout>
  );
}

export default ExceptionCell;
