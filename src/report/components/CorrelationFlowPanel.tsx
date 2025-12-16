import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Spinner,
  MessageBar,
  makeStyles,
  tokens,
  Button
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Node,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

import { getLogsForCorrelation, PluginTraceLog } from '../../services/pluginTraceLogService';
import { useOrgContext } from '../../hooks/useOrgContext';
import { buildFlowGraph, FlowNode, FlowEdge, FlowGraph, FlowNodeData } from '../utils/flowGraphBuilder';

import '../../styles/flow.css';

const useStyles = makeStyles({
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '60vw',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow64,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    '@media (max-width: 768px)': {
      width: '100vw',
    }
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 999
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    marginTop: tokens.spacingVerticalXXS
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  flowContainer: {
    flex: 1,
    position: 'relative'
  },
  swimlaneLabel: {
    position: 'absolute',
    top: '20px',
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusLarge,
    border: `2px solid ${tokens.colorBrandStroke1}`,
    zIndex: 10,
    boxShadow: tokens.shadow8
  },
  exceptionBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightBold
  }
});

interface CorrelationFlowPanelProps {
  isOpen: boolean;
  correlationId: string | null;
  selectedRowId: string | null;
  expandedRowIds: Set<string>;
  onClose: () => void;
  onNodeClick: (rowId: string) => void;
}

/**
 * LRU Cache for correlation flow data
 */
class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Session-level cache for correlation flow data
const flowCache = new LRUCache<string, FlowGraph>(20);

/**
 * Custom node component with styling based on state
 */
const CustomNode = ({ data, selected }: { data: FlowNodeData; selected: boolean }) => {
  const styles = useStyles();
  
  const nodeStyle: React.CSSProperties = {
    position: 'relative',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    border: data.hasException 
      ? `2px solid ${tokens.colorPaletteRedBorder1}` 
      : selected 
        ? `2px solid ${tokens.colorBrandStroke1}`
        : `1px solid ${tokens.colorNeutralStroke1}`,
    borderStyle: data.mode === 'Asynchronous' ? 'dashed' : 'solid',
    backgroundColor: selected 
      ? tokens.colorBrandBackground2 
      : data.hasException 
        ? tokens.colorPaletteRedBackground1
        : tokens.colorNeutralBackground1,
    minWidth: '200px',
    maxWidth: '240px',
    fontSize: tokens.fontSizeBase200,
    boxShadow: selected ? tokens.shadow8 : tokens.shadow4,
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  };

  const getDurationBadgeColor = (duration: number) => {
    if (duration < 1000) return tokens.colorPaletteGreenForeground1;
    if (duration < 5000) return tokens.colorPaletteDarkOrangeForeground1;
    return tokens.colorPaletteRedForeground1;
  };

  // Truncate long type names for better display
  const displayName = data.typeName.split(',')[0];

  return (
    <div style={nodeStyle}>
      <Handle 
        type="target" 
        position={Position.Left}
        style={{ 
          width: 8, 
          height: 8, 
          background: tokens.colorNeutralStroke1,
          border: `1px solid ${tokens.colorNeutralBackground1}`
        }}
      />
      <Handle 
        type="source" 
        position={Position.Right}
        style={{ 
          width: 8, 
          height: 8, 
          background: tokens.colorNeutralStroke1,
          border: `1px solid ${tokens.colorNeutralBackground1}`
        }}
      />
      {data.hasException && (
        <div className={styles.exceptionBadge}>!</div>
      )}
      <div style={{ 
        fontSize: tokens.fontSizeBase300, 
        fontWeight: tokens.fontWeightSemibold,
        marginBottom: tokens.spacingVerticalS,
        color: tokens.colorNeutralForeground1,
        wordBreak: 'break-word',
        lineHeight: '1.2'
      }} title={data.typeName}>
        {displayName}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalXXS,
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
        paddingTop: tokens.spacingVerticalXS,
        marginTop: tokens.spacingVerticalXXS
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacingHorizontalXS
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getDurationBadgeColor(data.duration),
            flexShrink: 0
          }} />
          <div style={{ 
            fontSize: tokens.fontSizeBase200, 
            color: tokens.colorNeutralForeground2
          }}>
            {data.duration}ms
          </div>
        </div>
        <div style={{ 
          fontSize: tokens.fontSizeBase200, 
          color: tokens.colorNeutralForeground2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span title={data.message}>
            {data.message.length > 15 ? data.message.substring(0, 15) + '...' : data.message}
          </span>
          <span>{data.depth}</span>
          {data.mode === 'Asynchronous' && (
            <span style={{ 
              fontSize: tokens.fontSizeBase100,
              color: tokens.colorNeutralForeground3,
              fontStyle: 'italic'
            }}>(Async)</span>
          )}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  default: CustomNode
};

function CorrelationFlowPanel({
  isOpen,
  correlationId,
  selectedRowId,
  expandedRowIds,
  onClose,
  onNodeClick
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
        console.error('Failed to fetch correlation logs:', err);
        setError('Failed to load correlation flow. Please try again.');
        setFlowData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, correlationId, baseUrl, apiVersion]);

  // Handle node click
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    onNodeClick(node.id);
  }, [onNodeClick]);

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
            isExpanded
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
    const depths = new Set(flowData.nodes.map(node => node.data.depth));
    return Array.from(depths).sort((a, b) => a - b);
  }, [flowData]);

  // Enhanced edge styling
  const edgesWithStyling = useMemo(() => {
    if (!flowData) return [];
    
    return flowData.edges.map((edge: FlowEdge) => ({
      ...edge,
      style: {
        stroke: edge.data?.type === 'parent-child' 
          ? tokens.colorBrandForeground1
          : tokens.colorNeutralForeground1,
        strokeWidth: 3,
        strokeDasharray: edge.data?.type === 'parent-child' ? '8,4' : undefined
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 25,
        height: 25,
        color: edge.data?.type === 'parent-child' 
          ? tokens.colorBrandForeground1 
          : tokens.colorNeutralForeground1
      },
      label: edge.data?.type === 'parent-child' ? 'calls' : 'then',
      labelStyle: {
        fill: tokens.colorNeutralForeground1,
        fontSize: 12,
        fontWeight: 600
      },
      labelBgStyle: {
        fill: tokens.colorBrandForeground1,
        fillOpacity: 0.9
      },
      animated: false,
      type: edge.data?.type === 'parent-child' ? 'smoothstep' : 'straight'
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
            <div className={styles.title}>
              Correlation Flow
            </div>
            <div className={styles.subtitle}>
              {correlationId || 'Unknown'}
            </div>
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

        {error && !loading && (
          <MessageBar intent="error">
            {error}
          </MessageBar>
        )}

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
                    height: 20
                  }
                }}
              >
                <Background
                  color={tokens.colorNeutralStroke2}
                  gap={16}
                  size={1}
                />
                <Controls />
                <MiniMap
                  nodeColor={(node: any) => {
                    if (node.data?.hasException) return tokens.colorPaletteRedBackground2;
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