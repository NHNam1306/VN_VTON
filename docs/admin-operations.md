# Vận hành trang quản trị Tryoh

## Phạm vi hiện tại

Module admin được tách khỏi auth, social và giao diện người dùng:

- server/admin/: phân quyền, repository SQLite/PostgreSQL, API và audit log.
- src/components/admin/: giao diện quản trị.
- src/services/admin-api.ts: client duy nhất gọi /api/admin/*.
- supabase/migrations/002_admin_access.sql: role, trạng thái và audit log production.
- supabase/migrations/004_image_credits.sql: số lượt tạo ảnh trọn đời của từng tài khoản.
- supabase/migrations/005_subscription_plans.sql: gói Free/Plus/Pro/Max và audit khi đổi gói.
- supabase/migrations/006_billing.sql: đơn VietQR/payOS, MoMo và thời hạn gói.

Trang quản trị có URL /admin.

## Kích hoạt admin đầu tiên

1. Production: chạy lần lượt 001, 002, 003, 004, 005 và 006 trong Supabase SQL Editor.
2. Thêm biến môi trường backend: ADMIN_EMAILS=owner@example.com. Có thể nhập nhiều email, phân tách bằng dấu phẩy.
3. Redeploy backend rồi đăng nhập bằng email đó. Trong lần xác thực đầu tiên, backend ghi role admin vào bảng profiles.
4. Sau khi đã có admin hoạt động, các role khác được quản lý tại /admin. Việc bỏ email khỏi ADMIN_EMAILS không tự hạ role đã lưu.

Không đưa ADMIN_EMAILS vào biến VITE_* hoặc frontend.

## Ma trận quyền

| Chức năng | User/KOC | Moderator | Admin |
| --- | --- | --- | --- |
| Mở /admin | Không | Có | Có |
| Xem tổng quan/người dùng | Không | Có | Có |
| Đổi role | Không | Không | Có |
| Khoá/mở khoá | Không | Không | Có |
| Đặt số lượt tạo ảnh còn lại | Không | Không | Có |
| Xem audit log | Không | Không | Có |
| Tải sổ giao dịch Excel | Không | Không | Có |

Backend kiểm tra lại quyền cho mọi endpoint. Ẩn nút trên frontend chỉ là hỗ trợ giao diện.

## Biện pháp an toàn

- Admin không thể tự đổi role hoặc tự khoá tài khoản.
- Hệ thống không cho vô hiệu hoá admin hoạt động cuối cùng.
- Tài khoản suspended bị chặn ngay trong bước xác thực, không chỉ ở /admin.
- Mọi thay đổi role, trạng thái hoặc credit đều ghi actor, target, trước/sau và thời gian.
- User, KOC và moderator có 10 lượt tạo ảnh trọn đời mặc định; mỗi ảnh thành công dùng 1 lượt.
- Request tạo ảnh thất bại được hoàn lượt. Admin không tiêu credit và không chịu fixed-window rate limit tạo ảnh.
- API không trả mật khẩu, token, khoá API hoặc ảnh riêng tư.
- Không chỉnh raw_user_meta_data để cấp quyền. Role ứng dụng nằm trong database backend.

## Thanh toán và đối soát

- Cấu hình `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` và/hoặc bộ biến `MOMO_*` trên Render.
- Webhook payOS phải trỏ tới `https://<domain>/api/billing/webhooks/payos`. MoMo nhận `ipnUrl` trực tiếp khi backend tạo giao dịch.
- Backend chỉ kích hoạt gói sau khi xác minh chữ ký webhook và số tiền. Việc cập nhật gói, credit, hạn dùng và trạng thái đơn chạy trong cùng transaction; webhook gửi lặp không cộng quyền lợi lần hai.
- Admin tải báo cáo tại nút **Tải sổ giao dịch Excel** trong `/admin`, hoặc endpoint `GET /api/billing/ledger.xlsx`.
- Database là nguồn dữ liệu chính. File cục bộ `DATA_DIR/reports/payment-transactions.xlsx` được đồng bộ sau callback; endpoint tải Excel luôn dựng lại báo cáo từ database nên không phụ thuộc filesystem tạm của Render.
- Báo cáo lưu mã đơn, mã giao dịch, người mua, gói, số tiền, trạng thái và mốc thời gian. Không lưu API key, chữ ký webhook hoặc dữ liệu ví nhạy cảm.

## Mở rộng sau

Các module moderation, catalog và payout nên có repository/service/router riêng. Không thêm logic tiền hoặc quyền vào component React và không cho frontend cập nhật trực tiếp database.
