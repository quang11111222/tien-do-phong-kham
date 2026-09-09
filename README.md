# Tiến độ dự án PTPK

Repository độc lập để phân tích, thiết kế và phát triển ứng dụng **Tiến độ dự án PTPK** bằng Codex.

## Trạng thái

- Giai đoạn: Xây dựng nền tảng V2
- Frontend: React 19, TypeScript, Vite
- Backend dự kiến: Supabase Auth, PostgreSQL và Storage
- Prototype đã duyệt: [`prototype/index.html`](prototype/index.html)

## Toolchain hiện có

- Git `2.55.0.windows.3`
- Node.js `v24.19.0`
- npm `11.17.0`
- Python: Chưa có trong `PATH`
- .NET SDK: Chưa có trong `PATH`

Node.js/npm đã sẵn sàng nếu chọn web stack. Chỉ cài Python hoặc .NET khi kiến trúc thực sự cần, tránh làm nặng máy và repository từ đầu.

## Chạy ứng dụng

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong `.env.local`. Không đưa service-role key vào frontend.

## Kiểm tra

```powershell
npm run lint
npm run type-check
npm run test
npm run build
```

## Tài liệu

- [Project Brief](docs/PROJECT-BRIEF.md)
- [Decision Log](docs/DECISIONS.md)
- [Kiến trúc V2](docs/ARCHITECTURE.md)
- Database migration: `supabase/migrations/202609090001_initial_schema.sql`

## Nguyên tắc repository

- Không commit mật khẩu, token hoặc file `.env`.
- Thay đổi nghiệp vụ phải được ghi lại trong `docs/PROJECT-BRIEF.md`.
- Quyết định kiến trúc quan trọng được ghi trong `docs/DECISIONS.md`.
- Mỗi thay đổi code phải kèm bước kiểm tra phù hợp.
