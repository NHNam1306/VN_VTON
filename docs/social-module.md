# Bạn bè & bình chọn (P0)

## Cách dùng

1. Mỗi người đăng ký/đăng nhập tài khoản riêng.
2. Vào **Bạn bè → Riêng tư & mã mời**, đặt username và sao chép link/QR cá nhân.
3. Người nhận mở link sau khi đăng nhập, gửi lời mời. Người kia chấp nhận trong **Lời mời**.
4. Tạo nhóm trong **Nhóm**, hoặc dùng bạn bè trực tiếp.
5. Tạo outfit ở **Phòng thử**, kết quả được lưu theo luồng có sẵn. **Bộ sưu tập → Xin ý kiến bạn bè** chọn 1–3 outfit (một ảnh trước cũng được).
6. Chọn người nhận/nhóm/tất cả, thời hạn 1h/24h/72h; xác nhận danh sách ai được xem rồi gửi.
7. **Bảng tin** ưu tiên yêu cầu chưa trả lời. Vuốt ngang xem outfit và hai mặt, bấm ảnh phóng to. Đổi lựa chọn trước khi kết thúc.
8. Chủ bài xem kết quả, đóng sớm, xoá, chọn outfit nhiều phiếu nhất làm **outfit chính thức**. Nếu hoà, được chọn một trong các outfit đồng hạng. Nhãn xuất hiện trong bộ sưu tập.

## Quyền riêng tư

- Mặc định outfit riêng tư. Mỗi lần tạo bình chọn cấp quyền cho danh sách người nhận đã xác nhận; chọn nhóm là chọn nhanh danh sách bạn bè hiện tại trong nhóm, không tự thêm người vào bài đã gửi.
- Chia sẻ hồ sơ theo Bạn bè/Nhóm cập nhật theo quan hệ và thành viên hiện tại. Trở về Riêng tư sẽ xoá các bình chọn chứa outfit đó.
- Huỷ kết bạn/chặn thu hồi quyền bài, phiếu và link ảnh; kết bạn lại không tự phục hồi người nhận của bình chọn cũ. Không gửi thông báo huỷ/chặn.
- Các ảnh tủ đồ, ảnh người và kết quả chưa chia sẻ chỉ chủ sở hữu được đọc. Ảnh chia sẻ yêu cầu session; HTTP cache private/no-store. Không thể thu hồi bản ảnh người nhận đã tự tải/chụp lại trước đó.
- Tuổi tự khai (chưa có xác minh giấy tờ). Chưa khai hoặc dưới 18 chỉ nhận lời mời khi có bạn chung hoặc mã mời. Ngày sinh không công khai, chỉ nhập một lần. Mã mời có thể đổi, mã cũ hết hiệu lực.
- Báo cáo lưu riêng vào danh sách reports trong social_state, không báo người bị báo cáo. Chưa có dashboard moderation; cần quy trình quản trị trước khi public.
- Avatar MVP là emoji do người dùng chọn, chưa upload avatar riêng.

## Kỹ thuật / giới hạn MVP

- Routes: /ban-be, /bang-tin, /bang-tin?poll=ID. Notification lời mời mở /ban-be?tab=requests.
- API có auth: /api/social, /search, /invite, /profile/:id và POST /:action. Validation và quyền nằm ở backend, không tin dữ liệu client.
- SocialStore là adapter SQLite riêng: một document JSON trong bảng social_state, transaction cho mỗi mutation. Phù hợp MVP local; cần chuyển sang bảng quan hệ/index và phân trang trước khi có nhiều người dùng. Không thay provider tạo ảnh.
- Kết quả polling 8 giây khi trang social đang hiện; badge thông báo 15 giây. Không phải push notification hệ điều hành hay websocket.
- Thời hạn do server kiểm tra mỗi vote. Thông báo hết hạn được tạo khi có lần đọc/mutation social tiếp theo; không cần cron.
- QR tạo trên trình duyệt bằng qrcode, không gửi mã mời tới dịch vụ ngoài. Link localhost không dùng được từ máy bạn bè; cần domain HTTPS và triển khai server để dùng thực tế.
- Không gọi dịch vụ AI trong module social. Không sửa .env và không tự khởi chạy server.
- Test: npm test. Build: npm run build. Dữ liệu test dùng SQLite trong thư mục tạm riêng.

## Chưa làm (P1, theo tài liệu)

- Xin quyền đọc danh bạ để tìm bạn.
- Reaction nhanh / tin nhắn ngắn trong bình chọn.

