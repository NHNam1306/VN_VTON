import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radius, spacing, useBrandColors } from '@/theme';

export function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
  style?: StyleProp<ViewStyle>;
}) {
  const brand = useBrandColors();
  const backgroundColor = variant === 'primary' ? brand.primary : variant === 'destructive' ? colors.destructive : colors.surface;
  const textColor = variant === 'primary' || variant === 'destructive' ? colors.onBrand : colors.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [{
        minHeight: 50,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        backgroundColor,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
      }, style]}>
      {loading ? <ActivityIndicator color={textColor as string} /> : <AppText variant="headline" style={{ color: textColor }}>{title}</AppText>}
    </Pressable>
  );
}
