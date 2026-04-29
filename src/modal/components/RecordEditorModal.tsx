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
  surface: { maxWidth: '1100px', width: '96vw', height: '90vh' },
  dialogBody: { height: '100%', minHeight: 0, maxHeight: 'none' },
  content: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
  },
  list: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: tokens.spacingHorizontalS },
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
        <DialogBody className={s.dialogBody}>
          <DialogTitle>
            Edit record — <code>{entity}</code> ({editor.recordId})
            {editor.dirtyCount > 0 && <Badge appearance="filled" color="warning" style={{ marginLeft: 8 }}>{editor.dirtyCount} changed</Badge>}
          </DialogTitle>

          <DialogContent className={s.content}>
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

            {editor.conflicts && editor.conflicts.conflicts.length > 0 && (
              <MessageBar intent="warning">
                <MessageBarBody>
                  <Text weight="semibold">The record was modified since you opened it.</Text>
                  <ul>
                    {editor.conflicts.conflicts.map((c) => {
                      const mine = editor.fields.find((f) => f.logicalName === c.logicalName)?.currentValue;
                      return (
                        <li key={c.logicalName}>
                          <code>{c.logicalName}</code> — server: {String(c.serverFormatted ?? c.serverValue ?? '∅')} / yours: {String(mine ?? '∅')}{' '}
                          <Button size="small" onClick={() => editor.resolveConflict(c.logicalName, 'mine')}>Keep mine</Button>{' '}
                          <Button size="small" onClick={() => editor.resolveConflict(c.logicalName, 'theirs')}>Take theirs</Button>
                        </li>
                      );
                    })}
                  </ul>
                  <Text>Resolve each field, then click Save again.</Text>
                </MessageBarBody>
              </MessageBar>
            )}

            {editor.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Spinner label="Loading record…" />
              </div>
            ) : (
              <div className={s.list}>
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
