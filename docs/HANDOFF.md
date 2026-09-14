# Bàn giao giữa Codex và Claude - PTPK

Không ghi mật khẩu/token/dữ liệu cá nhân. Đây là trạng thái được người thực hiện ghi lại, phải kiểm chứng trước khi tiếp tục. Không thay thế Brief, Decisions hoặc bằng chứng test.

## Trạng thái hiện tại

- Đã thực hiện trong phiên này: Codex xây cấu hình thông báo toàn hệ thống (bật/tắt loại, nhóm nhận, số ngày nhắc hạn), màn quản trị và tách chuông Cập nhật mới/Cần chú ý. Frontend đã commit/push/deploy thành công; migration `202609140002` đã áp dụng trên Supabase và đã kiểm thử database. Giữ nguyên artifact và thay đổi local có sẵn.

- Cập nhật: 2026-09-14 (Asia/Saigon).
- Công cụ thực hiện gần nhất: Codex.
- Trạng thái: frontend `3460ea8` đã deploy thành công, migration `202609140001` đã áp dụng; kiểm thử web và database cho hai thay đổi đã đạt. Kết quả sau test được lưu trong bàn giao này và commit tài liệu riêng; kiểm tra Git khi tiếp nhận.
- Dọn artifact local: đã kiểm tra, chưa xóa/di chuyển. Lệnh filesystem bị exec policy chặn trước khi chạy; không thử đường khác để vượt chặn. Source ứng dụng, database và web đã deploy không thay đổi.
- Nhánh: `main`; commit tính năng đã triển khai `3460ea8`. Kiểm tra HEAD thực tế khi tiếp nhận vì commit bàn giao được tạo sau đó.
- File chưa theo dõi: `outputs/`; vẫn còn nguyên. Khi được phép dọn, giữ Excel demo 21 phòng/ban và ba báo cáo QA/đo tải trước khi xóa phần tạm còn lại. Chưa tạo `local-artifacts/`.

## Lịch sử bàn giao (mới nhất ở trên)

### 2026-09-14 - Codex - Deploy và kiểm thử production cấu hình thông báo

