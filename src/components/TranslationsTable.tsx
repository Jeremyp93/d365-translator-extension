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
import { getLanguageDisplayName } from "../utils/languageNames";

export interface TranslationsTableProps {
  lcids: number[];
  values: Record<number, string>;
  onChange: (lcid: number, value: string) => void;
  title?: string;

  // NEW:
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultLcid?: number; // Default language to show first (e.g., 1033)
  readOnly?: boolean; // Make inputs readonly
}

export default function TranslationsTable({
  lcids,
  values,
  onChange,
  title,
  loading,
  disabled,
  placeholder,
  defaultLcid = 1033,
  readOnly = false,
}: TranslationsTableProps): JSX.Element {
  // Sort with default language first, then by LCID
  const ordered = React.useMemo(() => {
    const sorted = (lcids ?? []).slice().sort((a, b) => {
      if (a === defaultLcid) return -1;
      if (b === defaultLcid) return 1;
      return a - b;
    });
    return sorted;
  }, [lcids, defaultLcid]);

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
            <TableHeaderCell>Language</TableHeaderCell>
            <TableHeaderCell>Label</TableHeaderCell>
          </TableRow>
        </TableHeader>

        <TableBody>
          {ordered.map((lcid) => (
            <TableRow key={lcid}>
              <TableCell
                style={{ width: 220, fontVariantNumeric: "tabular-nums" }}
              >
                <code>{getLanguageDisplayName(lcid)}</code>
              </TableCell>
              <TableCell>
                <TextInput
                  value={values[lcid] ?? ""}
                  onChange={(e) =>
                    onChange(lcid, (e.target as HTMLInputElement).value)
                  }
                  placeholder={placeholder}
                  style={{width: "100%"}}
                  readOnly={readOnly}
                  disabled={disabled || readOnly}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
