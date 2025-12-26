import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Spinner,
  MessageBar,
  makeStyles,
  tokens,
  Button,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Node,
  MarkerType,
} from "reactflow";

import {
  getLogsForCorrelation,
  PluginTraceLog,
} from "../../services/pluginTraceLogService";
import { useOrgContext } from "../../hooks/useOrgContext";
import {
  buildFlowGraph,
  FlowNode,
  FlowEdge,
  FlowGraph,
  FlowNodeData,
} from "../../utils/flowGraphBuilder";
import { LRUCache } from "../../utils/lruCache";
import CorrelationFlowNode from "./CorrelationFlowNode";

import "reactflow/dist/style.css";
import "../../styles/flow.css";

const useStyles = makeStyles({
  panel: {
    position: "fixed",
    top: 0,
    right: 0,
    width: "60vw",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow64,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    "@media (max-width: 768px)": {
      width: "100vw",
    },
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 999,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    marginTop: tokens.spacingVerticalXXS,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  flowContainer: {
    flex: 1,
    position: "relative",
  },
  swimlaneLabel: {
    position: "absolute",
    top: "20px",
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusLarge,
    border: `2px solid ${tokens.colorBrandStroke1}`,
    zIndex: 10,
    boxShadow: tokens.shadow8,
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

interface CorrelationFlowPanelProps {
  isOpen: boolean;
  correlationId: string | null;
  selectedRowId: string | null;
  expandedRowIds: Set<string>;
  onClose: () => void;
  onNodeClick: (rowId: string) => void;
}

// Session-level cache for correlation flow data
const flowCache = new LRUCache<string, FlowGraph>(20);

const nodeTypes = {
  default: CorrelationFlowNode,
};

function CorrelationFlowPanel({
  isOpen,
  correlationId,
  selectedRowId,
  expandedRowIds,
  onClose,
  onNodeClick,
}: CorrelationFlowPanelProps) {
  const styles = useStyles();
  const { clientUrl, apiVersion } = useOrgContext();
  const baseUrl = clientUrl;

  const [flowData, setFlowData] = useState<FlowGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch correlation data when panel opens or correlationId changes
  useEffect(() => {
    if (!isOpen || !correlationId || !baseUrl) {
      return;
    }

    // Check cache first
    const cached = flowCache.get(correlationId);
    if (cached) {
      setFlowData(cached);
      setError(null);
      return;
    }

    // Fetch from D365
    setLoading(true);
    setError(null);

    getLogsForCorrelation(baseUrl, correlationId, apiVersion)
      .then((logs: PluginTraceLog[]) => {
        const graph = buildFlowGraph(logs);
        flowCache.set(correlationId, graph);
        setFlowData(graph);
      })
      .catch((err: Error) => {
        console.error("Failed to fetch correlation logs:", err);
        setError("Failed to load correlation flow. Please try again.");
        setFlowData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, correlationId, baseUrl, apiVersion]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  // Apply highlights to nodes based on selected and expanded state
  const nodesWithHighlight = useMemo(() => {
    if (!flowData) return [];

    return flowData.nodes.map((node: FlowNode) => {
      const isSelected = node.id === selectedRowId;
      const isExpanded = expandedRowIds.has(node.id);

      return {
        ...node,
        selected: isSelected,
        data: {
          ...node.data,
          isExpanded,
        },
        // style: {
        //   ...node.style,
        //   backgroundColor: 'transparent', // Override to let CustomNode handle styling
        // }
      };
    });
  }, [flowData, selectedRowId, expandedRowIds]);

  // Get unique depth levels for swimlane headers
  const depthLevels = useMemo(() => {
    if (!flowData) return [];
    const depths = new Set(flowData.nodes.map((node) => node.data.depth));
    return Array.from(depths).sort((a, b) => a - b);
  }, [flowData]);

  // Enhanced edge styling
  const edgesWithStyling = useMemo(() => {
    if (!flowData) return [];

    return flowData.edges.map((edge: FlowEdge) => ({
      ...edge,
      style: {
        stroke:
          edge.data?.type === "parent-child"
            ? tokens.colorBrandForeground1
            : tokens.colorNeutralForeground1,
        strokeWidth: 3,
        strokeDasharray: edge.data?.type === "parent-child" ? "8,4" : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 25,
        height: 25,
        color:
          edge.data?.type === "parent-child"
            ? tokens.colorBrandForeground1
            : tokens.colorNeutralForeground1,
      },
      label: edge.data?.type === "parent-child" ? "calls" : "then",
      labelStyle: {
        fill: tokens.colorNeutralForeground1,
        fontSize: 12,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: tokens.colorBrandForeground1,
        fillOpacity: 0.9,
      },
      animated: false,
      type: edge.data?.type === "parent-child" ? "smoothstep" : "straight",
    }));
  }, [flowData]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Correlation Flow</div>
            <div className={styles.subtitle}>{correlationId || "Unknown"}</div>
          </div>
          <Button
            appearance="subtle"
            icon={<Dismiss24Regular />}
            onClick={onClose}
            aria-label="Close panel"
          />
        </div>

        <div className={styles.content}>
          {loading && (
            <div className={styles.loadingContainer}>
              <Spinner label="Loading correlation flow..." />
            </div>
          )}

          {error && !loading && <MessageBar intent="error">{error}</MessageBar>}

          {!loading && !error && flowData && (
            <div className={styles.flowContainer}>
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodesWithHighlight}
                  edges={edgesWithStyling}
                  nodeTypes={nodeTypes}
                  onNodeClick={handleNodeClick}
                  fitView
                  minZoom={0.1}
                  maxZoom={2}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={true}
                  selectNodesOnDrag={false}
                  defaultEdgeOptions={{
                    animated: false,
                    style: { strokeWidth: 2 },
                    markerEnd: {
                      type: MarkerType.ArrowClosed,
                      width: 20,
                      height: 20,
                    },
                  }}
                >
                  <Background
                    color={tokens.colorNeutralStroke2}
                    gap={16}
                    size={1}
                  />
                  <Controls />
                  <MiniMap
                    nodeColor={(node: Node<FlowNodeData>) => {
                      if (node.data?.hasException)
                        return tokens.colorPaletteRedBackground2;
                      if (node.selected) return tokens.colorBrandBackground;
                      return tokens.colorNeutralBackground4;
                    }}
                    maskColor={tokens.colorNeutralBackground1}
                  />
                </ReactFlow>
              </ReactFlowProvider>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CorrelationFlowPanel;
