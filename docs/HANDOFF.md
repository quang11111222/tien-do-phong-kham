# Bàn giao giữa Codex và Claude - PTPK

Không ghi mật khẩu/token/dữ liệu cá nhân. Đây là trạng thái được người thực hiện ghi lại, phải kiểm chứng trước khi tiếp tục. Không thay thế Brief, Decisions hoặc bằng chứng test.

## Trạng thái hiện tại

- Cập nhật: 2026-09-14 (Asia/Saigon).
- Công cụ thực hiện gần nhất: Codex.
- Trạng thái: frontend `3460ea8` đã deploy thành công, migration `202609140001` đã áp dụng; kiểm thử web và database cho hai thay đổi đã đạt. Kết quả sau test được lưu trong bàn giao này và commit tài liệu riêng; kiểm tra Git khi tiếp nhận.
- Phạm vi đã xong: bộ lọc chủ trì đầy đủ, thông báo giao việc cá nhân và chống tạo lại thời điểm giao khi lưu; không thay đổi quyền/luồng duyệt ngoài phạm vi này.
- Nhánh: `main`; commit tính năng đã triển khai `3460ea8`. Kiểm tra HEAD thực tế khi tiếp nhận vì commit bàn giao được tạo sau đó.
- File chưa theo dõi: `outputs/` (test artifacts và scripts QA, không commit vì là output tạm thời).

## Lịch sử bàn giao (mới nhất ở trên)

### 2026-09-14 - Codex - Triển khai bộ lọc và thông báo giao việc

