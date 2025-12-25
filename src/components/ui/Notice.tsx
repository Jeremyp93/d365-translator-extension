import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';

export function Info({ children, title = '' }: { children: React.ReactNode; title?: string }) {
  return (
    <MessageBar style={{backgroundColor: "var(--colorNeutralStencil1)"}}>
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        {children}
      </MessageBarBody>
    </MessageBar>
  );
}

export function ErrorBox({ children, title = 'Error' }: { children: React.ReactNode; title?: string }) {
  return (
    <MessageBar intent="error">
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        {children}
      </MessageBarBody>
    </MessageBar>
  );
}
