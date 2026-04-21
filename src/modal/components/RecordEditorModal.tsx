import { useCallback, useMemo, useState } from 'react';
import {
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent,
  Button, Input, Spinner, MessageBar, MessageBarBody, Text, Badge,
  tokens, makeStyles,
} from '@fluentui/react-components';
import { Search20Regular } from '@fluentui/react-icons';
import { useRecordEditor } from '../../hooks/useRecordEditor';
import { FieldRow } from './FieldRow';

const useStyles = makeStyles({
  surface: { maxWidth: '1100px', width: '96vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  body: { flex: 1, minHeight: 0, overflow: 'auto', paddingRight: tokens.spacingHorizontalS },
  toolbar: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center', paddingBottom: tokens.spacingVerticalS },
  search: { flex: 1 },
});

interface Props {
  open: boolean;
  onClose: (didSave: boolean) => void;
  clientUrl: string;
  entity: string;
  recordId: string;
  apiVersion: string;
}

export function RecordEditorModal({ open, onClose, clientUrl, entity, recordId, apiVersion }: Props): JSX.Element {
  const s = useStyles();
  const editor = useRecordEditor({
    clientUrl, entityLogicalName: entity, recordId, apiVersion,
  });

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return editor.fields;
    return editor.fields.filter((f) =>
      f.logicalName.toLowerCase().includes(q) ||
      f.displayName.toLowerCase().includes(q)
    );
  }, [editor.fields, search]);

  const handleClose = useCallback((didSave: boolean) => {
    if (!didSave && editor.dirtyCount > 0) {
      const ok = window.confirm(`Discard ${editor.dirtyCount} unsaved change${editor.dirtyCount > 1 ? 's' : ''}?`);
      if (!ok) return;
    }
    onClose(didSave);
  }, [editor.dirtyCount, onClose]);

  const handleSave = useCallback(async () => {
    const result = await editor.save();
    if (result.ok) onClose(true);
  }, [editor, onClose]);

  return (
    <Dialog open={open} modalType="alert">
      <DialogSurface className={s.surface}>
        <DialogBody>
          <DialogTitle>
            Edit record — <code>{entity}</code> ({editor.recordId})
            {editor.dirtyCount > 0 && <Badge appearance="filled" color="warning" style={{ marginLeft: 8 }}>{editor.dirtyCount} changed</Badge>}
          </DialogTitle>

          <DialogContent>
            {editor.error && (
              <MessageBar intent="error">
                <MessageBarBody>{editor.error}</MessageBarBody>
              </MessageBar>
            )}
            {editor.saveError && (
              <MessageBar intent="error">
                <MessageBarBody>{editor.saveError.message}</MessageBarBody>
              </MessageBar>
            )}

            <div className={s.toolbar}>
              <Input
                className={s.search}
                placeholder="Search by display or logical name…"
                contentBefore={<Search20Regular />}
                value={search}
                onChange={(_e, d) => setSearch(d.value)}
              />
              <Text>{filtered.length} / {editor.fields.length}</Text>
            </div>

            {editor.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spinner label="Loading record…" />
              </div>
            ) : (
              <div className={s.body}>
                {filtered.map((f) => (
                  <FieldRow
                    key={f.logicalName}
                    field={f}
                    onChange={(v) => editor.updateField(f.logicalName, v)}
                    onRevert={() => editor.revertField(f.logicalName)}
                    onRequestOptions={() => editor.ensureOptions(f.logicalName)}
                  />
                ))}
              </div>
            )}
          </DialogContent>

          <DialogActions>
            <Button appearance="secondary" onClick={() => handleClose(false)}>Cancel</Button>
            <Button
              appearance="primary"
              disabled={editor.dirtyCount === 0 || editor.saving || editor.loading}
              onClick={handleSave}
            >
              {editor.saving ? 'Saving…' : `Save${editor.dirtyCount > 0 ? ` (${editor.dirtyCount})` : ''}`}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
