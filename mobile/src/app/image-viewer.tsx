import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/app-text';
import { useAuth } from '@/providers/auth-provider';
import { protectedImageSource } from '@/services/api-client';
import { colors, spacing } from '@/theme';

export default function ImageViewerRoute() {
  const { session } = useAuth();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ uri?: string; title?: string }>();
  const uri = typeof params.uri === 'string' ? params.uri : '';
  const title = typeof params.title === 'string' ? params.title : 'Xem ảnh';

  return (
    <>
      <Stack.Screen options={{ title }} />
      {uri
        ? <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            minimumZoomScale={1}
            maximumZoomScale={4}
            centerContent
            contentContainerStyle={{ minWidth: width, minHeight: height - 120, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}
          >
            <Image
              source={protectedImageSource(uri, session?.access_token)}
              style={{ width, height: height - 120, backgroundColor: colors.background }}
              contentFit="contain"
              transition={150}
            />
          </ScrollView>
        : <AppText variant="subhead" style={{ padding: spacing.lg, textAlign: 'center' }}>Không tìm thấy ảnh.</AppText>}
    </>
  );
}
