# OptionSet Modal Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a conditional "OptionSet Values" tab to the field translation modal that shows one card per option value with editable translations per language.

**Architecture:** Detect attribute type via `useAttributeType` hook. Lazy-load optionset metadata when tab is clicked. Render `OptionSetCard` components (one per option value) with inline language inputs. Save via existing `saveOptionSetLabels` service.

**Tech Stack:** React 18, TypeScript, Fluent UI v9, existing D365 Web API services

---

### Task 1: Create `useOptionSetTranslations` hook

**Files:**
- Create: `src/hooks/useOptionSetTranslations.ts`

**Step 1: Create the hook**

```typescript
import { useState, useCallback, useMemo } from "react";
import {
  getOptionSetMetadata,
  saveOptionSetLabels,
} from "../services/optionSetService";
import type { OptionSetMetadata } from "../types";

type EditableOptions = Record<number, Record<number, string>>;

interface UseOptionSetTranslationsResult {
  metadata: OptionSetMetadata | null;
  values: EditableOptions;
  originalValues: EditableOptions;
  loading: boolean;
  error: string | null;
  loaded: boolean;
  saving: boolean;
  saveError: string | null;
  changes: Array<[number, number]>;
  load: () => Promise<void>;
  onChange: (optionValue: number, lcid: number, value: string) => void;
  save: () => Promise<void>;
  discard: () => void;
}

export function useOptionSetTranslations(
  clientUrl: string,
  entity: string,
  attribute: string,
  langs: number[] | undefined,
  apiVersion: string = "v9.2"
): UseOptionSetTranslationsResult {
  const [metadata, setMetadata] = useState<OptionSetMetadata | null>(null);
  const [values, setValues] = useState<EditableOptions>({});
  const [originalValues, setOriginalValues] = useState<EditableOptions>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientUrl || !entity || !attribute || !langs || langs.length === 0 || loaded) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const meta = await getOptionSetMetadata(clientUrl, entity, attribute, apiVersion);

      const valuesMap: EditableOptions = {};
      meta.options.forEach((opt) => {
        valuesMap[opt.value] = {};
        const allLcids = new Set<number>([
          ...langs,
          ...opt.labels.map((l) => l.languageCode),
        ]);
        Array.from(allLcids).forEach((lcid) => {
          const hit = opt.labels.find((l) => l.languageCode === lcid);
          valuesMap[opt.value][lcid] = hit?.label ?? "";
        });
      });

      setMetadata(meta);
      setValues(valuesMap);
      setOriginalValues(JSON.parse(JSON.stringify(valuesMap)));
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [clientUrl, entity, attribute, langs, apiVersion, loaded]);

  const onChange = useCallback((optionValue: number, lcid: number, value: string) => {
    setValues((prev) => ({
      ...prev,
      [optionValue]: {
        ...(prev[optionValue] || {}),
        [lcid]: value,
      },
    }));
  }, []);

  const changes = useMemo(() => {
    const changed: Array<[number, number]> = [];
    for (const optVal of Object.keys(values).map(Number)) {
      for (const lcid of Object.keys(values[optVal] || {}).map(Number)) {
        if ((values[optVal]?.[lcid] ?? "") !== (originalValues[optVal]?.[lcid] ?? "")) {
          changed.push([optVal, lcid]);
        }
      }
    }
    return changed;
  }, [values, originalValues]);

  const save = useCallback(async () => {
    if (!metadata || changes.length === 0) return;

    setSaving(true);
    setSaveError(null);

    try {
      await saveOptionSetLabels(
        clientUrl,
        entity,
        attribute,
        values,
        metadata.isGlobal,
        metadata.name ?? undefined
      );
      setOriginalValues(JSON.parse(JSON.stringify(values)));
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [clientUrl, entity, attribute, metadata, values, changes.length]);

  const discard = useCallback(() => {
    setValues(JSON.parse(JSON.stringify(originalValues)));
    setSaveError(null);
  }, [originalValues]);

  return {
    metadata,
    values,
    originalValues,
    loading,
    error,
    loaded,
    saving,
    saveError,
    changes,
    load,
    onChange,
    save,
    discard,
  };
}
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors related to `useOptionSetTranslations`

**Step 3: Commit**

```bash
git add src/hooks/useOptionSetTranslations.ts
git commit -m "feat: add useOptionSetTranslations hook for modal optionset tab"
```

---

### Task 2: Create `OptionSetCard` component and styles

**Files:**
- Create: `src/modal/components/OptionSetCard.tsx`
- Modify: `src/modal/components/translationModalStyles.ts`

**Step 1: Add optionset card styles to `translationModalStyles.ts`**

Add a new exported `useOptionSetCardStyles` at the bottom of the file, after `useLanguageCardStyles`:

```typescript
/**
 * Styles for OptionSet value cards
 */
