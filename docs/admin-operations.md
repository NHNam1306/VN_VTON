# Vận hành trang quản trị Tryoh

## Phạm vi hiện tại

Module admin được tách khỏi auth, social và giao diện người dùng:

- server/admin/: phân quyền, repository SQLite/PostgreSQL, API và audit log.
- src/components/admin/: giao diện quản trị.
- src/services/admin-api.ts: client duy nhất gọi /api/admin/*.
- supabase/migrations/002_admin_access.sql: role, trạng thái và audit log production.

Trang quản trị có URL /admin.

## Kích hoạt admin đầu tiên

1. Production: chạy 001_initial_schema.sql, sau đó chạy 002_admin_access.sql trong Supabase SQL Editor.
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
| Xem audit log | Không | Không | Có |

Backend kiểm tra lại quyền cho mọi endpoint. Ẩn nút trên frontend chỉ là hỗ trợ giao diện.

## Biện pháp an toàn

- Admin không thể tự đổi role hoặc tự khoá tài khoản.
- Hệ thống không cho vô hiệu hoá admin hoạt động cuối cùng.
- Tài khoản suspended bị chặn ngay trong bước xác thực, không chỉ ở /admin.
- Mọi thay đổi role/trạng thái ghi actor, target, trước/sau và thời gian.
- API không trả mật khẩu, token, khoá API hoặc ảnh riêng tư.
- Không chỉnh raw_user_meta_data để cấp quyền. Role ứng dụng nằm trong database backend.

## Mở rộng sau

Các module moderation, catalog và payout nên có repository/service/router riêng. Không thêm logic tiền hoặc quyền vào component React và không cho frontend cập nhật trực tiếp database.
