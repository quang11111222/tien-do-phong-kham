# Bàn giao giữa Codex và Claude - PTPK

Không ghi mật khẩu/token/dữ liệu cá nhân. Đây là trạng thái được người thực hiện ghi lại, phải kiểm chứng trước khi tiếp tục. Không thay thế Brief, Decisions hoặc bằng chứng test.

## Trạng thái hiện tại

- 2026-09-16 bản sửa thông báo nộp hoàn thành và đổi nhãn/cỡ cột Gantt do công cụ API key để lại đã commit/push trong `fc6a97e`; workflow GitHub Pages `35093304169` completed/success. Thay đổi gồm `GanttView.tsx`, `workItemDisplay.ts`/test, `prototype.css`; không đổi database/migration. Nút gửi không còn khóa âm thầm khi thiếu dữ liệu, thông báo nêu rõ điều kiện còn thiếu. Lint, type-check, 67 tests, build đạt; build vẫn cảnh báo chunk lớn. Browser production với `?qa=fc6a97e` xác nhận nhãn Gantt **THỰC TẾ**, nút nộp bấm được và thông báo chính xác khi chưa có tệp. Đã tạo riêng công việc `XXII.5.1` trong `PK-DEMO-QA-21` với hạn 15/09/2026 để kiểm thử và giữ lại; chưa nộp bằng chứng hoặc thay trạng thái công việc. Nhánh thiếu lý do trễ có unit test nhưng chưa browser-test vì công cụ trình duyệt không cho chọn file để tải lên. Không ghi dữ liệu ở Khe Tre/Sơn Tây. `.gitignore` chỉ có khác biệt line ending và `outputs/` là dữ liệu QA ngoài phạm vi, không stage.

- 2026-09-16 Codex bổ sung ba phòng/ban Thư ký (`THUKY`), Ban Tổng giám đốc (`BTGD`), Ban giám đốc (`BGD`) bằng migration `202609160002_add_leadership_departments.sql`. Đã áp dụng production và đăng ký migration qua SQL Editor; truy vấn độc lập xác nhận cả ba bản ghi hoạt động với thứ tự 22–24. Production web xác nhận đủ 24 đơn vị ở bộ lọc Gantt, ô chọn chủ trì/phối hợp và màn người dùng; lọc `THUKY` chưa có việc trả thông báo trống đúng. Không tạo tài khoản/công việc mới. `lint`, `type-check`, 64 tests và build đạt; build còn warning chunk lớn đã có. Commit `815a08b` đã push lên `origin/main`; workflow GitHub Pages `35092158332` completed/success. Các sửa đổi local Gantt/CSS, `.gitignore` và `outputs/` có sẵn của công cụ khác được giữ nguyên, không nằm trong phạm vi deploy này.

- 2026-09-16 Codex đã đổi nhãn cột Gantt từ **Kết thúc thực tế** thành **Thực tế** và thu cột về độ rộng ngày tiêu chuẩn để bảng gọn hơn; không đổi dữ liệu/logic ngày thực tế. `type-check`, lint, 64 tests và build đạt; browser local QA-21 xác nhận nhãn **THỰC TẾ** nằm gọn trong cột 88px. Thay đổi này được gộp vào bản cập nhật thông báo gửi hoàn thành ở mục trên.

- 2026-09-16 ba yêu cầu UI đã deploy production từ commit `7a5e009`; workflow GitHub Pages `35077519647` completed/success. Bảng Gantt có cột **Kết thúc thực tế**; panel có tab **Đề xuất việc con** chỉ cho Nhân viên/Quản trị phòng; menu **Xét duyệt** hiển thị tổng hai hàng đợi theo đúng phạm vi quyền. Không đổi database/migration/dữ liệu. `type-check`, lint, 64 tests và build đạt; build còn cảnh báo chunk lớn. Browser local bằng phiên Nhân viên trên QA-21 xác nhận ngày thực tế `16/9/2026`, trạng thái rỗng/hạng mục là `—` và tab đề xuất chọn sẵn đúng công việc cha. Browser production bằng Quản trị hệ thống xác nhận menu `Xét duyệt 2` khớp `1` duyệt hoàn thành + `1` duyệt việc phát sinh, panel không có tab đề xuất, console không có lỗi. Không gửi/duyệt đề xuất và không ghi dữ liệu test. Chưa kiểm tra UI riêng bằng phiên Quản trị phòng/Quản trị dự án; logic ẩn/hiện theo quyền có test tự động. `.gitignore` và `outputs/` vẫn là thay đổi có sẵn ngoài phạm vi, không stage.

