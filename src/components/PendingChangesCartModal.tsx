import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  makeStyles,
  tokens,
  Text,
  Divider,
  Spinner,
} from '@fluentui/react-components';
import { Dismiss24Regular, Delete24Regular } from '@fluentui/react-icons';
import { ErrorBox, Info } from './ui/Notice';
import type { PendingChange, BatchUpdateResult } from '../types';
import { batchUpdateAttributeLabels } from '../services/entityLabelService';
import { publishMultipleEntities } from '../services/d365Api';

const useStyles = makeStyles({
  dialogSurface: {
    maxWidth: '900px',
    width: '95vw',
    maxHeight: '90vh',
    '@media (max-width: 768px)': {
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
    },
  },
  dialogBody: {
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: '200px',
    maxHeight: '80vh',
    '@media (max-width: 768px)': {
      maxHeight: '90vh',
      height: '90vh',
      paddingLeft: tokens.spacingHorizontalS,
      paddingRight: tokens.spacingHorizontalS,
    },
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXXL,
    color: tokens.colorNeutralForeground3,
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entityGroup: {
    marginBottom: tokens.spacingVerticalL,
  },
  entityHeader: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    marginBottom: tokens.spacingVerticalS,
    color: tokens.colorBrandForeground1,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  },
  attributeGroup: {
    marginBottom: tokens.spacingVerticalM,
    marginLeft: tokens.spacingHorizontalL,
    '@media (max-width: 768px)': {
      marginLeft: tokens.spacingHorizontalM,
    },
  },
  attributeHeader: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    marginBottom: tokens.spacingVerticalXS,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  },
  changeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalXL,
    borderRadius: tokens.borderRadiusMedium,
    gap: tokens.spacingHorizontalS,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    '@media (max-width: 768px)': {
      paddingLeft: tokens.spacingHorizontalM,
      flexWrap: 'wrap',
    },
  },
  changeText: {
    flex: 1,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    minWidth: 0,
  },
  arrow: {
    margin: `0 ${tokens.spacingHorizontalS}`,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  oldValue: {
    color: tokens.colorPaletteRedForeground1,
    textDecoration: 'line-through',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  },
  newValue: {
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: tokens.fontWeightSemibold,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  },
  errorItem: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalS,
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
  },
  resultSummary: {
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    marginBottom: tokens.spacingVerticalM,
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  dialogContent: {
    marginBottom: tokens.spacingVerticalL,
  },
});

interface Props {
  open: boolean;
  onClose: () => void;
  changes: Map<string, PendingChange>;
  onRemoveChange: (entity: string, attribute: string, languageCode: number) => void;
  onClearAll: () => void;
  onSaveSuccess?: (successfulChanges: PendingChange[]) => void;
  clientUrl: string;
  apiVersion?: string;
}