export const useOptionSetCardStyles = makeStyles({
  card: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    ...shorthands.padding("16px", "20px"),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    boxShadow: tokens.shadow4,
    ...shorthands.border("1px", "solid", "transparent"),
    transitionProperty: "all",
    transitionDuration: "200ms",
    transitionTimingFunction: "ease-out",

    ":hover": {
      boxShadow: tokens.shadow8,
      transform: "translateY(-1px)",
    },

    ":focus-within": {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      boxShadow: `0 0 0 2px ${tokens.colorBrandBackground2}`,
    },
  },

  cardHeader: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("10px"),
    marginBottom: "12px",
  },

  optionLabel: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },

  rows: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("8px"),
  },

  row: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
  },

  rowLangInfo: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("6px"),
    minWidth: "160px",
    flexShrink: 0,
  },

  rowLangName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightMedium,
    color: tokens.colorNeutralForeground1,
  },

  rowLcidBadge: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("1px", "6px"),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },

  rowInput: {
    flex: 1,
    minWidth: 0,
  },

  rowBadges: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("6px"),
    flexShrink: 0,
  },

  baseBadge: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.padding("2px", "8px"),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },

  modifiedDot: {
    width: "6px",
    height: "6px",
    ...shorthands.borderRadius("50%"),
    backgroundColor: tokens.colorPalettePurpleBorderActive,
  },
});
```

**Step 2: Create `OptionSetCard.tsx`**

```tsx
import { Badge, Input } from "@fluentui/react-components";
import { getLanguageDisplayNameWithoutLcid } from "../../utils/languageNames";
import { useOptionSetCardStyles } from "./translationModalStyles";

export interface OptionSetCardProps {
  optionValue: number;
  baseLabel: string;
  langs: number[];
  baseLcid: number | undefined;
  values: Record<number, string>;
  originalValues: Record<number, string>;
  disabled: boolean;
  onChange: (lcid: number, value: string) => void;
}

