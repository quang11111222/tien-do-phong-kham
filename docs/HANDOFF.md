# Bàn giao giữa Codex và Claude - PTPK

Không ghi mật khẩu/token/dữ liệu cá nhân. Đây là trạng thái được người thực hiện ghi lại, phải kiểm chứng trước khi tiếp tục. Không thay thế Brief, Decisions hoặc bằng chứng test.

## Trạng thái hiện tại

- Cập nhật: 2026-09-14 (Asia/Saigon).
- Công cụ thực hiện gần nhất: Claude.
- Trạng thái: đã commit và push cả hai thay đổi (Claude + Codex).
- Nhánh/HEAD: `main` / `101b784`. Đã push lên `origin/main`.
- Thay đổi chưa được Git theo dõi: `.claude/skills/` (7 project skills: project-patterns, tracker-service, permissions, database-schema, ui-components, testing, vibe-coding), `CLAUDE.md` (đã có section mới), `outputs/`.

## Lịch sử bàn giao (mới nhất ở trên)

### 2026-09-14 - Claude - Commit thay đổi thông báo + tài liệu phối hợp

- Sửa hệ thống thông báo: giới hạn 20 thông báo mới nhất, giữ thông báo đã đọc (style mờ) thay vì xóa, badge chỉ đếm chưa đọc. Commit `90b3f14`.
- Tạo 7 project skills trong `.claude/skills/`: project-patterns, tracker-service, permissions, database-schema, ui-components, testing, vibe-coding. Chưa commit (untracked).
- Commit thay đổi tài liệu phối hợp của Codex: `AGENTS.md`, `README.md`, `docs/DECISIONS.md`. Commit `101b784`.
- Push cả hai commit lên `origin/main`.
- Kiểm tra: type-check pass, chưa test UI trên trình duyệt.

### 2026-09-14 - Codex - Thiết lập ngữ cảnh chung

- Thêm quy trình chung trong `docs/AI-CONTEXT.md`, sổ bàn giao này và đường dẫn đọc/cập nhật trong cả hai file hướng dẫn.
- Giữ nội dung GitNexus và skill sẵn có của hai công cụ, không đồng bộ lịch sử chat/MCP.
- Không thay đổi code, cấu hình runtime, database, tài khoản hoặc dữ liệu test. Không commit/push/deploy.

## Lịch sử bàn giao (mới nhất ở trên)

### 2026-09-14 - Codex - Thiết lập ngữ cảnh chung

- Thêm quy trình chung trong `docs/AI-CONTEXT.md`, sổ bàn giao này và đường dẫn đọc/cập nhật trong cả hai file hướng dẫn.
- Giữ nội dung GitNexus và skill sẵn có của hai công cụ, không đồng bộ lịch sử chat/MCP.
- Không thay đổi code, cấu hình runtime, database, tài khoản hoặc dữ liệu test. Không commit/push/deploy.

## Mẫu cho lần bàn giao tiếp theo

Sửa phần trạng thái hiện tại và thêm mục lịch sử ngắn. Xóa ghi chú mẫu trong bản ghi thực tế; dùng “chưa kiểm tra” thay vì để trống hoặc suy đoán.

```text
Ngày/giờ và múi giờ:
Công cụ/người thực hiện:
Trạng thái: đang làm / cần bàn giao / bị chặn / hoàn tất
Yêu cầu và phạm vi:
Nhánh/HEAD; thay đổi có sẵn cần giữ:
File sẽ sửa hoặc đang sửa (khi bắt đầu):
Việc/file đã thay đổi (khi bàn giao):
Nghiệp vụ/quyết định mới: đường dẫn mục Brief/Decisions
Kiểm tra thực tế: bước, kết quả, môi trường, đường dẫn bằng chứng
Chưa kiểm tra / lỗi còn lại:
Dữ liệu demo đã tạo/sửa: định danh tối thiểu, không thông tin cá nhân
Commit / push / deploy: ghi từng bước; bản web và test sau deploy nếu có
Bước tiếp theo / quyết định cần người dùng:
```