export default function PendingChangesCartModal({
  open,
  onClose,
  changes,
  onRemoveChange,
  onClearAll,
  onSaveSuccess,
  clientUrl,
  apiVersion = 'v9.2',
}: Props): JSX.Element {
  const styles = useStyles();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<BatchUpdateResult | null>(null);

  // Group changes by entity, then by attribute
  const groupedByEntity = useMemo(() => {
    const grouped = new Map<string, Map<string, PendingChange[]>>();
    changes.forEach((change) => {
      if (!grouped.has(change.entity)) {
        grouped.set(change.entity, new Map());
      }
      const entityMap = grouped.get(change.entity)!;
      if (!entityMap.has(change.attribute)) {
        entityMap.set(change.attribute, []);
      }
      entityMap.get(change.attribute)!.push(change);
    });
    return grouped;
  }, [changes]);

  const changeCount = changes.size;

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveResult(null);

      const changesArray = Array.from(changes.values());

      // Step 1: Batch update all attributes
      const result = await batchUpdateAttributeLabels(clientUrl, changesArray);

      // Step 2: Extract unique entity names from successful changes
      const successfulChanges = changesArray.filter((change) =>
        !result.failures.some((f) => f.change === change)
      );

      const uniqueEntities = Array.from(
        new Set(successfulChanges.map((c) => c.entity))
      );

      // Step 3: Publish all affected entities
      if (uniqueEntities.length > 0) {
        await publishMultipleEntities(clientUrl, uniqueEntities, apiVersion);
      }

      // Step 4: Store result and remove successful changes from cart
      setSaveResult(result);

      if (result.failureCount === 0) {
        // All successful - clear cart and close modal
        onClearAll();
        onSaveSuccess?.(successfulChanges); // Notify parent to reload data
        onClose();
      } else {
        // Partial failure - remove successful changes, keep failed ones
        successfulChanges.forEach((change) => {
          onRemoveChange(change.entity, change.attribute, change.languageCode);
        });
        // Also notify on partial success so affected attributes reload
        if (successfulChanges.length > 0) {
          onSaveSuccess?.(successfulChanges);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    if (window.confirm(`Clear all ${changeCount} pending changes? This cannot be undone.`)) {
      onClearAll();
      onClose();
    }
  };

  const handleRemove = (entity: string, attribute: string, languageCode: number) => {
    onRemoveChange(entity, attribute, languageCode);
  };

  // Helper to get language name from LCID (basic mapping)
  const getLanguageName = (lcid: number): string => {
    const mapping: Record<number, string> = {
      1033: 'English',
      1036: 'French',
      1034: 'Spanish',
      1031: 'German',
      1040: 'Italian',
      1043: 'Dutch',
      1046: 'Portuguese (BR)',
      1049: 'Russian',
      1041: 'Japanese',
      2052: 'Chinese (Simplified)',
    };
    return mapping[lcid] || `Language ${lcid}`;
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={styles.dialogSurface}>
        <DialogTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<Dismiss24Regular />}
              onClick={onClose}
            />
          }
        >
          Pending Changes ({changeCount})
        </DialogTitle>

        <DialogBody className={styles.dialogBody}>
          <DialogContent className={styles.dialogContent}>
            {error && <ErrorBox>{error}</ErrorBox>}

            {saveResult && saveResult.failureCount > 0 && (
              <div className={styles.resultSummary}>
                <Info>
                  {saveResult.successCount} attribute{saveResult.successCount !== 1 ? 's' : ''} saved successfully,{' '}
                  {saveResult.failureCount} failed. Review failures below and retry.
                </Info>
                {saveResult.failures.map((failure, idx) => (
                  <div key={idx} className={styles.errorItem}>
                    <Text size={200}>
                      {failure.change.entity}/{failure.change.attribute} ({getLanguageName(failure.change.languageCode)}): {failure.error}
                    </Text>
                  </div>
                ))}
              </div>
            )}

            {changeCount === 0 ? (
              <div className={styles.emptyState}>
                <div>
                  <Text size={400}>No pending changes</Text>
                  <br />
                  <Text size={200}>Edit translations and they'll appear here for batch save</Text>
                </div>
              </div>
            ) : (
              <>
                {Array.from(groupedByEntity.entries()).map(([entity, attributeMap]) => (
                  <div key={entity} className={styles.entityGroup}>
                    <div className={styles.entityHeader}>
                      {entity} ({attributeMap.size} attribute{attributeMap.size !== 1 ? 's' : ''})
                    </div>

                    {Array.from(attributeMap.entries()).map(([attribute, changeList]) => (
                      <div key={attribute} className={styles.attributeGroup}>
                        <div className={styles.attributeHeader}>{attribute}</div>

                        {changeList.map((change) => (
                          <div
                            key={`${change.entity}-${change.attribute}-${change.languageCode}`}
                            className={styles.changeItem}
                          >
                            <div className={styles.changeText}>
                              <Text size={200}>
                                {getLanguageName(change.languageCode)} ({change.languageCode}):{' '}
                                <span className={styles.oldValue}>
                                  {change.oldValue || '(empty)'}
                                </span>
                                <span className={styles.arrow}>→</span>
                                <span className={styles.newValue}>
                                  {change.newValue || '(empty)'}
                                </span>
                              </Text>
                            </div>
                            <Button
                              appearance="subtle"
                              icon={<Delete24Regular />}
                              size="small"
                              onClick={() =>
                                handleRemove(change.entity, change.attribute, change.languageCode)
                              }
                              title="Remove this change"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </DialogContent>
        </DialogBody>

        <DialogActions>
          {changeCount > 0 && (
            <Button appearance="secondary" onClick={handleClearAll} disabled={saving}>
              Clear All
            </Button>
          )}
          <Button appearance="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            appearance="primary"
            onClick={handleSaveAll}
            disabled={changeCount === 0 || saving}
          >
            {saving ? (
              <div className={styles.buttonContent}>
                <Spinner size="tiny" />
                <span>Saving...</span>
              </div>
            ) : (
              `Save All (${changeCount})`
            )}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
}
