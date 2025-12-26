import {
  TableCellLayout,
  createTableColumn,
  TableColumnDefinition,
  Button,
  Badge,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  ChevronRight20Regular,
  ChevronDown20Regular,
  FlowRegular,
} from "@fluentui/react-icons";

import {
  PluginTraceLog,
  formatDuration,
  getModeLabel,
  getOperationTypeLabel,
  getDurationColor,
} from "../../services/pluginTraceLogService";

export function createResultsTableColumns(
  expandedRows: Set<string>,
  toggleRow: (rowId: string) => void,
  onViewFlow?: (correlationId: string, rowId: string) => void
): TableColumnDefinition<PluginTraceLog>[] {
  return [
    createTableColumn<PluginTraceLog>({
      columnId: "expand",
      renderHeaderCell: () => "",
      renderCell: (log) => {
        const hasDetails = !!(
          log.messageblock ||
          log.exceptiondetails ||
          log.correlationid
        );
        if (!hasDetails) return null;

        const isExpanded = expandedRows.has(log.plugintracelogid);
        return (
          <TableCellLayout>
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: tokens.colorBrandForeground1,
              }}
              onClick={() => toggleRow(log.plugintracelogid)}
              role="button"
              tabIndex={0}
            >
              {isExpanded ? (
                <ChevronDown20Regular />
              ) : (
                <ChevronRight20Regular />
              )}
            </div>
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "actions",
      renderHeaderCell: () => "Actions",
      renderCell: (log) => (
        <TableCellLayout>
          {log.correlationid && onViewFlow && (
            <Button
              appearance="subtle"
              size="small"
              icon={<FlowRegular />}
              onClick={() =>
                onViewFlow(log.correlationid!, log.plugintracelogid)
              }
              title="View correlation flow diagram"
            >
              View flow
            </Button>
          )}
        </TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "typename",
      compare: (a, b) => (a.typename || "").localeCompare(b.typename || ""),
      renderHeaderCell: () => "Type Name",
      renderCell: (log) => (
        <TableCellLayout truncate title={log.typename}>
          {log.typename || "N/A"}
        </TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "messagename",
      compare: (a, b) =>
        (a.messagename || "").localeCompare(b.messagename || ""),
      renderHeaderCell: () => "Message",
      renderCell: (log) => (
        <TableCellLayout>{log.messagename || "N/A"}</TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "mode",
      compare: (a, b) => a.mode - b.mode,
      renderHeaderCell: () => "Mode",
      renderCell: (log) => (
        <TableCellLayout>{getModeLabel(log.mode)}</TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "operationtype",
      compare: (a, b) => a.operationtype - b.operationtype,
      renderHeaderCell: () => "Type",
      renderCell: (log) => (
        <TableCellLayout>
          {getOperationTypeLabel(log.operationtype)}
        </TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "depth",
      compare: (a, b) => a.depth - b.depth,
      renderHeaderCell: () => "Depth",
      renderCell: (log) => <TableCellLayout>{log.depth}</TableCellLayout>,
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "duration",
      compare: (a, b) =>
        (a.performanceexecutionduration || 0) -
        (b.performanceexecutionduration || 0),
      renderHeaderCell: () => "Duration",
      renderCell: (log) => {
        const color = getDurationColor(log.performanceexecutionduration);
        return (
          <TableCellLayout>
            <Badge appearance="filled" color={color}>
              {formatDuration(log.performanceexecutionduration)}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "exception",
      compare: (a, b) => {
        const aHas = !!a.exceptiondetails;
        const bHas = !!b.exceptiondetails;
        return aHas === bHas ? 0 : aHas ? -1 : 1;
      },
      renderHeaderCell: () => "Exception",
      renderCell: (log) => (
        <TableCellLayout truncate title={log.exceptiondetails}>
          {log.exceptiondetails ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <Badge color="danger">Yes</Badge>
              <Text
                style={{
                  fontFamily: "monospace",
                  fontSize: tokens.fontSizeBase200,
                  maxWidth: "400px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {log.exceptiondetails}
              </Text>
            </div>
          ) : (
            "-"
          )}
        </TableCellLayout>
      ),
    }),
    createTableColumn<PluginTraceLog>({
      columnId: "createdon",
      compare: (a, b) =>
        new Date(a.createdon).getTime() - new Date(b.createdon).getTime(),
      renderHeaderCell: () => "Created On",
      renderCell: (log) => (
        <TableCellLayout>
          {new Date(log.createdon).toLocaleString()}
        </TableCellLayout>
      ),
    }),
  ];
}
