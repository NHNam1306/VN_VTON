# Fitsy Mobile

Ứng dụng Expo/React Native dùng chung tài khoản, tủ đồ, kết quả thử đồ và dữ liệu bạn bè với Fitsy Web.

## Chạy local

```bash
npm install
copy .env.example .env
npm start
```

Điền `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bằng cùng project Supabase của web. `EXPO_PUBLIC_API_URL` là bắt buộc và nên trỏ tới domain API riêng để có thể đổi hạ tầng mà không đổi thương hiệu.

Đặt `EXPO_PUBLIC_BILLING_MODE=external` cho APK phân phối trực tiếp dùng VietQR/MoMo. Với bản gửi Google Play hoặc App Store, bỏ biến này: app ẩn nút thanh toán và gửi header `X-Client-Channel: store`, backend cũng từ chối tạo đơn thanh toán ngoài cho bản đó. Cần tích hợp sản phẩm in-app trước khi bán gói trên cửa hàng.

Người dùng xoá tài khoản trong **Cài đặt → Xóa tài khoản**; app gọi `DELETE /api/auth/account` rồi đăng xuất.

Trong Supabase Authentication, thêm `fitsy://auth-callback` và `fitsy://reset-password` vào Redirect URLs để liên kết xác minh email và đặt lại mật khẩu mở lại ứng dụng.

Nút **Tiếp tục với Google** chỉ hiện khi backend bật `AUTH_GOOGLE_ENABLED=true` (xem README gốc). Khi chạy bằng Expo Go, địa chỉ quay về có dạng `exp://…/--/auth-callback`; thêm `exp://**` vào Redirect URLs của Supabase trong lúc phát triển.

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
