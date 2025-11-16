import * as React from 'react';
import { Button as FButton, ButtonProps } from '@fluentui/react-components';

export type Props = ButtonProps & { variant?: 'primary' | 'ghost' };

export default function Button({ variant = 'ghost', appearance, ...rest }: Props) {
  // map your old variants to Fluent appearances
  const app: ButtonProps['appearance'] = appearance ?? (variant === 'primary' ? 'primary' : 'secondary');
  return <FButton appearance={app} {...rest} />;
}
