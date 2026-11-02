# Fitting Room

Ứng dụng thử trang phục bằng ảnh AI, không sử dụng mô hình 3D. Repository hiện dùng FLUX 3 Image Klein qua OpenRouter. Ảnh TRƯỚC và SAU được tạo bằng hai thao tác riêng để người dùng chủ động kiểm soát chi phí; ảnh TRƯỚC là tham chiếu cho ảnh SAU.

## Công nghệ

- Frontend: React, Vite, TypeScript strict, Tailwind, Zustand.
- Backend: Node.js, Express, TypeScript.
- Lưu trữ bản đầu: SQLite cho metadata và thư mục local cho file ảnh.
- Production: Supabase PostgreSQL/Auth và Cloudflare R2 private qua adapter backend.
- Tách nền: `@imgly/background-removal`, chạy trực tiếp trong trình duyệt.

## Cài đặt và chạy

Yêu cầu Node.js 22 trở lên.

```bash
npm install
copy .env.example .env
npm run dev
```

- Web và API: `http://127.0.0.1:8787`
- API health check: `http://127.0.0.1:8787/api/health`

Express nhúng Vite ở chế độ development nên frontend và API dùng chung một cổng. Khi chạy `npm start`, Express phục vụ frontend đã build từ `dist/` trên cùng cổng đó.

`npm run dev` chạy đồng thời Vite và Express. Dữ liệu local được tạo trong `data/` và đã được gitignore.

## Kiểm tra và build

```bash
npm run test
npm run build
npm start
```

`npm start` chạy backend đã build trong `dist-server/` và phục vụ frontend production từ `dist/`.

## Biến môi trường

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `HOST` | local `127.0.0.1`, production `0.0.0.0` | Interface Express lắng nghe; Railway cần `0.0.0.0` |
| `PORT` | `8787` | Cổng Express API |
| `DATA_DIR` | `./data` | Vị trí SQLite và thư mục ảnh |
| `PERSISTENCE_BACKEND` | `sqlite` | `sqlite` ở local; production dùng `postgres` |
| `AUTH_BACKEND` | `local` | `local` ở development; production dùng `supabase` |
| `IMAGE_STORAGE` | `local` | `local` ở development; production dùng `r2` |
| `DATABASE_URL` | trống | Supabase Session pooler URI, thêm `sslmode=require` |
| `DATABASE_POOL_MAX` | `10` | Số kết nối tối đa của tiến trình backend |
| `DATABASE_CA_CERT_BASE64` | trống | Base64 của Supabase database CA; giữ xác minh TLS trên Render |
| `SUPABASE_URL` | trống | Project URL của Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | trống | Publishable key dùng cho Supabase Auth phía backend |
| `R2_ACCOUNT_ID` | trống | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | trống | Access key của token chỉ có quyền trên bucket ứng dụng |
| `R2_SECRET_ACCESS_KEY` | trống | Secret key R2, chỉ đặt ở backend |
| `R2_BUCKET` | trống | Tên bucket R2 private |
| `R2_PREFIX` | `uploads` | Tiền tố object để tách môi trường |
| `AUTH_SESSION_DAYS` | `30` | Số ngày duy trì phiên đăng nhập |
| `COOKIE_SECURE` | theo `NODE_ENV` | Production mặc định bật; local HTTP đặt `false` |
| `TRUST_PROXY_HOPS` | trống | Số proxy tin cậy; Railway thường cấu hình `1` sau khi xác minh topology |
| `AI_REQUESTS_PER_15_MIN` | `10` | Giới hạn tạm theo user + IP cho route AI; production nhiều replica cần limiter dùng chung |
| `LEGACY_DATA_CLAIM_TOKEN` | trống | Token backend một lần để account đầu tiên claim dữ liệu bản cũ; xoá sau migration |
| `IMAGE_PROVIDER` | `openrouter` | Provider tạo ảnh; hỗ trợ `openrouter`, `gemini` và `mock` |
| `MOCK_DELAY_MS` | `2000` | Độ trễ mỗi ảnh mock để kiểm thử loading |
| `OPENROUTER_API_KEY` | trống | API key OpenRouter, chỉ đặt ở backend |
| `OPENROUTER_IMAGE_MODEL` | `black-forest-labs/flux-3-image-klein` | Model OpenRouter tạo/chỉnh ảnh |
| `OPENROUTER_IMAGE_RESOLUTION` | `768` | Mức phân giải output để kiểm soát chi phí |
| `OPENROUTER_IMAGE_ASPECT_RATIO` | `4:5` | Tỷ lệ ảnh toàn thân |
| `OPENROUTER_TIMEOUT_MS` | `120000` | Timeout mỗi request OpenRouter |
| `GEMINI_API_KEY` | trống | Chỉ đặt ở backend |
| `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` | Model Gemini tạo/chỉnh ảnh |
| `GEMINI_TIMEOUT_MS` | `120000` | Timeout mỗi request Gemini, tính bằng ms |
| `APP_BASE_URL` | `http://127.0.0.1:8787` | Base URL để backend đọc ảnh local trước khi gửi bytes tới Gemini |
| `MUAPI_API_KEY` | trống | Chỉ đặt ở backend |

