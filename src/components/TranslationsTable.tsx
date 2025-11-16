import * as React from "react";
import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from "@fluentui/react-components";
import TextInput from "./ui/TextInput";

export interface TranslationsTableProps {
  lcids: number[];
  values: Record<number, string>;
  onChange: (lcid: number, value: string) => void;
  title?: string;

  // NEW:
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function TranslationsTable({
  lcids,
  values,
  onChange,
  title,
  loading,
  disabled,
  placeholder,
}: TranslationsTableProps): JSX.Element {
  // Stable sort just in case
  const ordered = React.useMemo(
    () => (lcids ?? []).slice().sort((a, b) => a - b),
    [lcids]
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 0",
        }}
      >
        <Spinner />
        <Text>Loading translations…</Text>
      </div>
    );
  }

  return (
    <div
      style={{
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? ("none" as const) : "auto",
      }}
    >
      {title && (
        <Text weight="semibold" style={{ display: "block", marginBottom: 8 }}>
          {title}
        </Text>
      )}

      <Table aria-label={title ?? "Translations"}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>LCID</TableHeaderCell>
            <TableHeaderCell>Label</TableHeaderCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {ordered.map((lcid) => (
            <TableRow key={lcid}>
              <TableCell
                style={{ width: 120, fontVariantNumeric: "tabular-nums" }}
              >
                {lcid}
              </TableCell>
              <TableCell>
                <TextInput
                  value={values[lcid] ?? ""}
                  onChange={(e) =>
                    onChange(lcid, (e.target as HTMLInputElement).value)
                  }
                  placeholder={placeholder}
                  style={{width: "100%"}}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
