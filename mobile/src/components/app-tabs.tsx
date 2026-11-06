import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { useAuth } from '@/providers/auth-provider';
import { useBrandColors } from '@/theme';

export default function AppTabs() {
  const { session } = useAuth();
  const brand = useBrandColors();
  if (!session) return <Redirect href="/auth"/>;
  return (
    <NativeTabs tintColor={brand.primary} tabBarRespectsIMEInsets>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Trang chủ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wardrobe">
        <NativeTabs.Trigger.Icon sf={{ default: 'tshirt', selected: 'tshirt.fill' }} md="checkroom" />
        <NativeTabs.Trigger.Label>Tủ đồ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="try-on">
        <NativeTabs.Trigger.Icon sf={{ default: 'wand.and.stars', selected: 'wand.and.stars.inverse' }} md="auto_awesome" />
        <NativeTabs.Trigger.Label>Phòng thử</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="friends">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        <NativeTabs.Trigger.Label>Bạn bè</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
        <NativeTabs.Trigger.Label>Hồ sơ</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