Không đặt API key trong biến có tiền tố `VITE_`, vì các biến đó sẽ bị đóng gói vào frontend.

## Deploy production: Render + Supabase + Cloudflare R2

1. Trong Supabase SQL Editor, chạy toàn bộ [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) một lần. File này tự tạo bảng, index, RLS và trigger đồng bộ `auth.users` sang `profiles`; không tạo bảng thủ công.
2. Trong Supabase **Connect**, lấy URI **Session pooler** (port `5432`) và dùng làm `DATABASE_URL`. Mật khẩu có ký tự đặc biệt phải được percent-encode. Trong **Database Settings → SSL Configuration**, tải certificate, chuyển file sang Base64 và đặt vào `DATABASE_CA_CERT_BASE64` để Render xác minh TLS đầy đủ.
3. Tạo một bucket R2 **private**. Tạo API token giới hạn Object Read/Write chỉ cho bucket đó; không bật public development URL.
4. Trên Render dùng build command `npm ci --include=dev && npm run build`, start command `npm start`, rồi đặt:

```env
NODE_ENV=production
HOST=0.0.0.0
COOKIE_SECURE=true
TRUST_PROXY_HOPS=1
PERSISTENCE_BACKEND=postgres
AUTH_BACKEND=supabase
IMAGE_STORAGE=r2
DATABASE_URL=postgresql://...
DATABASE_CA_CERT_BASE64=...
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=fitting-room
R2_PREFIX=production
```

Không đặt `PORT`; Render tự cấp. `APP_BASE_URL` cũng có thể bỏ qua trên Render vì backend dùng biến hệ thống `RENDER_EXTERNAL_URL`; chỉ đặt thủ công khi chạy ở nền tảng khác. Ảnh R2 không có URL public: frontend đọc qua `/uploads/:key`, backend kiểm tra phiên và quyền sở hữu trước khi tải object.

Module social hiện được lưu trong một hàng `social_state` dạng JSONB và dùng `SELECT ... FOR UPDATE` cho mọi mutation. Cách này an toàn cho một Render instance/MVP; trước khi scale ngang nhiều instance hoặc có lượng người dùng lớn, nên chuẩn hoá thành các bảng quan hệ riêng.

Supabase Auth mặc định có thể yêu cầu xác minh email. Nếu bật xác minh, sau đăng ký người dùng phải mở email rồi đăng nhập; nếu tắt trong giai đoạn thử nghiệm, đăng ký sẽ tạo phiên ngay. Không dùng `service_role` key cho luồng này.

Để tính năng **Quên mật khẩu** hoạt động, vào Supabase **Authentication → URL Configuration**:

- đặt **Site URL** thành URL production, ví dụ `https://vn-vton.onrender.com`;
- thêm chính xác `https://vn-vton.onrender.com/reset-password` vào **Redirect URLs**;
- khi chạy local, có thể thêm `http://127.0.0.1:8787/reset-password`.

Backend gọi Supabase gửi email và frontend chỉ nhận recovery token từ phần URL fragment. API trả thông báo chung dù email có tồn tại hay không để tránh dò tài khoản. Dịch vụ email mặc định của Supabase chỉ phù hợp thử nghiệm và bị giới hạn; production nên cấu hình SMTP riêng.

## Đăng nhập và dữ liệu tài khoản

- Đăng ký bằng tên hiển thị, email và mật khẩu tối thiểu 8 ký tự.
- Mật khẩu được băm bằng Node.js `scrypt` với salt riêng; không lưu mật khẩu gốc.
- Phiên đăng nhập dùng token ngẫu nhiên, chỉ hash token được lưu trong SQLite. Cookie có `HttpOnly` và `SameSite=Lax`.
- Tủ đồ, ảnh người, kết quả hiện tại và “Bộ đồ của tôi” đều được phân vùng theo `user_id`.
- Dữ liệu local cũ **không** tự chuyển cho người đăng ký đầu tiên. Muốn claim, operator phải cấu hình `LEGACY_DATA_CLAIM_TOKEN` và gửi token qua header `X-Legacy-Data-Claim-Token` đúng một lần khi đăng ký account đầu tiên.
- Chưa có xác minh email hoặc quên mật khẩu; hai luồng này cần tích hợp dịch vụ gửi email trước khi triển khai công khai.

