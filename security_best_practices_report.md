# Security review — Fitting Room

Ngày rà soát: 2026-11-02  
Phạm vi: source hiện tại của React/Vite và Express/SQLite/local storage. Không chạy web server, không gọi provider, không kiểm tra Git history.

## Kết quả chính

### Đã sửa

1. **Credential OpenRouter trong `.env` cục bộ (High, CWE-798).** Giá trị đã được xoá khỏi `.env` mà không in ra log. `.env` tiếp tục bị Git ignore; `.env.example` được đưa lại vào source với placeholder trống. Key cũ vẫn phải revoke/rotate trên OpenRouter vì xoá local không thu hồi credential.
2. **Claim dữ liệu legacy không có bằng chứng sở hữu (Medium, CWE-862).** Account đầu tiên không còn tự nhận dữ liệu cũ. Claim chỉ chạy khi backend được cấu hình token riêng và request đăng ký cung cấp đúng token.
3. **Route AI thiếu giới hạn (Medium, CWE-770).** Tạo ảnh và AI extract có fixed-window limiter theo user + IP, header quota và `Retry-After`. Auto-detect bị chặn tối đa 5 món; response ảnh FLUX được giới hạn kích thước và kiểm tra chữ ký PNG.
4. **Upload chỉ tin MIME do client khai báo (Medium, CWE-434/CWE-400).** Mọi upload ảnh dùng chung `server/http/image-upload.ts`, được Sharp decode, đối chiếu MIME/format, giới hạn 24 MP; ảnh người còn bị giới hạn cạnh dài 1024 px.
5. **Cookie mutation thiếu lớp CSRF rõ ràng (Medium, CWE-352).** Tất cả mutation `/api` bắt buộc `X-Fitting-Room-Request: 1`; frontend thêm header qua một client dùng chung. CORS không được mở.
6. **Thiếu browser security headers (Low, CWE-693).** Đã thêm CSP, `nosniff`, chống frame, referrer policy, permissions policy và COOP. CSP vẫn cho đúng domain model của IMG.LY để tách nền hoạt động.
7. **Log chứa filename/error provider (Low, CWE-532).** Đã bỏ tên file/tên món và raw response/error khỏi các log AI chính.
8. **Privacy consent bị hardcode ở client.** Consent thực tế từ Zustand được truyền tới API; backend vẫn từ chối nếu không phải `true`. Nội dung xác nhận đã được khôi phục trong UI.
9. **Login limiter chỉ theo IP.** Đã thêm bucket theo email chuẩn hoá, dọn entry hết hạn và reset bucket account khi login thành công.

## Còn lại trước production

- Limiter hiện nằm trong RAM, không chia sẻ giữa nhiều replica và reset khi deploy. Khi chuyển Supabase, đặt quota/spend ledger bằng transaction trong PostgreSQL hoặc Redis; thêm global daily budget circuit breaker.
- `temporaryImages` của social chưa có TTL/file cleanup bền vững. Khi chuyển R2, thêm `expires_at`, lifecycle rule và job xoá metadata/object.
- Registration vẫn phản hồi `409` cho email đã tồn tại. Đây là account-enumeration mức thấp; nên thay bằng email verification/uniform response nếu membership cần riêng tư.
- Provider SDK/HTTP vẫn materialize JSON response trước khi kiểm tra decoded output. Fixed provider + timeout làm giảm rủi ro, nhưng production nên có response/body budget ở transport layer.
- Cần cấu hình chính xác `TRUST_PROXY_HOPS`, `COOKIE_SECURE=true`, `NODE_ENV=production` và TLS/HSTS tại Railway/Cloudflare.
- Chưa chạy dependency audit qua mạng trong lượt này; nên bật Dependabot/Renovate và secret scanning trong CI.

## Quy tắc secret

- Không đặt secret trong biến `VITE_*`, source, test, screenshot hoặc chat.
- Railway giữ API/provider secrets; Supabase service-role chỉ nằm ở backend; R2 secret access key chỉ nằm ở backend.
- Frontend chỉ nhận Supabase anon/publishable key và cấu hình public được phép công khai.
- Nếu credential từng bị lộ, revoke/rotate tại nhà cung cấp; không chỉ đổi tên hoặc xoá file.
