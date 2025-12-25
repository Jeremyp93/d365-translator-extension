import type { PluginTraceLog } from '../services/pluginTraceLogService';
import type { Node, Edge } from 'reactflow';

/**
 * Flow node data structure containing plugin trace log information
 */
export interface FlowNodeData {
  /** The trace ID (unique identifier) */
  traceid: string;
  /** Plugin type name for display */
  typeName: string;
  /** Plugin stage: PreValidation, PreOperation, or PostOperation */
  message: string;
  /** Execution mode: Synchronous or Asynchronous */
  mode: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether this operation threw an exception */
  hasException: boolean;
  /** Depth level in the execution chain */
  depth: number;
}

/**
 * React Flow node with plugin trace log data
 */
export type FlowNode = Node<FlowNodeData>;

/**
 * React Flow edge with metadata
 */
export type FlowEdge = Edge<{ type: 'sequence' | 'parent-child' }>;

/**
 * Complete flow graph structure
 */
export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * Constants for deterministic node positioning
 */
const LANE_WIDTH = 350; // Horizontal spacing between depth lanes
const ROW_SPACING = 200; // Vertical spacing between operations

/**
 * Get human-readable stage name from operation type
 */
function getStageName(operationType: number): string {
  switch (operationType) {
    case 1: return 'PreValidation';
    case 2: return 'PreOperation';
    case 4: return 'PostOperation';
    default: return 'Unknown';
  }
}

/**
 * Get human-readable mode name from mode number
 */
function getModeName(mode: number): string {
  return mode === 0 ? 'Synchronous' : 'Asynchronous';
}

/** Extract the "root type" (class name before the first comma) */
function getPrefix(typename?: string): string {
  if (!typename) return '';
  const idx = typename.indexOf('.');
  return idx === -1 ? typename : typename.substring(0, idx);
}

/**
 * Build a flow graph from an array of plugin trace logs.
 * 
 * This function creates a swimlane diagram structure where:
 * - X-axis represents depth (0, 1, 2, etc.) in separate lanes
 * - Y-axis represents execution order (chronological from top to bottom)
 * - Sequence edges connect consecutive operations at the same depth
 * - Parent-child edges connect operations when depth increases
 * 
 * Positioning Algorithm:
 * - x = depth * LANE_WIDTH (horizontal position by depth lane)
 * - y = index * ROW_SPACING (vertical position by execution order)
 * 
 * @param logs - Array of PluginTraceLog records, should be sorted by createdon
 * @returns FlowGraph containing nodes and edges for React Flow rendering
 */
// export function buildFlowGraph(logs: PluginTraceLog[]): FlowGraph {
//   if (!logs || logs.length === 0) {
//     return { nodes: [], edges: [] };
//   }

//   const nodes: FlowNode[] = [];
//   const edges: FlowEdge[] = [];
  
//   // Track the last node at each depth level for creating parent-child edges
//   const lastNodeAtDepth = new Map<number, string>();
  
//   // Track the next available Y position for each depth
//   const nextYByDepth = new Map<number, number>();
  
//   // Track the maximum Y position used globally
//   let maxYGlobal = 0;

//   logs.forEach((log, index) => {
//     const nodeId = log.plugintracelogid;
    
//     // Calculate vertical position
//     let yPosition: number;
    
//     if (index === 0) {
//       // First node starts at 0
//       yPosition = 0;
//       nextYByDepth.set(log.depth, ROW_SPACING);
//       maxYGlobal = 0;
//     } else {
//       const prevLog = logs[index - 1];
//       const sameTime = prevLog.createdon === log.createdon;
//       const sameDepth = log.depth === prevLog.depth;
      
