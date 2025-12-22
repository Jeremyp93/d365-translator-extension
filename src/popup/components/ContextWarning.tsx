/**
 * Context warning component for non-D365 environments
 */

import * as React from 'react';
import { WarningMessage } from './MessageDisplay';
import type { PopupTab } from '../../types/popup';

interface ContextWarningProps {
  activeTab: PopupTab;
  isDynamicsEnv: boolean;
  contextChecking: boolean;
}

export function ContextWarning({
  activeTab,
  isDynamicsEnv,
  contextChecking,
}: ContextWarningProps) {
  if (contextChecking || isDynamicsEnv) return null;

  const message =
    activeTab === 'general'
      ? 'This extension requires a Dynamics 365 environment. Please navigate to a Dynamics 365 page.'
      : 'Developer tools require a Dynamics 365 environment. Please navigate to a Dynamics 365 page.';

  return <WarningMessage title="⚠️ Not in Dynamics 365">{message}</WarningMessage>;
}
