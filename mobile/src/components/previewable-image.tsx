import { Image, type ImageContentFit } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { protectedImageSource } from '@/services/api-client';

type PreviewableImageProps = {
  uri: string;
  title?: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
};

export function PreviewableImage({
  uri,
  title = 'Xem ảnh',
  style,
  contentFit = 'contain',
  transition,
}: PreviewableImageProps) {
  const { session } = useAuth();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => router.push({ pathname: '/image-viewer', params: { uri, title } })}
      style={({ pressed }) => [style, { overflow: 'hidden', opacity: pressed ? 0.78 : 1 }]}
    >
      <Image
        source={protectedImageSource(uri, session?.access_token)}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={transition}
      />
    </Pressable>
  );
}