- 2026-09-16 bản sửa theo dõi ngày thực tế đã deploy production từ commit `fb5387c`; workflow GitHub Pages `35062839878` completed/success. Panel giữ một trường Bắt đầu kế hoạch dùng đồng thời làm ngày bắt đầu thực tế, hiện riêng Kết thúc kế hoạch/Kết thúc thực tế, bắt buộc nhập lý do trễ riêng khi quá hạn, truyền đúng `late_reason` và cho người duyệt xem lý do trễ. Production QA-21 đã xác nhận công việc kế hoạch kết thúc 15/09/2026 hiển thị kết thúc thực tế 16/09/2026 và không còn trường Bắt đầu thực tế bị lặp. Trước push, type-check, lint, 62 tests và build đạt; build chỉ còn cảnh báo chunk lớn. Migration `202609160001_plan_actual_completion.sql` đã được áp dụng từ lượt trước; lần deploy này không đổi database và không ghi dữ liệu test.

- 2026-09-16 đã áp dụng migration `202609160001_plan_actual_completion.sql` trên Supabase production qua SQL Editor và đăng ký vào `supabase_migrations.schema_migrations`. Xác minh: `actual_completed_at=1`, `late_reason=1`, RPC submit 3 tham số tồn tại `1`, dữ liệu `late_reason` hiện có `0` dòng. Frontend commit `f8e7990` đã deploy trong workflow `35052414751` từ commit đồng bộ `c5cc7c7`.
- 2026-09-16 đã kiểm tra browser: production bằng phiên Quản trị hệ thống mở được `#/users` và hiển thị 15 tài khoản QA/demo; local bằng phiên nhân viên mở được `PK-DEMO-QA-21#/gantt`. Các ca duyệt và rollback workflow đã kiểm tra sau khi migration áp dụng; không test ghi tại Khe Tre/Sơn Tây.

- 2026-09-16 bản sửa nhãn ngày hôm nay đã deploy production từ commit `0f4ea7d`. GitHub Actions workflow `35049086018` (`build-and-deploy`) completed/success; production URL `https://quang11111222.github.io/tien-do-phong-kham/?qa=0f4ea7d#/projects/PK-KHETRE/gantt` mở được bản ứng dụng mới và đang yêu cầu đăng nhập. Chưa xác minh trực tiếp nhãn Gantt sau đăng nhập trong lượt này. Workflow có cảnh báo nền tảng: một số action đang target Node.js 20 và bị ép chạy Node.js 24.

- 2026-09-16 đã sửa lỗi nhãn ngày hôm nay trên Gantt bị mất ký tự đầu khi đường đỏ nằm sát mép trái: `TodayLine` neo nhãn về bên trái trong vùng 18px đầu thay vì căn giữa vượt ra ngoài vùng timeline. Đã sửa `GanttView.tsx` và `prototype.css`; không đổi nghiệp vụ, database hoặc dữ liệu. GitNexus impact `TodayLine`: LOW, hai caller trực tiếp trong Gantt. Lint, type-check, 60 tests và build đạt; build vẫn có cảnh báo chunk JavaScript lớn hơn 500 kB. Chưa kiểm tra browser trực tiếp và chưa commit/push/deploy.

- 2026-09-16 Codex đã điều chỉnh UX chuông theo yêu cầu mới: bỏ phân trang thông báo, giữ khung cuộn gọn và hiển thị liên tục tối đa 20 cập nhật; hai tab Cập nhật mới/Cần chú ý vẫn giữ. Phạm vi gồm `NotificationBell`, CSS và tài liệu nghiệp vụ/decision/bàn giao; không đổi quyền, database hoặc dữ liệu. Lint, type-check, test và build đạt; browser fixture xác nhận cuộn tới mục 20 không bị cắt. Chưa commit/push/deploy.

- 2026-09-16 Codex đã sửa lỗi bố cục popup chuông thông báo: panel dùng flex dọc, danh sách co giãn và cuộn trong phần còn lại nên hàng cuối không bị cắt. Không đổi giới hạn 20 cập nhật, nghiệp vụ, database hoặc dữ liệu. Lint, type-check, 60 tests và build đạt; fixture local dùng CSS thật xác nhận cuộn tới cuối hiển thị đủ mục thứ 20. Chưa kiểm tra production; chưa commit/push/deploy.

- Ngày 2026-09-15 đã xóa vĩnh viễn khỏi production hai dự án thử: mã `1` (tên `1`) và `PK-DEMO-PTPK`. Giữ nguyên `PK-DEMO-QA-21`, `PK-KHETRE`, `PK-SONTAY`. Đã dọn 3 tệp Storage của `PK-DEMO-PTPK`; kiểm tra sau xóa xác nhận không còn project/work item/milestone/project administrator/proposal mồ côi, không có attachment/completion request mồ côi và hai trigger bảo vệ bằng chứng đã được bật lại.

- Bản sửa màn **Xét duyệt** ngày 2026-09-15 đã deploy thành công tại commit `0aa0cf4`; workflow `34914764892` completed/success. Production đã kiểm tra đủ nhân viên thuần, tài khoản có quyền dự án động, quản trị phòng và quản trị hệ thống; không thay đổi trạng thái yêu cầu. HDSD Google Docs đã cập nhật đúng menu/hai tab.

