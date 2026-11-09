# Tryoh Mobile

Ứng dụng Expo/React Native dùng chung tài khoản, tủ đồ, kết quả thử đồ và dữ liệu bạn bè với Tryoh Web.

## Chạy local

```bash
npm install
copy .env.example .env
npm start
```

Điền `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bằng cùng project Supabase của web. `EXPO_PUBLIC_API_URL` là bắt buộc và nên trỏ tới domain API riêng để có thể đổi hạ tầng mà không đổi thương hiệu.

Đặt `EXPO_PUBLIC_BILLING_MODE=external` cho APK phân phối trực tiếp dùng VietQR/MoMo. Với bản gửi Google Play hoặc App Store, bỏ biến này để không mở cổng thanh toán ngoài ứng dụng; tích hợp sản phẩm in-app trước khi phát hành store.

Trong Supabase Authentication, thêm `tryoh://auth-callback` vào Redirect URLs để liên kết xác minh email mở lại ứng dụng.

## Kiểm tra

```bash
npm run lint
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
```

## Build cài đặt

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Profile `preview` tạo bản Android cài nội bộ. Profile `production` dùng cho bản phát hành chính thức.
