import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type IconName = Exclude<SymbolViewProps['name'], string>;

/** SF Symbols trên iOS, Material Symbols trên Android/web. */
const icons = {
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  person: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  hanger: { ios: 'hanger', android: 'apparel', web: 'apparel' },
  wardrobe: { ios: 'cabinet', android: 'door_sliding', web: 'door_sliding' },
  bag: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  photo: { ios: 'person.crop.rectangle', android: 'add_photo_alternate', web: 'add_photo_alternate' },
} satisfies Record<string, IconName>;

export type AppIconName = keyof typeof icons;

export function AppIcon({ name, size = 22, color }: { name: AppIconName; size?: number; color: ColorValue }) {
  return <SymbolView name={icons[name] as IconName} size={size} tintColor={color} />;
}