//       if (sameTime && sameDepth) {
//         // Same timestamp AND same depth: stack vertically
//         const currentY = nextYByDepth.get(log.depth) || 0;
//         yPosition = currentY;
//         nextYByDepth.set(log.depth, currentY + ROW_SPACING);
//         maxYGlobal = Math.max(maxYGlobal, yPosition);
//       } else if (sameTime && !sameDepth) {
//         // Same timestamp, different depth: align horizontally at current max Y
//         const currentY = nextYByDepth.get(log.depth);
//         if (currentY === undefined || currentY <= maxYGlobal) {
//           yPosition = maxYGlobal;
//           nextYByDepth.set(log.depth, maxYGlobal + ROW_SPACING);
//         } else {
//           yPosition = currentY;
//           nextYByDepth.set(log.depth, currentY + ROW_SPACING);
//         }
//       } else {
//         // Different timestamp: start new row after all previous
//         maxYGlobal += ROW_SPACING;
//         yPosition = maxYGlobal;
//         nextYByDepth.set(log.depth, maxYGlobal + ROW_SPACING);
//       }
//     }
    
//     // Calculate position using deterministic formula
//     const position = {
//       x: log.depth * LANE_WIDTH,
//       y: yPosition
//     };

//     // Create node with plugin trace log data
//     const node: FlowNode = {
//       id: nodeId,
//       type: 'default',
//       position,
//       data: {
//         traceid: nodeId,
//         typeName: log.typename || 'Unknown',
//         stage: getStageName(log.operationtype),
//         mode: getModeName(log.mode),
//         duration: log.performanceexecutionduration || 0,
//         hasException: !!(log.exceptiondetails && log.exceptiondetails.trim() !== ''),
//         depth: log.depth
//       }
//     };

//     nodes.push(node);

//     // Create sequence edge to previous node at same depth
//     const previousAtSameDepth = lastNodeAtDepth.get(log.depth);
//     if (previousAtSameDepth && index > 0) {
//       edges.push({
//         id: `seq-${previousAtSameDepth}-${nodeId}`,
//         source: previousAtSameDepth,
//         target: nodeId,
//         type: 'default',
//         data: { type: 'sequence' }
//       });
//     }

//     // Create parent-child edge when depth increases
//     if (log.depth > 0) {
//       const parentDepth = log.depth - 1;
//       const parentNodeId = lastNodeAtDepth.get(parentDepth);
      
//       if (parentNodeId) {
//         edges.push({
//           id: `parent-${parentNodeId}-${nodeId}`,
//           source: parentNodeId,
//           target: nodeId,
//           type: 'default',
//           animated: false,
//           data: { type: 'parent-child' }
//         });
//       }
//     }

//     // Update tracking for this depth level
//     lastNodeAtDepth.set(log.depth, nodeId);
//   });