- Đã deploy và kiểm thử 2026-09-14: frontend `4f64606` trên `main`, migration `202609140003` đã áp dụng/đăng ký; GitHub Actions `34853947598` completed/success. Web production đã chạy luồng nhân viên gửi/rút/gửi lại, quản trị hệ thống từ chối/duyệt và chuông kết quả. Kiểm thử SQL sau deploy xác minh quyền quản trị phòng/dự án và bật/tắt policy; xem lịch sử mới nhất dưới đây.

- Đề xuất bổ sung công việc con cho nhân viên/Quản trị phòng đã đưa vào production; chỉ Quản trị dự án/hệ thống duyệt. Lint/type-check/build và 57 tests đạt. `.gitignore` và `outputs/` là thay đổi có sẵn, không thuộc tính năng này và không commit.

- Production trước tính năng đề xuất: cấu hình thông báo toàn hệ thống và chuông Cập nhật mới/Cần chú ý đã deploy; migration `202609140002` đã áp dụng. Giữ nguyên artifact và thay đổi local có sẵn.

- Cập nhật: 2026-09-14 (Asia/Saigon).
- Công cụ thực hiện gần nhất: Codex.
- Trạng thái hiện tại: tính năng đề xuất đã deploy; luồng chính production đạt. UI riêng bằng phiên quản trị phòng/quản trị dự án chưa đăng nhập kiểm tra trong lượt deploy này; quyền hai vai trò đã kiểm thử trực tiếp SQL trên schema deployed trong transaction rollback.
- Dọn artifact local: đã kiểm tra, chưa xóa/di chuyển. Lệnh filesystem bị exec policy chặn trước khi chạy; không thử đường khác để vượt chặn. Source ứng dụng, database và web đã deploy không thay đổi.
- Nhánh: `main`; commit tính năng `4f64606`, đã push. Commit tài liệu bàn giao sau deploy bổ sung tiếp; kiểm tra HEAD/diff khi tiếp nhận.
- File chưa theo dõi: `outputs/`; vẫn còn nguyên. Khi được phép dọn, giữ Excel demo 21 phòng/ban và ba báo cáo QA/đo tải trước khi xóa phần tạm còn lại. Chưa tạo `local-artifacts/`.

## Lịch sử bàn giao (mới nhất ở trên)

### 2026-09-16 - Kiểm thử theo dõi kế hoạch và thực tế trên QA-21

- Production browser với phiên Quản trị hệ thống mở `PK-DEMO-QA-21`, duyệt yêu cầu `QA EDGE - Quản trị phối hợp phải chờ duyệt`: UI chuyển Chờ duyệt → Hoàn thành, số Hoàn thành tăng, bằng chứng chuyển khóa.
- SQL xác nhận với công việc này: `submitted_at = 2026-09-13 00:38:18+00`, `reviewed_at = 2026-09-16 03:38:49+00`, `actual_completed_at = 2026-09-13 00:38:18+00`. Như vậy ngày thực tế lấy ngày nộp, không lấy ngày duyệt.
- Transaction rollback trên fixture `QA EDGE - Từ chối và nộp lại` đã đạt: nộp quá hạn thiếu lý do bị chặn; có lý do tạo `pending` nhưng `actual_completed_at` vẫn rỗng; từ chối trả `in_progress` và không có ngày thực tế; nộp lại rồi duyệt đặt `actual_completed_at = submitted_at`. Toàn bộ thay đổi test đã rollback; truy vấn sau test còn `late_reason` thực tế bằng 0 dòng.
- Gantt production hiển thị trạng thái/bằng chứng đã khóa và thanh của việc đã duyệt kéo tới ngày thực tế; cột ngày kế hoạch vẫn giữ ngày kế hoạch để so sánh. Chưa có nhãn chữ riêng “sớm/trễ X ngày” trong UI.
- Frontend deploy: workflow `35052414751` completed/success. Lint, type-check, 60/60 tests và build đạt trước push; build còn cảnh báo chunk khoảng 603 kB. Không test ghi tại Khe Tre/Sơn Tây.

### 2026-09-16 - Triển khai local theo dõi kế hoạch và thực tế

- Backend migration thêm `work_items.actual_completed_at` và `completion_requests.late_reason`. Lượt nộp chỉ chuyển ngày kết thúc thực tế khi được duyệt; lượt từ chối xóa mốc thực tế và tiếp tục ở trạng thái đang thực hiện/quá hạn. Nộp sau hạn không có lý do bị database từ chối.
- Frontend/service đã đọc mốc thực tế, gửi lý do trễ qua RPC và kéo thanh Gantt của việc đã duyệt đến ngày nộp được duyệt; ghi chú nộp hiện tại được dùng làm lý do trễ nếu quá hạn.
- Kiểm tra local: lint, type-check, 60/60 tests, build đều đạt; build còn cảnh báo chunk JavaScript khoảng 603 kB. `get_errors` không báo lỗi ở các file thay đổi.
- Migration đã áp dụng production và truy vấn schema/RPC đạt. Chưa deploy frontend `f8e7990` và chưa chạy các ca UI đúng hạn/trước hạn/quá hạn/duyệt/từ chối.

