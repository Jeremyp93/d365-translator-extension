import { MessageBar, MessageBarBody } from '@fluentui/react-components';
import { MESSAGES } from '../../config/constants';

interface EditingBlockedBannerProps {
  visible: boolean;
}

/**
 * Warning banner displayed when editing is disabled via environment variable
 */
export function EditingBlockedBanner({ visible }: EditingBlockedBannerProps): JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <MessageBar intent="warning">
      <MessageBarBody>{MESSAGES.EDITING_BLOCKED}</MessageBarBody>
    </MessageBar>
  );
}
