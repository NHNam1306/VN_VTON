# Lộ trình triển khai Tryoh

Tài liệu này chuyển đặc tả sản phẩm thành phạm vi kỹ thuật có thể kiểm chứng. Nguyên tắc là không giả lập các luồng tiền, catalog hay kiểm duyệt khi chưa có quy tắc nghiệp vụ.

## Đã có trong bản hiện tại

- Đăng ký, đăng nhập, quên và đặt lại mật khẩu.
- Tủ đồ theo tài khoản: tải ảnh, tách nền, sửa tên/danh mục, ảnh trước/sau, xoá và xem lớn.
- Tìm kiếm món đồ theo tên, lọc theo danh mục và tiến độ tủ đồ khởi đầu 20 món.
- Chọn nhiều lớp trang phục, ảnh người mẫu, tạo và lưu kết quả thử đồ.
- Bạn bè: tìm theo tên hoặc username, link/mã mời, lời mời, nhóm, chặn và báo cáo.
- Bình chọn outfit riêng tư, thông báo, phân quyền outfit và thu hồi quyền khi huỷ kết bạn.
- Hồ sơ, chế độ tối, onboarding lần đầu và điều hướng dưới dành cho điện thoại.
- Lưu trữ production qua PostgreSQL/Supabase Auth/R2 theo adapter đã cấu hình.

## Phạm vi năm 1 cần hoàn thiện tiếp

### P0 — trước khi mời người dùng thật

- Kiểm thử end-to-end trên điện thoại cho onboarding, upload, thử đồ, bình chọn và đặt lại mật khẩu.
- Đồng bộ cài đặt theme/onboarding trên nhiều thiết bị nếu sản phẩm yêu cầu; hiện trạng thái giao diện được lưu trên thiết bị, còn hồ sơ và quyền riêng tư lưu ở máy chủ.
- Xoá tài khoản và toàn bộ dữ liệu liên quan (PostgreSQL, Supabase Auth, R2).
- Hạn mức upload/dung lượng, chống spam và hàng đợi tạo ảnh.
- Theo dõi lỗi không chứa ảnh, token hoặc thông tin nhạy cảm.

### P1 — Shop

Chỉ triển khai khi có nguồn catalog hợp pháp. Cần chốt:

1. Nguồn sản phẩm/đối tác và điều khoản sử dụng ảnh.
2. Schema sản phẩm, biến thể, giá, tồn kho và deep link.
3. Chu kỳ đồng bộ và hành vi khi sản phẩm hết hàng.
4. Quy tắc lưu sản phẩm vào tủ đồ và quyền sử dụng ảnh khi thử đồ.

Sau khi có dữ liệu, triển khai các màn: danh sách, tìm kiếm/lọc, chi tiết, lưu vào tủ và mở link mua.

## Phạm vi năm 2 — Inspiration/KOC

Chưa bật trên production cho tới khi chốt:

- Điều kiện trở thành KOC, phí/gói dùng thử và giới hạn.
- Cách ghi nhận affiliate, ngưỡng và lịch thanh toán.
- Ngưỡng báo cáo, quy trình khiếu nại, khoá tài khoản và kiểm duyệt.
- Phạm vi tạo nội dung bằng mô hình sinh ảnh và nghĩa vụ gắn nhãn.
- Thuế, hoá đơn, điều khoản người bán/người sáng tạo.

Khi các quyết định trên có chủ sở hữu và tiêu chí chấp nhận, nên tách thành module catalog, attribution, ledger/payout và moderation; không lưu số dư bằng phép cộng trừ rải rác trong mã ứng dụng.

## Tiêu chí “hoàn chỉnh”

- Mỗi luồng có trạng thái tải, rỗng, lỗi, thành công và khả năng thử lại.
- Quyền xem được kiểm tra ở máy chủ và ở endpoint ảnh, không chỉ ẩn trên giao diện.
- Dữ liệu tồn tại sau redeploy và có quy trình sao lưu/khôi phục.
- Responsive từ 320 px, điều khiển bàn phím, focus rõ và thông báo trạng thái cho trình đọc màn hình.
- Build, kiểm thử đơn vị, kiểm thử tích hợp và smoke test production đều đạt.
