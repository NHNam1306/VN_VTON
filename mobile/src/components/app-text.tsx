import { Text, type TextProps } from 'react-native';

import { type } from '@/theme';

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: keyof typeof type }) {
  return <Text selectable style={[type[variant], style]} {...props} />;
}