export function OptionSetCard({
  optionValue,
  baseLabel,
  langs,
  baseLcid,
  values,
  originalValues,
  disabled,
  onChange,
}: OptionSetCardProps) {
  const styles = useOptionSetCardStyles();

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Badge appearance="tint" size="large">
          {optionValue}
        </Badge>
        <span className={styles.optionLabel}>{baseLabel || "(no label)"}</span>
      </div>
      <div className={styles.rows}>
        {langs.map((lcid) => {
          const val = values[lcid] ?? "";
          const orig = originalValues[lcid] ?? "";
          const isModified = val !== orig;
          const isBase = lcid === baseLcid;
          const langName = getLanguageDisplayNameWithoutLcid(lcid);

          return (
            <div key={lcid} className={styles.row}>
              <div className={styles.rowLangInfo}>
                <span className={styles.rowLangName}>{langName}</span>
                <span className={styles.rowLcidBadge}>{lcid}</span>
              </div>
              <Input
                className={styles.rowInput}
                value={val}
                onChange={(_, data) => onChange(lcid, data.value)}
                disabled={disabled}
                size="medium"
                appearance="outline"
              />
              <div className={styles.rowBadges}>
                {isModified && <span className={styles.modifiedDot} />}
                {isBase && <span className={styles.baseBadge}>BASE</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/modal/components/OptionSetCard.tsx src/modal/components/translationModalStyles.ts
git commit -m "feat: add OptionSetCard component and styles for modal"
```

---

### Task 3: Wire OptionSet tab into TranslationModal

**Files:**
- Modify: `src/modal/components/TranslationModal.tsx`

**Step 1: Add imports**

After the existing imports (line 12), add:

```typescript
import { Options24Regular } from "@fluentui/react-icons";
import { useAttributeType } from "../../hooks/useAttributeType";
import { isOptionSetType } from "../../services/optionSetService";
import { useOptionSetTranslations } from "../../hooks/useOptionSetTranslations";
import { OptionSetCard } from "./OptionSetCard";
```

Also add `Badge` to the Fluent UI imports:

```typescript
import {
  Dialog,
  DialogSurface,
  TabList,
  Tab,
  Spinner,
  MessageBar,
  MessageBarBody,
  Text,
  Badge,
} from "@fluentui/react-components";
```

**Step 2: Expand TabValue type**

Change line 42:
```typescript
type TabValue = "entity" | "form" | "optionset";
```

**Step 3: Add attribute type detection and optionset hook**

After the `useEditingPermission` call (line 60), add:

```typescript
  // Attribute type detection
  const { attributeType } = useAttributeType(clientUrl, entity, attribute, apiVersion);
  const hasOptionSetTab = isOptionSetType(attributeType);

  // OptionSet translations
  const optionSet = useOptionSetTranslations(clientUrl, entity, attribute, langs, apiVersion);
```

**Step 4: Add lazy loading for optionset tab**

After the form tab lazy-loading `useEffect` (after line 173), add:

```typescript
  // Load optionset data when switching to optionset tab
  useEffect(() => {
    if (activeTab === "optionset" && hasOptionSetTab && !optionSet.loaded) {
      optionSet.load();
    }
  }, [activeTab, hasOptionSetTab, optionSet.loaded, optionSet.load]);
```

**Step 5: Update change count**

Change the `totalChangeCount` line (line 188):

```typescript
  const totalChangeCount = entityChanges.length + formChanges.length + optionSet.changes.length;
```

**Step 6: Update handleDiscard**

Replace the existing `handleDiscard` (lines 199-205):

```typescript
  const handleDiscard = () => {
    if (activeTab === "entity") {
      setEntityValues({ ...entityOriginalValues });
    } else if (activeTab === "form") {
      setFormValues({ ...formOriginalValues });
    } else if (activeTab === "optionset") {
      optionSet.discard();
    }
    setSaveError(null);
  };
```

**Step 7: Update handleSave**

Add optionset save handling. After the form save block (after line 238), add:

```typescript
      // Save optionset changes if on optionset tab and has changes
      if (activeTab === "optionset" && optionSet.changes.length > 0) {
        await optionSet.save();
      }
```

**Step 8: Add optionset rendering to renderContent**

Before the `// Form tab` comment (before line 294), add the optionset tab rendering:

```typescript
    if (activeTab === "optionset") {
      if (optionSet.loading) {
        return (
          <div className={styles.loadingContainer}>
            <Spinner size="large" />
            <Text>Loading option set values...</Text>
          </div>
        );
      }

      if (optionSet.error) {
        return (
          <div className={styles.errorContainer}>
            <MessageBar intent="error">
              <MessageBarBody>{optionSet.error}</MessageBarBody>
            </MessageBar>
          </div>
        );
      }

      if (!optionSet.loaded) {
        return (
          <div className={styles.emptyState}>
            <Text>Click the OptionSet Values tab to load option translations</Text>
          </div>
        );
      }

      if (!optionSet.metadata || optionSet.metadata.options.length === 0) {
        return (
          <div className={styles.emptyState}>
            <Text>No options defined for this option set.</Text>
          </div>
        );
      }

      return (
        <div className={styles.cardsContainer}>
          {optionSet.metadata.options.map((opt) => (
            <OptionSetCard
              key={opt.value}
              optionValue={opt.value}
              baseLabel={
                opt.labels.find((l) => l.languageCode === baseLcid)?.label ||
                opt.labels[0]?.label ||
                ""
              }
              langs={langs!}
              baseLcid={baseLcid}
              values={optionSet.values[opt.value] || {}}
              originalValues={optionSet.originalValues[opt.value] || {}}
              disabled={isDisabled}
              onChange={(lcid, value) => optionSet.onChange(opt.value, lcid, value)}
            />
          ))}
        </div>
      );
    }
```

**Step 9: Add OptionSet tab to TabList**

After the form Tab conditional (after line 379), add:

```tsx
            {hasOptionSetTab && (
              <Tab value="optionset" icon={<Options24Regular />}>
                OptionSet Values
                {optionSet.metadata?.isGlobal && (
                  <>
                    {" "}
                    <Badge color="informative" appearance="filled" size="small">
                      Global
                    </Badge>
                  </>
                )}
              </Tab>
            )}
```

**Step 10: Update footer change count**

Replace the footer's `changeCount` prop (line 394):

```typescript
          changeCount={
            activeTab === "entity"
              ? entityChanges.length
              : activeTab === "form"
                ? formChanges.length
                : optionSet.changes.length
          }
```

**Step 11: Update saveError to include optionset**

After the existing `saveError` MessageBar (around line 385), also show optionset save errors:

```tsx
        {optionSet.saveError && (
          <div className={styles.errorContainer}>
            <MessageBar intent="error">
              <MessageBarBody>{optionSet.saveError}</MessageBarBody>
            </MessageBar>
          </div>
        )}
```

**Step 12: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 13: Build**

Run: `npm run build`
Expected: Clean build with no errors

**Step 14: Commit**

```bash
git add src/modal/components/TranslationModal.tsx
git commit -m "feat: wire OptionSet Values tab into translation modal"
```
