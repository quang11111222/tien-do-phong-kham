# UAT — Tiến độ dự án PTPK

Ngày kiểm thử: 2026-09-09  
Môi trường: GitHub Pages + Supabase production  
Vai trò: Quản trị viên (`admin`) và Nhân viên (`005902`)

Quy ước: `[x]` đạt; `[~]` kiểm tra một phần hoặc không thực hiện thao tác làm đổi thông tin đăng nhập/dữ liệu thật; `[ ]` chưa kiểm thử.

## 1. Xác thực và tài khoản

- [x] Đăng nhập đúng/sai mật khẩu; đăng xuất.
- [x] Quản trị viên thấy màn Quản lý người dùng; nhân viên mở trực tiếp `#/users` bị đưa về Danh mục dự án.
- [~] Form tạo tài khoản có đủ họ tên, username, mật khẩu tạm và vai trò; không tạo account rác vì hệ thống chưa có chức năng xóa tài khoản.
- [~] Màn hình có sửa họ tên/vai trò, reset mật khẩu và khóa/mở; không đổi thật tài khoản được cấp để tránh làm sai thông tin đăng nhập UAT.
- [x] Nút khóa `admin` gốc bị vô hiệu hóa; vai trò `admin` gốc bị khóa ở Quản trị viên.
- [~] Cả hai vai trò có popup tự đổi mật khẩu; đã kiểm tra mật khẩu mới không khớp và mật khẩu hiện tại sai. Không đổi thành công để giữ nguyên credential người dùng cấp.

## 2. Danh mục dự án và điều hướng

- [x] Hai vai trò xem được toàn bộ dự án đang hoạt động.
- [x] URL hash mở trực tiếp đúng màn hình; URL quản trị còn kiểm tra thêm quyền vai trò.
- [x] Quản trị viên tạo/sửa/xóa mềm/khôi phục dự án UAT; nhân viên không có thao tác quản trị. Dự án UAT đã được dọn sau test.
- [x] Loading state và popup xác nhận tùy biến hiển thị đúng; không dùng confirm của trình duyệt.

## 3. Tiến độ, hạng mục và công việc

- [x] Quản trị viên thêm hạng mục bằng panel; X mở popup bỏ bản nháp, Lưu mới ghi dữ liệu.
- [~] Đã thêm một công việc con, sửa tên/trạng thái/chủ trì/phối hợp; chưa lặp riêng một cây ba cấp trong vòng UAT này.
- [x] Gán tài khoản `005902`; nhân viên chỉ thấy đúng việc được phân công trong danh sách có thể cập nhật.
- [x] Xóa hạng mục UAT hiển thị popup và xóa cả cây con, bằng chứng, lịch sử liên quan.
- [x] Gantt hiển thị tên đầy đủ đơn vị chủ trì và dấu `Có diễn biến mới` tại dòng UAT.
- [~] Tìm kiếm hoạt động đúng; chưa chạy lại toàn bộ tổ hợp lọc/zoom/thu gọn.

## 4. Diễn biến, bằng chứng và duyệt

- [x] Quản trị viên và nhân viên đều ghi diễn biến thành công từ trang Nhật ký.
- [x] Nhân viên chỉ được chọn việc mình tham gia; việc khác không xuất hiện trong form ghi diễn biến.
- [~] Việc chờ duyệt hiển thị rõ lý do khóa; logic hoàn thành dùng cùng nhánh nhưng chưa chụp lại panel sau duyệt trước khi dọn UAT.
- [~] Một file bằng chứng được tải lên và hiển thị đúng; công cụ UAT không điều khiển được native file picker nên bước truyền file được gọi qua cùng Supabase session, sau đó toàn bộ luồng tiếp tục trên web.
- [x] Thiếu bằng chứng thì nút gửi bị khóa; có đúng một bằng chứng thì gửi được.
- [x] Từ chối không có lý do bị chặn; từ chối có lý do, gửi lại lần 2 và duyệt đều thành công; Nhật ký ghi đủ 6 sự kiện.

## 5. Mốc và import/export

- [x] Thêm mốc, Hủy bỏ bản nháp, Lưu mốc và Xóa + Lưu đều hoạt động; mốc UAT đã được dọn.
- [ ] Chưa chạy import production vì thao tác thay toàn bộ tiến độ dự án; cần một project sandbox cố định để kiểm thử hồi quy import.
- [~] Đã kích hoạt Xuất Excel không phát sinh lỗi giao diện; chưa xác minh nội dung file tải về trong vòng UAT này.

## Lỗi phát hiện và xử lý

1. Trang Nhật ký trước đây chỉ đọc và panel Gantt ẩn ô nhập khi không đủ quyền. Đã thêm form ghi diễn biến, lọc đúng công việc theo phân công và hiển thị lý do khóa.
2. Hàm `review_completion_request` gán kết quả `CASE` kiểu `text` vào enum `work_item_status`, khiến cả Duyệt/Từ chối lỗi. Đã thêm migration `202609090013_fix_completion_review.sql`, ép kiểu enum và kiểm tra lại database lint không còn lỗi.

## Kết quả chung

Luồng lõi từ tạo việc → phân công → cập nhật diễn biến → bằng chứng → gửi duyệt → từ chối → gửi lại → duyệt đã đạt trên production với hai vai trò. Toàn bộ dữ liệu có tiền tố `UAT-` đã được dọn sau kiểm thử.