//   return { nodes, edges };
// }
export function buildFlowGraph(logs: PluginTraceLog[]): FlowGraph {
  if (!logs || logs.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 1. Sort by createdon (then by original index for stability)
  const sorted = [...logs].sort((a, b) => {
  const ta = new Date(a.createdon).getTime();
  const tb = new Date(b.createdon).getTime();

  if (ta !== tb) return ta - tb;           // earlier time first

  // Same timestamp → shallower depth first
  if (a.depth !== b.depth) return a.depth - b.depth;

  // Optional tie-breakers to keep it stable / predictable
  const msgCmp = (a.messagename || '').localeCompare(b.messagename || '');
  if (msgCmp !== 0) return msgCmp;

  return (a.typename || '').localeCompare(b.typename || '');
});

  // 2. Map actual depths → compact lane indices (e.g. depths {1,3} → lanes {0,1})
  const uniqueDepths = Array.from(new Set(sorted.map(l => l.depth))).sort((a, b) => a - b);
  const depthToLaneIndex = new Map<number, number>();
  uniqueDepths.forEach((depth, idx) => depthToLaneIndex.set(depth, idx));

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const createdOnMs = (log: PluginTraceLog) => new Date(log.createdon).getTime();

  /**
   * Compute a confidence score that candidate `p` is the parent of child `c`.
   * Return -Infinity if clearly impossible.
   */
  function scoreParent(p: PluginTraceLog, c: PluginTraceLog): number {
    const pTime = createdOnMs(p);
    const cTime = createdOnMs(c);

    // Parent must be earlier or same time
    if (pTime > cTime) return Number.NEGATIVE_INFINITY;

    // Parent must be shallower depth
    if (p.depth >= c.depth) return Number.NEGATIVE_INFINITY;

    const timeDiff = cTime - pTime; // ms

    // Ignore if too far apart (more than 2 minutes by default)
    const MAX_PARENT_TIME_DIFF_MS = 120_000;
    if (timeDiff > MAX_PARENT_TIME_DIFF_MS) {
      return Number.NEGATIVE_INFINITY;
    }

    let score = 0;

    const sameType = (p.typename || '') === (c.typename || '');
    const sameRootType = getPrefix(p.typename) === getPrefix(c.typename);
    const sameMessage = (p.messagename || '') === (c.messagename || '');
    const depthDiff = c.depth - p.depth; // > 0

    // Strongest signal: exact same typename
    if (sameType) score += 6;

    // Related type (same class/namespace before comma)
    if (!sameType && sameRootType) score += 3;

    // Same message (Create/Update/etc.)
    if (sameMessage) score += 2;

    // Prefer parents that are just one or two depths above the child
    if (depthDiff === 1) score += 3;
    else if (depthDiff === 2) score += 2;
    else if (depthDiff === 3) score += 1;

    // Light penalty for larger time gaps within the acceptable window
    if (timeDiff > 0) {
      score -= timeDiff / 10_000; // -0.1 per second
    }

    return score;
  }

  /**
   * Find most likely parent index for child at `childIndex`, or null if
   * no candidate is confident enough.
   */
  function findParentIndex(childIndex: number): number | null {
  const child = sorted[childIndex];
  if (child.depth <= 0) return null;

  const childTime = createdOnMs(child);
  const childPrefix = getPrefix(child.typename);
  const childDepth = child.depth;

  let bestIndex: number | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < sorted.length; i++) {
    if (i === childIndex) continue;

    const cand = sorted[i];
    const candTime = createdOnMs(cand);
    const candDepth = cand.depth;
    const candPrefix = getPrefix(cand.typename);

    // MUST: shallower depth
    if (candDepth >= childDepth) continue;

    // MUST: same prefix (text before first dot)
    if (candPrefix !== childPrefix) continue;

    // MUST: parent cannot be after child
    if (candTime > childTime) continue;

    // Score: closer in time and depth is better
    const timeDiff = childTime - candTime; // >= 0
    const depthDiff = childDepth - candDepth; // > 0

    // You can tune these weights; this is simple & deterministic
    const score = -timeDiff - depthDiff * 1000;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

  // 3. Build nodes & edges
  sorted.forEach((log, idx) => {
    const nodeId = log.plugintracelogid;
    const lane = depthToLaneIndex.get(log.depth) ?? 0;

    const node: FlowNode = {
      id: nodeId,
      type: 'default',
      position: {
        x: lane * LANE_WIDTH,
        y: idx * ROW_SPACING
      },
      data: {
        traceid: nodeId,
        typeName: log.typename || 'Unknown',
        message: log.messagename,
        mode: getModeName(log.mode),
        duration: log.performanceexecutionduration || 0,
        hasException: !!(log.exceptiondetails && log.exceptiondetails.trim() !== ''),
        depth: log.depth
      }
    };

    nodes.push(node);

    // Parent-child edges: only when prediction is confident
    if (log.depth > 0) {
      const parentIdx = findParentIndex(idx);
      if (parentIdx !== null) {
        const parentId = sorted[parentIdx].plugintracelogid;
        edges.push({
          id: `pc-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          type: 'smoothstep',
          data: { type: 'parent-child' }
        });
      }
    }
  });

  return { nodes, edges };
}