- Người dùng yêu cầu deploy và cập nhật bàn giao cho Claude; đã bổ sung quy tắc bàn giao mỗi lần deploy trong `AI-CONTEXT.md`.
- Supabase project đúng cấu hình frontend; SQL Editor báo Success khi áp dụng migration chống lặp và ghi phiên bản `202609140001` vào `supabase_migrations.schema_migrations` trong cùng transaction.
- Chạy lại lint/type-check/test/build đều đạt (32 tests). Fetch origin: HEAD và origin/main không lệch trước khi commit.
- Frontend commit `3460ea8`, push lên main; workflow [34818265948](https://github.com/quang11111222/tien-do-phong-kham/actions/runs/34818265948) completed/success. Web production mở bằng URL có `?qa=3460ea8` để tránh cache cũ.
- Test trực tiếp production tại `PK-DEMO-QA-21`: tài khoản Quản trị dự án giao người tham gia cho “QA CN-NVY - Công việc nội bộ”, Lưu đóng panel và hiện thông báo thành công. Người nhận đăng nhập thấy Việc của tôi tăng từ 0 lên 1, nhận “Được giao công việc”, bấm mở đúng panel. Đọc xong badge giảm và card giữ class `notification-assigned seen`; form cấu trúc kế hoạch của nhân viên vẫn bị khóa.
- Bộ lọc trên production hiện đủ 21 phòng/ban. Nhân viên chọn KT khi đang xem Việc của tôi: báo rõ không có việc do Phòng Kỹ thuật chủ trì trong phạm vi được xem, không lộ dòng ngoài quyền.
- Kiểm thử database bằng DO assertions trong transaction ROLLBACK, chỉ công việc demo trên: gọi cả `update_work_item_participants` và `update_work_item_details` với danh sách không đổi; toàn bộ bản ghi phân công (gồm assigned_at/assigned_by) không đổi. Giả lập auth nhân viên gọi RPC phân công bị từ chối đúng thông báo quyền; SQL Editor báo Success. Các thay đổi version trong test đã rollback.
- Dữ liệu demo giữ lại: thêm một phân công vào công việc demo hiện có và trạng thái đã đọc của người nhận. Không tạo tài khoản hoặc công việc mới; không ghi dữ liệu Khe Tre/Sơn Tây.
- Không coi đây là nghiệm thu lại toàn bộ hệ thống: chưa chạy lại tất cả vai trò/phòng phối hợp hoặc đo tải trong nhiệm vụ deploy này. Không có lỗi được phát hiện trong các bước đã test.

### 2026-09-14 - Codex - Bộ lọc chủ trì và thông báo giao việc (local)

- Bộ lọc Gantt dùng toàn bộ danh sách phòng/ban đang hoạt động, không lấy riêng từ các công việc cuối nhánh; kết quả trống nêu tên phòng/ban đang lọc và hướng dẫn đổi bộ lọc/phạm vi.
- Chuông đọc phân công từ `work_item_participants`, lọc đúng user đang đăng nhập; hiển thị loại “Được giao công việc”, người giao và liên kết công việc. Giữ cơ chế đọc/chưa đọc và 20 thông báo hiện có; không mở rộng quyền xem dữ liệu.
- Migration `202609140001_preserve_assignment_notifications.sql` giữ nguyên bản ghi người tham gia không đổi trong hai RPC lưu chi tiết/phân công. Chỉ xóa người bị bỏ chọn, thêm người mới; giữ kiểm tra quyền và version của function hiện có.
- Kiểm tra đạt: 32 tests/8 files (4 tests mới cho thông báo giao việc), type-check, lint, build và diff whitespace. Build còn cảnh báo kích thước chunk đã có.
- GitNexus: refresh index thành công; impact UI/service rủi ro thấp, detect-changes toàn bộ diff báo medium ở 3 luồng timer → thông báo. Graph không nhận diện đầy đủ SQL function và file chưa theo dõi; đã đọc trực tiếp migration, vẫn cần kiểm thử database như bên dưới.
- UI local `127.0.0.1:5173`: đăng nhập quản trị và nhân viên, chỉ mở dự án `PK-DEMO-QA-21`; thấy đủ 21 phòng/ban, thử lọc KT + từ khóa không tồn tại và thấy thông báo kết quả trống. Không tạo/sửa/xóa dữ liệu dự án.
- Chưa áp dụng SQL migration; môi trường hiện không có Supabase SQL connector/CLI, psql hoặc Docker. Chưa kiểm thử giao việc mới → người nhận mở chuông → đọc → lưu lại không báo trùng trên database thật; không coi unit test là bằng chứng quyền backend.
- Trước deploy: áp dụng migration (transaction sẽ dừng nếu function khác cấu trúc dự kiến), kiểm thử luồng trên dự án demo gồm quản trị dự án, quản trị chủ trì và phối hợp, rồi deploy theo yêu cầu người dùng. Không test ghi tại Khe Tre/Sơn Tây.

### 2026-09-14 - Claude - Thêm quy tắc commit và project skills

- Thêm quy tắc commit vào `docs/AI-CONTEXT.md` (section 5) và tham chiếu trong `AGENTS.md`.
- Commit 13 project skills (6 GitNexus + 7 project-specific): database-schema, permissions, project-patterns, tracker-service, testing, ui-components, vibe-coding, gitnexus-cli/debugging/exploring/guide/impact-analysis/refactoring.
- Commit `CLAUDE.md` với bảng project-specific skills.
- Commit `fde7518` đã push lên GitHub.
- `outputs/` không commit vì chứa test artifacts (QA logs, test scripts, demo data) không cần track trong Git.

### 2026-09-14 - Claude - Commit thay đổi thông báo + tài liệu phối hợp

- Sửa hệ thống thông báo: giới hạn 20 thông báo mới nhất, giữ thông báo đã đọc (style mờ) thay vì xóa, badge chỉ đếm chưa đọc. Commit `90b3f14`.
- Tạo 7 project skills trong `.claude/skills/`: project-patterns, tracker-service, permissions, database-schema, ui-components, testing, vibe-coding.
- Commit thay đổi tài liệu phối hợp của Codex: `AGENTS.md`, `README.md`, `docs/DECISIONS.md`. Commit `101b784`.
- Push cả hai commit lên `origin/main`.
- Kiểm tra: type-check pass, chưa test UI trên trình duyệt.

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
