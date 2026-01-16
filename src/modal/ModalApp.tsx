/**
 * ModalApp - Standalone modal application for field translations
 * Entry point for the modal iframe, handles URL params and postMessage communication
 */

import { useEffect, useState } from "react";
import { FluentProvider } from "@fluentui/react-components";

import { useTheme } from "../context/ThemeContext";
import { usePendingChanges } from "../hooks/usePendingChanges";
import FieldInfoModal from "../components/FieldInfoModal";

/**
 * Parse URL parameters from window.location.search
 */
function useModalParams() {
  const search = window.location.search;
  const qs = new URLSearchParams(search);

  const cleanGuid = (v: string | null): string | undefined => {
    if (!v) return undefined;
    return v.replace(/[{}]/g, '').toLowerCase();
  };

  return {
    clientUrl: (qs.get('clientUrl') || '').replace(/\/+$/, ''),
    entity: qs.get('entity') || undefined,
    attribute: qs.get('attribute') || undefined,
    formId: cleanGuid(qs.get('formId')),
    labelId: cleanGuid(qs.get('labelId')),
    apiVersion: qs.get('apiVersion') || 'v9.2',
  };
}

export default function ModalApp(): JSX.Element {
  const { theme } = useTheme();
  const { clientUrl, entity, attribute, formId, labelId, apiVersion } = useModalParams();
  const { count: pendingCount } = usePendingChanges();
  const [open, setOpen] = useState(true);

  // Set document title
  useEffect(() => {
    document.title = `${attribute || 'Field'} - D365 Translator`;
  }, [attribute]);

  // Add beforeunload handler for standalone tab protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingCount > 0) {
        e.preventDefault();
        return '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pendingCount]);

  // Listen for REQUEST_CLOSE_FIELD_MODAL from parent
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.__d365x__ !== true) return;

      if (d.type === 'REQUEST_CLOSE_FIELD_MODAL') {
        handleClose();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [pendingCount]);

  const handleClose = () => {
    // Check if there are pending changes
    if (pendingCount > 0) {
      const confirmClose = window.confirm(
        `You have ${pendingCount} unsaved change${pendingCount > 1 ? 's' : ''}. Close anyway?`
      );
      if (!confirmClose) {
        // Send cancel message to parent
        window.parent.postMessage({
          __d365x__: true,
          type: 'CANCEL_CLOSE_FIELD_MODAL'
        }, '*');
        return;
      }
    }

    // Close modal
    setOpen(false);

    // Post message to parent window to close modal
    window.parent.postMessage({
      __d365x__: true,
      type: 'CLOSE_FIELD_MODAL'
    }, '*');
  };

  const handleOpenNewTab = () => {
    // Post message to parent to open in new tab
    window.parent.postMessage({
      __d365x__: true,
      type: 'OPEN_NEW_TAB',
      payload: {
        clientUrl,
        entity,
        attribute,
        formId,
        labelId,
        apiVersion
      }
    }, '*');
  };

  return (
    <FluentProvider
      theme={theme}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%"
      }}
    >
      <FieldInfoModal
        open={open}
        onClose={handleClose}
        clientUrl={clientUrl || ''}
        entity={entity || ''}
        attribute={attribute || ''}
        formId={formId}
        labelId={labelId}
        apiVersion={apiVersion}
        onOpenNewTab={handleOpenNewTab}
      />
    </FluentProvider>
  );
}