### Chạy với OpenRouter / FLUX 3 Image Klein

Tạo key tại OpenRouter và đảm bảo tài khoản còn hạn mức. Ở Railway, đặt key trong mục Variables. Khi chạy local, ưu tiên biến môi trường của tiến trình thay vì ghi key vào file được chia sẻ:

```env
IMAGE_PROVIDER=openrouter
OPENROUTER_API_KEY=YOUR_SERVER_SIDE_API_KEY
OPENROUTER_IMAGE_MODEL=black-forest-labs/flux-3-image-klein
OPENROUTER_IMAGE_RESOLUTION=768
OPENROUTER_IMAGE_ASPECT_RATIO=4:5
```

Nếu một key từng xuất hiện trong ảnh chụp, chat, log hoặc workspace gửi cho người khác, phải revoke/rotate key đó; chỉ xoá chuỗi khỏi file không làm key cũ an toàn trở lại.

Backend đọc ảnh local, chuyển thành data URL và gửi qua `input_references`. OpenRouter trả ảnh base64; backend lưu output bằng `ImageStorage`. Chi phí thật của mỗi request được ghi từ `usage.cost` nhưng không log ảnh người dùng.

### Chuyển lại Gemini

Tạo API key trong Google AI Studio, sau đó sửa `.env` ở backend:

```env
IMAGE_PROVIDER=gemini
GEMINI_API_KEY=YOUR_SERVER_SIDE_API_KEY
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
GEMINI_TIMEOUT_MS=120000
```

Không commit `.env`. Backend đọc ảnh người và ảnh đồ từ storage local, chuyển chúng thành inline image data rồi mới gọi Gemini; Google không cần truy cập URL localhost. Output Gemini được lưu lại qua `ImageStorage` và chỉ URL local được ghi vào SQLite.

## Cấu trúc

```text
src/
  components/       Giao diện tủ đồ, upload, kết quả và ảnh người dùng
  hooks/            Hook quản lý object URL
  services/         API client dùng chung, CSRF header và background removal
  store/            Zustand store và unit test
  types/            Domain types dùng ở frontend
server/
  config/           Đọc và chuẩn hoá cấu hình runtime, không chứa secret literal
  domain/           Domain type của backend
  http/             Security headers, rate limit và image-upload validation
  providers/        Adapter Gemini/OpenRouter/mock; API key chỉ nhận từ backend env
  routes/           Express routes
  storage/          Interface repository/storage và implementation SQLite/local
```

## Đã hoàn thành ở Giai đoạn 1

- Layout ba vùng responsive, không có Three.js hoặc mô hình 3D.
- Upload ảnh mặt trước bắt buộc và mặt sau tùy chọn.
- Kiểm tra JPG/PNG/WebP và giới hạn 10MB cho ảnh món đồ.
- Xem ảnh gốc và ảnh đã tách nền cạnh nhau; có thể chọn ảnh khác và tách lại.
- Lưu, tải và xóa món đồ qua Express + SQLite + thư mục ảnh.
- Mỗi nhóm chỉ chọn một món, có nút bỏ chọn và phần tóm tắt bộ đồ.

## Đã hoàn thành ở Giai đoạn 2

- Upload ảnh người dùng dạng JPG/PNG/WebP, tối đa 10MB.
- Resize trên trình duyệt để cạnh dài tối đa 1024px; backend chỉ lưu bản đã resize.
- Cảnh báo ảnh ngang, tỷ lệ bất thường hoặc độ phân giải thấp. Kiểm tra tư thế hiện là heuristic và checklist người dùng, chưa dùng model pose detection.
- Checkbox bắt buộc xác nhận ảnh chính chủ và đồng ý gửi tới dịch vụ AI bên thứ ba.
- Checkbox tự reset khi đổi hoặc xoá ảnh.
- API xoá ảnh người dùng và toàn bộ kết quả; schema kết quả đã sẵn sàng cho Giai đoạn 3.

## Đã hoàn thành ở Giai đoạn 3 — OpenRouter và Gemini