- Commit frontend: `7a89547` (`feat: add configurable notification policies`), đã push `main`. GitHub Actions [34822281953](https://github.com/quang11111222/tien-do-phong-kham/actions/runs/34822281953) completed/success; production dùng URL có `?qa=7a89547` để tránh cache cũ.
- Production bằng tài khoản Quản trị hệ thống: mở trực tiếp `#/notification-settings`, tải đủ bảy loại policy và mặc định sắp hạn 3 ngày/quá hạn 1 ngày; tắt Sắp đến hạn → Lưu hiện toast thành công → bật lại → Lưu khôi phục thành công. Không để lại thay đổi cấu hình ngoài mặc định.
- Production chuông hiển thị đúng hai tab **Cập nhật mới (20)** và **Cần chú ý (0)** tại thời điểm kiểm tra; không để nhắc hạn rỗng chiếm danh sách cập nhật.
- Production bằng tài khoản nhân viên: truy cập thẳng URL cấu hình bị đưa về `#/projects`, menu không hiện Cấu hình thông báo, thẻ tài khoản vẫn là mã phòng `CN-NVY`, chuông chỉ hiện phạm vi cá nhân. Không ghi dữ liệu dự án trong lần test production.
- Kiểm tra sau deploy: local `lint`, `test` (50 tests/9 files), `type-check`, `build` đều đạt; build chỉ cảnh báo chunk lớn. Migration/database đã kiểm thử trước đó; production web đã xác minh riêng sau workflow. `detect-changes` cuối trước commit nhận diện 15 file/20 flow và cảnh báo critical do route/chuông dùng chung; đây là blast-radius dự kiến của việc thêm route và feed, không phải test thất bại.

### 2026-09-14 - Codex - Cấu hình thông báo động (chưa deploy frontend)

- Thêm `src/features/tracker/NotificationSettingsPage.tsx` và `notificationSettingsService.ts`; menu mới chỉ hiện với Quản trị hệ thống tại `#/notification-settings`. Có bảy loại bật/tắt: giao việc, diễn biến, gửi hoàn thành, đã duyệt, từ chối, sắp đến hạn, quá hạn. Nhóm nhận và số ngày nhắc hạn 1–30; mặc định 3 ngày/1 ngày.
- Chuông tách **Cập nhật mới** khỏi **Cần chú ý**, phân trang 10 dòng mỗi phần; cập nhật mới giới hạn 20 sau khi lọc phạm vi, nhắc hạn không chiếm chỗ và không bị đánh dấu đọc. Có chấm chú ý, thông báo lỗi/tải lại và giữ URL/màn hình cũ.
- Backend `supabase/migrations/202609140002_configurable_notifications.sql`: bảng policy RLS chỉ Quản trị hệ thống đọc, RPC lưu atomic có optimistic version, RPC scope tính người nhận bằng `auth.uid()`, quyền xem chi tiết, vai trò quản trị dự án gắn rõ và ngày lịch Việt Nam. Quản trị hệ thống không mặc nhiên nhận mọi deadline; deadline chỉ là việc cuối nhánh còn mở, đúng cấu hình.
- Migration đã chạy thành công trong SQL Editor, đăng ký `202609140002`; query RLS/auth test trả `leftover_fixtures=0`, `deadline_defaults={overdue:1,due_soon:3}`, `migration_registered=true`. Bộ assertions sâu trong transaction rollback đã đạt: nhân viên chỉ nhận việc được giao, Quản trị phòng nhận việc phòng chủ trì nhưng không nhận việc chỉ phối hợp, Quản trị dự án gắn rõ nhận scope dự án, hợp nhất vai trò không trùng, đổi hạn/gỡ phân công/tắt loại làm nhắc biến mất, version cũ bị từ chối, employee/anon không đọc/ghi policy.
- Local UI đã kiểm tra bằng tài khoản quản trị: form mặc định hiển thị đúng, nhập 31 ngày bị chặn và giữ bản nháp, rời trang có popup, lưu 5 ngày hiện toast rồi đã khôi phục 3 ngày; mở hai phiên đồng thời, phiên cũ bị báo xung đột và buộc bỏ/tải lại. Unit suite hiện 50 tests/9 files; lint, type-check, build đều đạt (build chỉ còn cảnh báo chunk lớn).
- Chưa test web production và chưa deploy frontend. Local đã kiểm tra tiếp tài khoản nhân viên: URL cấu hình bị điều hướng về danh mục dự án, menu không hiện “Cấu hình thông báo”, chuông chỉ hiển thị dữ liệu cá nhân của nhân viên (không có mục cần chú ý giả). Backend assertions đã bao phủ quyền. Không ghi dữ liệu Khe Tre/Sơn Tây; fixture notification rollback hoàn toàn.
- File test SQL giữ ở `supabase/tests/notification_policies.sql` và `supabase/tests/notification_policies_rls.sql`; chỉ dùng dự án demo và không chứa mật khẩu/token. Claude cần đọc migration đã áp dụng trước khi sửa tiếp; nếu deploy phải push frontend và xác minh workflow/web, không coi migration riêng là đã deploy tính năng.

### 2026-09-14 - Codex - Kiểm tra rác local (chưa xóa)

- Người dùng yêu cầu dọn output và tệp thừa. Đã kiểm tra cấu trúc, Git, package scripts và tham chiếu; GitNexus impact sáu script QA trả UNKNOWN, tìm kiếm bổ sung không thấy ứng dụng/CI tham chiếu chúng. Không coi zero caller là chứng minh tự động rằng không dùng.
- Các thư mục có thể dọn: `outputs/` sau khi giữ bốn artifact cần thiết, `.tmp-feedback-sheet/`, `.tmp-hdsd-v15/`, `.tmp-hdsd-v15-role/`, `demo-evidence/` (rỗng), `dist/` (build tạo lại). Tổng khoảng 13.2 MiB.
- Cần giữ: `outputs/qa-20260913/ke-hoach-demo-21-phong-ban.xlsx`, ba báo cáo `KET-QUA-*.md`. File Excel đã được người dùng yêu cầu giữ ở nhiệm vụ trước.
- Hai junction `outputs/qa-20260913/node_modules` và `.tmp-feedback-sheet/node_modules` trỏ ra thư viện runtime ngoài project. Phải chỉ gỡ junction, không recurse vào target thư viện dùng chung.
- Đã chuẩn bị lệnh với kiểm tra đường dẫn/giữ artifact/hash/gỡ junction/Recycle Bin, nhưng exec policy từ chối toàn bộ trước khi chạy. Chưa có thao tác xóa/di chuyển nào. Đã bỏ các sửa đổi ignore tạm; chỉ lưu ghi chú bàn giao này, chưa commit/push/deploy.

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