### 2026-09-16 - Chốt cách đo kế hoạch và thực tế

- Không thêm trường/ngày bắt đầu thực tế. Ngày bắt đầu thực tế mặc định bằng ngày bắt đầu kế hoạch.
- Khi người dùng đã có đủ bằng chứng và bấm nộp hoàn thành, thời điểm nộp chỉ được ghi là ngày kết thúc thực tế sau khi lượt nộp được duyệt. Chỉ upload file hoặc nộp nhưng đang chờ duyệt chưa được tính là kết thúc.
- Nếu thời điểm nộp sau ngày kết thúc kế hoạch, form bắt buộc nhập lý do trễ; lý do lưu cùng lượt nộp để người duyệt xem xét. Nếu bị từ chối, công việc tiếp tục tính quá hạn cho đến lượt nộp được duyệt.
- Đã cập nhật `docs/PROJECT-BRIEF.md` và `docs/DECISIONS.md`. Chưa triển khai code, migration hoặc thay đổi dữ liệu.

### 2026-09-16 - Codex - Deploy sửa nhãn ngày hôm nay Gantt

- Commit frontend `0f4ea7d` đã push lên `main`; workflow [35049086018](https://github.com/quang11111222/tien-do-phong-kham/actions/runs/35049086018) completed/success, job `build-and-deploy` đạt sau 42 giây.
- Production URL: `https://quang11111222.github.io/tien-do-phong-kham/?qa=0f4ea7d#/projects/PK-KHETRE/gantt`. Browser mở được bản mới nhưng chưa đăng nhập nên chỉ xác nhận được trang yêu cầu đăng nhập, chưa xác minh trực tiếp nhãn `16/9` trong Gantt.
- Workflow có một warning không chặn deploy: các action `configure-pages@v5`, `deploy-pages@v4`, `setup-node@v4` và `upload-artifact` đang target Node.js 20, runner ép chạy Node.js 24. Không xử lý warning này trong phạm vi lỗi UI.
- Sau deploy không đổi migration/database/dữ liệu. `.gitignore` và `outputs/` vẫn chưa commit; cập nhật bàn giao này cần commit đồng bộ riêng.

### 2026-09-16 - Codex - Sửa nhãn ngày hôm nay sát mép trái Gantt

- Nguyên nhân: `.nowlab` luôn dùng `translateX(-50%)`, nên khi ngày hôm nay gần đầu timeline, một phần nhãn nằm ngoài vùng `.time` và bị cắt ký tự đầu. `TodayLine` thêm class `edge` khi vị trí dưới 18px; CSS bỏ phép dịch ngang trong trường hợp này để nhãn bắt đầu từ mép timeline.
- GitNexus impact trước sửa: `TodayLine` LOW; caller trực tiếp là `GanttView` và `TimelineHeader`, một process App/Tracker bị ảnh hưởng. FTS cảnh báo DLL OpenSSL trên Windows như các lần trước.
- Kiểm tra: `npm.cmd run lint`, `npm.cmd run type-check`, `npm.cmd run test` (60/60), `npm.cmd run build` đều đạt. Build còn cảnh báo chunk `index` khoảng 603 kB đã có. Chưa kiểm tra browser trực tiếp; chưa commit, push hoặc deploy.
- Không đổi nghiệp vụ, quyền, database hoặc dữ liệu demo. Các thay đổi `.gitignore`, `outputs/` và nội dung bàn giao có sẵn được giữ nguyên.

### 2026-09-16 - Codex - Chuông cuộn liên tục tối đa 20 thông báo

- Theo yêu cầu mới, bỏ hoàn toàn phân trang trong popup chuông; giữ hai tab Cập nhật mới/Cần chú ý và khung cuộn gọn. Cập nhật mới vẫn giới hạn 20 sự kiện sau lọc quyền/loại; không đổi database hoặc dữ liệu.
- `NotificationBell.tsx` bỏ state/trích trang 10 dòng và footer Trước/Sau, render toàn bộ danh sách của tab. `tracker.css` giữ panel flex dọc, danh sách co giãn/cuộn độc lập và xóa selector pagination không còn dùng. Brief và Decisions đã cập nhật quy tắc UX mới.
- GitNexus impact `NotificationBell` trước sửa: LOW, caller trực tiếp `TrackerShell`, module Tracker. FTS/BM25 vẫn cảnh báo Windows error 126 do thiếu DLL OpenSSL runtime.
- Kiểm tra: `npm.cmd run lint`, `npm.cmd run type-check`, `npm.cmd run test` (60/60), `npm.cmd run build` đều đạt; build còn cảnh báo chunk JS 603.11 kB đã có. Browser local với fixture dùng đúng CSS ứng dụng xác nhận tab hiển thị 20 mục trong một danh sách, không có footer phân trang và cuộn tới mục 20 hiển thị trọn vẹn. Fixture tạm đã xóa; không tạo/sửa dữ liệu.
- Chưa kiểm tra production; chưa commit, push hoặc deploy. `.gitignore`, phần thay đổi `docs/HANDOFF.md` có sẵn và `outputs/` được giữ nguyên.

### 2026-09-15 - Codex - Xóa vĩnh viễn hai dự án thử trên production

- Xóa đúng hai bản ghi đã được người dùng chỉ định: `1` / tên `1` (id `3d2896f8-f7ca-4c9d-b2f8-74d815a11bd2`) và `PK-DEMO-PTPK` (id `18096a6c-8e2a-4f48-a307-2cbc9ca81db1`). Thao tác có điều kiện kiểm tra đồng thời ID, mã và tên trước khi xóa.
- Dọn trước 3 object bằng chứng trong bucket `evidence`. Khi cascade bị trigger khóa bằng chứng chặn, giao dịch đầu đã rollback hoàn toàn; giao dịch bảo trì sau đó chỉ tạm vô hiệu hai trigger liên quan, xóa metadata bằng chứng và hai project, bật lại trigger rồi mới commit.
- Kiểm tra SQL sau xóa: project/work item/milestone/project administrator/proposal của hai project đều bằng 0; attachment và completion request mồ côi đều bằng 0; hai trigger `attachments_00_protect_locked` và `work_items_00_protect_submitted_evidence` đều ở trạng thái bật.
- Kiểm tra production bằng tài khoản quản trị hệ thống: danh mục còn đúng 3 dự án `PK-DEMO-QA-21`, `PK-KHETRE`, `PK-SONTAY`; tab Đã xóa bằng 0. Không sửa code, không deploy và không thay đổi Khe Tre/Sơn Tây/QA-21.
- `docs/HANDOFF.md` chỉ được cập nhật local để bàn giao; không tự commit/push. `.gitignore` và `outputs/` là thay đổi có sẵn, không thuộc thao tác này.

### 2026-09-15 - Codex - Sửa phạm vi và tách hàng đợi xét duyệt

- Nguyên nhân lỗi UI: quyền mở màn được tính theo việc tài khoản có quản trị ít nhất một dự án, trong khi danh sách cũ hiển thị mọi yêu cầu backend cho phép đọc, gồm yêu cầu do chính tài khoản gửi. Backend vẫn chặn tự duyệt nhưng giao diện đã hiện sai nút xử lý.
- Màn quản trị đổi tên thành **Xét duyệt** và tách hai tab **Duyệt hoàn thành** / **Duyệt việc phát sinh**, có số lượng, trạng thái trống và phân trang riêng. Hoàn thành lọc theo quản trị hệ thống, quản trị đúng dự án hoặc quản trị phòng của đơn vị chủ trì, đồng thời luôn loại yêu cầu do chính tài khoản gửi. Việc phát sinh chỉ lấy dự án do Quản trị dự án hoặc Quản trị hệ thống quản lý.
- Sửa tải quyền bất đồng bộ để truy cập thẳng URL không đưa nhầm Quản trị dự án về danh mục. Khi vào màn Xét duyệt, tài khoản có quyền dự án động hiển thị đúng nhãn Quản trị dự án thay vì Nhân viên.
- Kiểm tra local: nhân viên thuần không có menu và bị chuyển khỏi URL; tài khoản có quyền dự án động không còn thấy yêu cầu Khe Tre do chính mình gửi; Quản trị phòng không thấy đề xuất của chính mình; Quản trị hệ thống thấy cả hai hàng đợi và popup xác nhận. Không duyệt/từ chối, không thay đổi dữ liệu Khe Tre/Sơn Tây.
- Tự động: lint, type-check, build đạt; 60 tests/11 files đạt. Build còn cảnh báo chunk JavaScript lớn hơn 500 kB. HDSD Google Docs id `1RccJEesgU5K6d2oPu0I1ZrfDt2O-OXVYa-3MIBddEX8`, tab `t.0`, đã cập nhật mục lục, hướng dẫn nhanh, menu và mục xét duyệt; readback xác nhận đúng document/tab và giữ nguyên style đoạn hiện có.
- Commit frontend `0aa0cf4e17b9a0af154ec1e2192b65535d4cb2e8`, đã push `main`; workflow [34914764892](https://github.com/quang11111222/tien-do-phong-kham/actions/runs/34914764892) completed/success. URL kiểm thử production: `https://quang11111222.github.io/tien-do-phong-kham/?qa=0aa0cf4#/approvals`.
- Production UI: Nhân viên thuần không có menu và URL trực tiếp chuyển về danh mục; Quản trị phòng thấy hai tab nhưng chỉ hàng đợi đúng phòng; tài khoản `005902` được nhận diện là Quản trị dự án trên màn này và không còn thấy yêu cầu Khe Tre do chính mình gửi; Quản trị hệ thống thấy 2 yêu cầu hoàn thành và 1 đề xuất phát sinh. Kiểm tra từ chối thiếu lý do có toast, cả hai thao tác duyệt có popup và đã hủy nên không đổi dữ liệu. Console không có lỗi.
- Không stage `.gitignore` hoặc `outputs/` vì là thay đổi/artifact có sẵn ngoài phạm vi. Không có migration database trong bản sửa này.

### 2026-09-14 - Codex - Deploy và kiểm thử đề xuất công việc con

- Frontend commit `4f6460606a71599308eb7f5c7844a6b39ca1639f`; workflow [34853947598](https://github.com/quang11111222/tien-do-phong-kham/actions/runs/34853947598) completed/success. URL kiểm thử: `https://quang11111222.github.io/tien-do-phong-kham/?qa=4f64606#/projects/PK-DEMO-QA-21/gantt`.
- Database: áp dụng qua SQL Editor bản SQL gọn tương đương đã kiểm thử trước đó, gồm kiểm tra nhân sự trước duyệt; đăng ký migration `202609140003`. Query xác nhận schema tồn tại và đủ 10 policy. Không triển khai fixture test lâu dài.
- Production UI bằng nhân viên: mục cha giới hạn nhánh được xem chi tiết; chủ trì kế thừa CN-NVY; chọn phối hợp PTPK thì danh sách nhân sự chỉ CN-NVY/PTPK. Gửi thành công đóng panel; pending chưa tạo work/tăng tiến độ. Rút qua popup, sửa và gửi lại giữ dữ liệu/ngày/phân công. Không có nút duyệt trên tài khoản nhân viên.
- Production UI bằng Quản trị hệ thống: từ chối thiếu lý do hiện toast lỗi và giữ pending; từ chối có lý do trả đề xuất về cho nhân viên. Nhân viên nhận chuông có lý do, sửa/gửi lại; duyệt qua popup tạo một mục `I.1.1`, nhãn Phát sinh, ngày 16–18/9/2026, chủ trì kế thừa và phối hợp PTPK. Mục cha chuyển trạng thái tổng hợp/ngày theo con; việc cuối nhánh thay thế mục cha nên tổng số việc cá nhân không tăng máy móc. Chuông nhân viên có cả kết quả duyệt và thông báo được giao việc mới.
- SQL trực tiếp sau deploy, BEGIN/ROLLBACK, đạt hai bộ: `live approval checks passed`; `department/project/scope/policy checks passed and rolled back`. Xác minh duyệt không tạo trùng; quản trị phòng không duyệt nhưng đề xuất tại nhánh mình được; nhân viên khác phòng bị chặn; quản trị dự án duyệt tạo con đúng lead; pending không tạo work; thông báo yêu cầu duyệt không gửi quản trị phòng; tắt proposal_submitted/proposal_approved làm loại tương ứng biến mất; kết quả đến đúng người đề xuất. Fixture và thay đổi policy rollback hoàn toàn.
- Phân biệt bằng chứng: UI production dùng nhân viên + quản trị hệ thống; quản trị phòng/dự án được kiểm tra nghiệp vụ backend với auth claims, không ghi là đã test UI hai vai trò đó. Chưa kiểm tra tải/concurrency hoặc sửa HDSD Google Docs trong lượt này.
- Giữ lại một đề xuất demo `QA LIVE - Bổ sung thủ tục thực tế`, đã duyệt, cùng công việc con và lịch sử gửi/rút/từ chối/gửi lại/duyệt trong `PK-DEMO-QA-21`; không ghi/xóa dữ liệu Khe Tre/Sơn Tây.
- Tự động trước commit: lint/type-check/build và 57 tests/10 files đạt. GitNexus reindex; detect-changes sau stage bao phủ 14 files/84 symbols/11 flows, HIGH ở notifications/settings dùng chung (đã kiểm tra hồi quy); không dùng zero từ untracked để kết luận an toàn. Build còn cảnh báo chunk >500kB.
- Không stage `.gitignore` hoặc `outputs/`; không xóa artifact. Bước tiếp: cập nhật HDSD luồng đề xuất và bổ sung UI regression riêng quản trị phòng/quản trị dự án khi có phiên đăng nhập phù hợp.

### 2026-09-14 - Codex - Code đề xuất công việc con, chưa deploy

- File mới: `WorkProposals.tsx`, `workProposalService.ts`, test service, migration `202609140003_work_item_proposals.sql`, `supabase/tests/work_item_proposals.sql`. Tích hợp tại Gantt, loại notification/domain/CSS/settings, Brief và Decisions.
- Panel đề xuất: chọn mục cha trong phạm vi xem chi tiết, kế thừa chủ trì, lý do/ngày bắt buộc, chọn phối hợp/nhân sự đủ điều kiện. Hủy/X/Escape hỏi bỏ nếu có thay đổi. Thành công đóng panel; lỗi giữ nháp. Danh sách riêng có phân trang 10, lịch sử, rút, sửa-gửi lại, duyệt/từ chối.
- Backend: chỉ RPC được ghi đề xuất; RLS cho người gửi hoặc quản trị dự án/hệ thống. Duyệt transaction/version lock tạo một mục Phát sinh. Chặn sai nhóm nhân sự, phòng đã ngừng hoạt động/chủ trì thay đổi và phiên bản cũ. Từ chối phải có lý do. Quyền sửa kế hoạch và duyệt hoàn thành không đổi.
- SQL Editor Supabase: chạy migration dạng gọn tương đương + test trong BEGIN/ROLLBACK, kết quả `proposal transaction tests passed and rolled back`. Đạt: khác phòng bị chặn, pending không tạo work, nhân viên/quản trị phòng không duyệt, quản trị phòng được đề xuất, quản trị dự án duyệt, duplicate review bị chặn, rút-gửi lại-từ chối-gửi lại giữ lịch sử, cấu hình 10 loại lưu được, tắt thông báo chờ duyệt ngừng feed, thông báo kết quả đúng người, RLS không lộ đề xuất khác và direct update bị cấm. Chỉ fixture trong demo `PK-DEMO-QA-21`; không ghi Khe Tre/Sơn Tây, toàn bộ rollback.
- Local browser `127.0.0.1:5174`: dùng phiên Quản trị dự án có sẵn, mở panel, chọn mục con CN-NVY kế thừa chủ trì đúng; nhập tên, hủy popup giữ nội dung, X/Đóng và bỏ đóng panel không ghi. Quan sát screenshot và sửa spacing/ô chọn bị padding `.empty` chung. Chưa xác minh submit thành công/duyệt xuyên suốt bằng UI do schema production chưa được áp dụng.
- Tự động: `npm run lint`, `npm run type-check`, `npm run test` (57/10 files), `npm run build` đạt. Build vẫn cảnh báo JS chunk >500kB, không thêm dependency. GitNexus impact Gantt/WorkProposals LOW, feed/settings HIGH (đã báo rủi ro shared notifications). SQL function impact UNKNOWN do không có symbol trong graph; xác minh caller RPC bằng text search + kiểm thử SQL, không coi UNKNOWN là all-clear.
- Deploy/commit: chưa được yêu cầu trong lượt code này nên chưa commit/push/deploy. Quan trọng: migration tăng policy từ 7 lên 10; không áp dụng lâu dài riêng lẻ trước frontend mới vì frontend production cũ chỉ chấp nhận 7. Bước tiếp: triển khai đồng bộ, test UI đầy đủ bằng nhân viên/quản trị phòng/quản trị dự án/hệ thống ở demo, cập nhật HDSD khi bản mới được đưa vào dùng.
- Kiểm tra cuối: SQL read-only xác nhận `proposal_schema_not_applied=true`, `current_policy_count=7`, `test_leftovers=0`. GitNexus reindex thành công (1330 nodes/2949 edges; warning không lưu được parse cache), detect-changes báo HIGH ở các flow chuông/settings dùng chung. CLI diff chỉ liệt kê tracked changes; không coi đây là xác nhận toàn bộ file mới untracked đã được graph-diff bao phủ. Build cuối đạt sau chỉnh màu CSS; server local Vite giữ tại port 5174.

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

### 2026-09-14 - Codex - Kiểm thử nghiệp vụ cấu hình thông báo trên production

- Tạo một fixture có tên `QA-NOTIFY-LIVE-20260914` trong dự án demo `PK-DEMO-QA-21` (không đụng Khe Tre/Sơn Tây): công việc đang mở, hạn hiện tại +2 ngày, giao cho nhân viên `005902`, có một diễn biến do nhân viên tạo. Giữ lại fixture để trình diễn/kiểm thử tiếp.
- Bằng tài khoản nhân viên, chuông trả đúng cả hai loại: `Được giao công việc QA-NOTIFY-LIVE-20260914` trong Cập nhật mới và `Sắp đến hạn ... Còn 2 ngày đến hạn` trong Cần chú ý.
- Tắt `Được giao công việc` ở tài khoản quản trị hệ thống, lưu, đăng nhập lại nhân viên: card giao việc biến mất, các card loại khác vẫn còn. Bật lại và khôi phục mặc định.
- Tắt `Sắp đến hạn`, đăng nhập lại nhân viên: Cần chú ý chuyển về 0 và hiển thị trạng thái không có việc cần nhắc. Bật lại và khôi phục mặc định 3 ngày.
- Với `Diễn biến mới`, tài khoản quản trị hệ thống ban đầu nhận đúng card diễn biến QA do nhân viên tạo; tắt policy thì card fixture bị lọc khỏi chuông; bật lại thì card quay trở lại. Đây là kiểm tra kết quả nghiệp vụ sau lọc, không chỉ kiểm tra toast.
- Đã khôi phục cấu hình production về mặc định: bảy loại bật, due_soon 3 ngày, overdue 1 ngày; nút Lưu cấu hình disabled sau khi không còn bản nháp. Không có thay đổi code trong lần kiểm thử này.
- Chưa kiểm tra toàn bộ ma trận role/phòng phối hợp trong lần này; cần giữ fixture để test thêm người nhận theo nhóm nếu thay đổi policy recipient.

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

### 2026-09-16 - Codex - Kết nối Codex VS Code qua 9Router/XPIKI

- Tạo riêng provider `XPIKI Codex` trong 9Router, prefix `xpiki-codex`, upstream OpenAI-compatible Chat tại `https://api.xpiki.com/v1`; không trộn với provider XPIKI đang phục vụ Claude.
- Lưu connection `XPIKI Codex API` trong kho cấu hình 9Router và thêm bốn model: `gpt-5.6-sol`, `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-6-astra`. Không ghi API key vào repository hoặc tài liệu.
- Cấu hình Codex cấp người dùng tại `C:\Users\005902\.codex\config.toml`: provider `ninerouter_xpiki`, endpoint `http://127.0.0.1:20128/v1`, model mặc định `xpiki-codex/gpt-5.6-sol`; bearer token được đọc từ biến môi trường người dùng bằng auth command. Đã tạo bản sao lưu cấu hình trước khi sửa.
- `codex --strict-config --version` đạt; Codex CLI xác nhận đúng `model: xpiki-codex/gpt-5.6-sol`, `provider: ninerouter_xpiki` và gọi đúng `http://127.0.0.1:20128/v1/responses`, kể cả khi tiến trình hiện tại không có sẵn biến môi trường.
- Kiểm tra connection trong giao diện 9Router đạt `Passed 1/1`. Lần kiểm tra đầu bị XPIKI trả `provider_account_unavailable`, nhưng lần kiểm tra sau bằng đúng binary của extension VS Code đã trả `OK` qua model `xpiki-codex/gpt-5.6-sol` và provider `ninerouter_xpiki`.
- Bổ sung catalog model cục bộ `C:\Users\005902\.codex\xpiki-models.json` và khai báo `model_catalog_json` để extension không tự đổi model có prefix về model OpenAI mặc định. Đã khởi động lại riêng Extension Host; cấu hình và trạng thái model picker đều giữ `xpiki-codex/gpt-5.6-sol`.
- Đối chiếu database thống kê 9Router sau lần gọi thành công: provider đúng connection `XPIKI Codex API`, model upstream `gpt-5.6-sol`, endpoint `/v1/responses`, trạng thái `ok`; không sử dụng tuyến OpenAI/ChatGPT cho lượt sinh nội dung này.
- Sửa provider `XPIKI Codex` trong 9Router từ adapter Chat Completions sang Responses API. Adapter Chat làm sai tên tool (`unsupported call: functions`), khiến VS Code tưởng không có filesystem/GitNexus/Google Drive; sau khi đổi, cùng model đã gọi shell thành công.
- GitNexus đã có global skills và MCP trong cấu hình Codex; refresh index đạt `1.365 nodes`, `3.073 edges`, `57 clusters`, `92 flows`. Plugin Google Drive đã installed/enabled và kiểm thử đọc trực tiếp tiêu đề tài liệu HDSD thành công qua `codex_apps/google_drive.fetch`.
- Sau một phiên VS Code dài và nhiều lượt gọi công cụ, XPIKI bắt đầu trả HTTP `402 insufficient_quota`; cấu hình 9Router/Responses vẫn đúng nhưng key không còn hạn mức. 9Router ghi nhận 132 request thành công trước lỗi, khoảng 17,57 triệu input token; chi phí trong thống kê 9Router chỉ là số ước tính, không thay thế số dư chính thức của XPIKI. Chưa thay key hoặc thực hiện giao dịch nạp tiền.
- Các request `/settings/user`, `/wham/usage` của giao diện VS Code vẫn có thể gọi lớp tài khoản ChatGPT để hiển thị UI, nhưng không phải request sinh nội dung. Hội thoại Codex đã mở trước khi đổi cấu hình vẫn giữ model cũ; cần tạo hội thoại mới để dùng tuyến XPIKI.
- Không thay đổi source ứng dụng, database hay dữ liệu dự án; không commit/push/deploy.

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
