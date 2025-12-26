import { makeStyles, tokens } from "@fluentui/react-components";
import { Handle, Position } from "reactflow";

import { FlowNodeData } from "../../utils/flowGraphBuilder";

const useStyles = makeStyles({
  node: {
    position: "relative",
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    minWidth: "200px",
    maxWidth: "240px",
    fontSize: tokens.fontSizeBase200,
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  handle: {
    width: "8px",
    height: "8px",
    background: tokens.colorNeutralStroke1,
    border: `1px solid ${tokens.colorNeutralBackground1}`,
  },
  title: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground1,
    wordBreak: "break-word",
    lineHeight: "1.2",
  },
  metadataContainer: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalXXS,
  },
  durationRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  durationBadge: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  durationText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  detailsRow: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  asyncLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  exceptionBadge: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightBold,
  },
});

interface CorrelationFlowNodeProps {
  data: FlowNodeData;
  selected: boolean;
}

const getDurationBadgeColor = (duration: number) => {
  if (duration < 1000) return tokens.colorPaletteGreenForeground1;
  if (duration < 5000) return tokens.colorPaletteDarkOrangeForeground1;
  return tokens.colorPaletteRedForeground1;
};

function CorrelationFlowNode({ data, selected }: CorrelationFlowNodeProps) {
  const styles = useStyles();

  // Dynamic styles based on state
  const border = data.hasException
    ? `2px solid ${tokens.colorPaletteRedBorder1}`
    : selected
    ? `2px solid ${tokens.colorBrandStroke1}`
    : `1px solid ${tokens.colorNeutralStroke1}`;

  const borderStyle = data.mode === "Asynchronous" ? "dashed" : "solid";

  const backgroundColor = selected
    ? tokens.colorBrandBackground2
    : data.hasException
    ? tokens.colorPaletteRedBackground1
    : tokens.colorNeutralBackground1;

  const boxShadow = selected ? tokens.shadow8 : tokens.shadow4;

  // Truncate long type names for better display
  const displayName = data.typeName.split(",")[0];

  return (
    <div
      className={styles.node}
      style={{
        border,
        borderStyle,
        backgroundColor,
        boxShadow,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
      />
      {data.hasException && <div className={styles.exceptionBadge}>!</div>}
      <div className={styles.title} title={data.typeName}>
        {displayName}
      </div>
      <div className={styles.metadataContainer}>
        <div className={styles.durationRow}>
          <div
            className={styles.durationBadge}
            style={{
              backgroundColor: getDurationBadgeColor(data.duration),
            }}
          />
          <div className={styles.durationText}>{data.duration}ms</div>
        </div>
        <div className={styles.detailsRow}>
          <span title={data.message}>
            {data.message.length > 15
              ? data.message.substring(0, 15) + "..."
              : data.message}
          </span>
          <span>{data.depth}</span>
          {data.mode === "Asynchronous" && (
            <span className={styles.asyncLabel}>(Async)</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default CorrelationFlowNode;