- Interface `ImageProvider` dùng chung cho mock, Gemini và OpenRouter.
- Prompt hai góc nằm riêng trong `server/prompts/try-on-prompt.ts`.
- FLUX nhận ảnh người, tối đa bốn món đồ và dùng ảnh TRƯỚC làm reference cho ảnh SAU.
- Góc SAU ưu tiên ảnh mặt sau của món đồ khi có.
- Nút chính chỉ tạo ảnh TRƯỚC. Khi thành công, người dùng chủ động bấm “Tạo ảnh sau”; mỗi ảnh là một request tính phí riêng.
- Loading, lỗi và nút tạo lại được quản lý riêng theo từng góc.
- Phân loại lỗi quota, timeout, nội dung bị từ chối và provider không khả dụng.
- Output OpenRouter/Gemini được lưu bằng `ImageStorage`; file cũ được dọn khi tạo lại, đổi ảnh người hoặc xoá dữ liệu.

## Đã hoàn thành ở Giai đoạn 4 — Bộ đồ của tôi

- Ảnh TRƯỚC được lưu ngay vào lịch sử; ảnh SAU là tuỳ chọn và được cập nhật vào đúng bộ khi người dùng chủ động tạo.
- Trang “Bộ đồ của tôi” hiển thị nhiều lần thử, hỗ trợ phóng to cặp ảnh và xoá từng bộ.
- Ảnh lịch sử được bảo toàn khi tạo bộ mới; “Xoá toàn bộ dữ liệu” dọn cả lịch sử và file liên quan.
- Chưa có tải ZIP; tính năng này vẫn nằm trong phần còn lại của Giai đoạn 4.

## Chưa làm

- Provider MuAPI chưa cài vì phiên bản hiện tại chọn OpenRouter/FLUX làm provider thật.
- Giai đoạn 4 còn lại: tải ZIP.
- Giai đoạn 5 còn lại: quota/ngân sách **bền vững dùng chung giữa nhiều Railway replica**, cache và retention. Hiện đã có limiter in-memory theo account/IP để bảo vệ bản đơn instance, nhưng đây chưa phải bộ đếm thanh toán production.

## Chuẩn hoá trang phục (Module garment_normalizer)

Module độc lập tại [`src/garment_normalizer/`](src/garment_normalizer) nhận ảnh món đồ sau khi tách nền (PNG RGBA) và chuẩn hoá để mọi món đồ nằm đúng khung, thẳng, cùng tỉ lệ:

- **Kiến trúc 2 tầng độc lập**:
  1. `core/`: Hàm thuần trên `RGBAImage = { data: Uint8ClampedArray; width; height }`, không DOM, chạy và test trực tiếp trong Node.js/Vitest.
  2. `io/`: Xử lý I/O, canvas multi-step halving resize, và chạy ngầm qua **Web Worker** (`postMessage` truyền `ArrayBuffer` dạng transferable, không đơ UI).
- **Lưu ý Safari di động**: Mobile Safari có giới hạn bộ nhớ/diện tích Canvas (`canvas.maxArea`), do đó `max_input_px` được mặc định là `2048` (trên các thiết bị iOS cũ hoặc bộ nhớ thấp có thể điều chỉnh xuống `1536`).
- **Hiệu năng thực tế (Benchmark)**: Ảnh độ phân giải $2048 \times 2048$ hoàn thành toàn bộ pipeline core trong **~930ms** (ngưỡng yêu cầu < 1.5 giây).
- **Kiểm thử tự động**: 10 kịch bản kiểm thử toàn diện tại `src/garment_normalizer/__tests__/phase8_comprehensive.test.ts` (kiểm tra lệch tâm, nghiêng ±10°, nghiêng 25°, cắt mép, xoá rác, lấp lỗ, khử viền đỏ, tính lũy đẳng idempotent, và tỉ lệ relative).

## Module bạn bè & bình chọn

Đã thêm **Bảng tin** (/bang-tin) và **Bạn bè** (/ban-be): lời mời, nhóm, QR/link cá nhân, chia sẻ outfit và bình chọn 1–3 bộ. Xem [hướng dẫn social](docs/social-module.md) để test bằng nhiều tài khoản và hiểu quyền ảnh, tuổi tự khai, báo cáo và giới hạn MVP. Không cần API key mới.

## Kiểm thử với mock provider

`.env` local mặc định:

```env
IMAGE_PROVIDER=mock
MOCK_DELAY_MS=2000
```

Mock tạo từng ảnh theo đúng thao tác của người dùng. Mỗi ảnh là SVG có nhãn `NOT AI OUTPUT`; đây chỉ là dữ liệu giả để kiểm thử loading, lỗi, tạo lại và bố cục, không phải kết quả thử đồ AI.
