# Rate limiting production

## Kiến trúc hai tầng

1. Mọi `/api/*` (trừ health check) đi qua token bucket trong RAM theo IP. Tầng này tương đương lớp `limit_req`/burst của Nginx: rất nhanh, không ghi database và bảo vệ mỗi instance trước request burst.
2. Đăng ký, đăng nhập, quên mật khẩu và tạo ảnh dùng fixed window trong PostgreSQL. Câu lệnh upsert là atomic nên nhiều Render instance vẫn nhìn thấy cùng một quota.

IP và email được SHA-256 trước khi trở thành bucket key. Bảng rate limit không cấp quyền cho `anon` hoặc `authenticated`.

## Triển khai

Chạy `supabase/migrations/003_rate_limits.sql` trong Supabase SQL Editor sau migration 001 và 002, rồi redeploy. Không cần thêm Redis cho quy mô hiện tại.

Các biến có thể tinh chỉnh:

| Biến | Mặc định | Ý nghĩa |
| --- | ---: | --- |
| `API_REQUESTS_PER_MINUTE` | 600 | Tốc độ nạp token theo IP trên mỗi instance |
| `API_RATE_LIMIT_BURST` | 120 | Burst tối đa theo IP trên mỗi instance |
| `AUTH_LOGIN_ACCOUNT_PER_15_MIN` | 10 | Thử đăng nhập cho một tài khoản |
| `AUTH_LOGIN_IP_PER_15_MIN` | 60 | Thử đăng nhập từ một IP; cao hơn quota tài khoản để tránh chặn NAT |
| `AUTH_REGISTER_IP_PER_HOUR` | 20 | Đăng ký từ một IP mỗi giờ |
| `AUTH_RESET_ACCOUNT_PER_15_MIN` | 5 | Email reset cho một tài khoản |
| `AUTH_RESET_IP_PER_15_MIN` | 30 | Email/reset từ một IP |
| `AI_REQUESTS_PER_15_MIN` | 10 | Lượt tạo ảnh cho một user |

Phản hồi bị chặn có HTTP 429, `Retry-After`, `RateLimit-*`, `X-RateLimit-*` và mã `rate_limit_exceeded`.

## Khi traffic lớn hơn

- Đặt Cloudflare trước Render và bật WAF/rate limiting ở edge cho bot, quốc gia hoặc path bị tấn công. Không tin trực tiếp `X-Forwarded-For`; giữ `TRUST_PROXY_HOPS` đúng topology.
- Khi auth/AI đạt lưu lượng rất lớn, thay `PostgresRateLimitStore` bằng Redis/Valkey dùng Lua atomic. Interface `RateLimitStore` đã tách sẵn nên router không cần sửa.
- Không dùng PostgreSQL cho limiter toàn bộ request: tầng token bucket cố ý chạy trong RAM để không biến mỗi lần tải dữ liệu thành một database write.

