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

Nút **Tiếp tục với Google** chỉ hiện khi backend có `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` (xem README gốc). App mở `EXPO_PUBLIC_API_URL/api/auth/oauth/google` trong trình duyệt, backend làm việc với Google rồi trả về `fitsy://auth-callback?fitsy_code=…`. Khi chạy bằng Expo Go, địa chỉ quay về là `exp://…/--/auth-callback`: thêm địa chỉ đó vào `MOBILE_AUTH_REDIRECT_URLS` của backend và sửa `googleRedirect` trong `src/providers/auth-provider.tsx` trong lúc phát triển.

## Kiểm tra

```bash
npm run lint
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
```

## Test trên iPhone / Android mà không qua cửa hàng

### Cách 1 — Expo Go (miễn phí, không cần tài khoản Apple Developer)

App chỉ dùng các module có sẵn trong Expo Go nên chạy thẳng được — **trừ màn Thử trực tiếp** (camera realtime qua LiveKit WebRTC). Trong Expo Go màn đó chỉ báo cần bản cài đặt; muốn thử phải dùng dev build hoặc bản ad hoc ở Cách 2 trên máy thật (máy ảo không truyền được camera).

1. Trên iPhone: cài **Expo Go** từ App Store rồi **đăng nhập tài khoản Expo** (tài khoản miễn phí ở expo.dev/signup là đủ).
2. Trên máy tính: `npx expo login` bằng **đúng tài khoản vừa đăng nhập trên điện thoại** — từ bản Expo Go hỗ trợ SDK 57 (tháng 9/2026), iPhone thật bắt buộc hai bên cùng một tài khoản, nếu lệch sẽ báo *"these accounts need to match to open this project"*. Kiểm tra bằng `npx expo whoami`. Android, máy ảo và bản dev build không bị yêu cầu này.
3. Trong thư mục `mobile`: điền `.env` với `EXPO_PUBLIC_API_URL` trỏ tới máy chủ đã deploy (điện thoại không vào được `localhost` của máy tính), rồi chạy `npx expo start`.
4. Mở Camera trên iPhone quét mã QR hiện trong terminal. Máy tính và iPhone phải cùng Wi-Fi; nếu mạng chặn, chạy `npx expo start --tunnel`.

Đăng nhập trong lúc dev server đang chạy vẫn được: bấm **Try Again** trong Expo Go. Chỉ khi đổi sang tài khoản khác mới phải khởi động lại dev server, vì Expo CLI nhớ tài khoản trong suốt vòng đời tiến trình.

Mời thêm người vào tổ chức `lmaolmao130s-team` tại <https://expo.dev/settings/members> (Owner/Admin mới mời được; số thành viên không giới hạn kể cả gói Free). Lưu ý: tài liệu Expo chỉ nói Expo Go và terminal phải **cùng một tài khoản**, không nói chung tổ chức là đủ — nên người test chỉ cầm điện thoại thì cách chắc chắn là dev build hoặc bản ad hoc ở Cách 2.

Khác biệt so với bản cài đặt: icon và tên là Expo Go, và địa chỉ quay về sau khi đăng nhập Google/Zalo là `exp://<ip máy>:8081/--/auth-callback` thay vì `fitsy://auth-callback`. Vì vậy máy chủ phải có `MOBILE_AUTH_REDIRECT_URLS=fitsy://auth-callback,exp://*` (mục `*` chỉ dùng khi phát triển, máy chủ tự bỏ qua khi `NODE_ENV=production`).

### Cách 2 — EAS Build bản nội bộ (cần tài khoản Apple Developer, 99 USD/năm)

Ra app Fitsy thật, cài bằng link hoặc QR, không qua App Store và không cần Apple duyệt.

```bash
npx eas-cli@latest login
npx eas-cli@latest device:create          # đăng ký UDID từng iPhone sẽ cài
npx eas-cli@latest build -p ios --profile preview
```

`device:create` in ra một mã QR; mở trên iPhone để cài profile đăng ký máy. Mỗi iPhone chỉ cần làm một lần, nhưng máy nào chưa đăng ký trước khi build thì phải build lại. Build xong EAS cho một link cài đặt.

Muốn gửi cho nhiều người hơn thì dùng TestFlight: `build -p ios --profile production` rồi `npx eas-cli@latest submit -p ios`. Tester nội bộ (tối đa 100 người trong nhóm App Store Connect) nhận bản build ngay, không cần Apple duyệt.

### Cách 3 — Android

`npx eas-cli@latest build -p android --profile preview` ra file APK cài trực tiếp, không cần tài khoản trả phí.

## Thử trực tiếp bằng camera (Decart)

Cần native module nên phải build lại app sau khi cài thư viện:

```bash
npm install                      # cài @decartai/sdk, livekit-client, @livekit/react-native(-webrtc) và 2 config plugin
npx eas-cli@latest build -p android --profile development   # hoặc -p ios
npx expo start --dev-client
```

- `app.json` đã thêm plugin `@livekit/react-native-expo-plugin` và `@config-plugins/react-native-webrtc` (quyền camera).
- Thư viện WebRTC chỉ được nạp khi màn Thử trực tiếp bắt đầu (`src/services/live-preview-runtime.ts`), nên Expo Go không bị văng.
- App xuống nền là phiên dừng ngay.

## Build cài đặt

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

Profile `development` dùng cho bản dev client (chạy được code native ngoài Expo Go), `preview` tạo bản cài nội bộ (APK cho Android, ad hoc cho iOS), `production` dùng cho bản phát hành chính thức.
