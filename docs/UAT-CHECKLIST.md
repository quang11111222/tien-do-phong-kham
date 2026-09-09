# UAT — Tiến độ dự án PTPK

Ngày kiểm thử: 2026-09-09  
Môi trường: GitHub Pages + Supabase production  
Vai trò: Quản trị viên (`admin`) và Nhân viên (`005902`)

## 1. Xác thực và tài khoản

- [ ] Đăng nhập đúng/sai mật khẩu; đăng xuất.
- [ ] Quản trị viên thấy màn Quản lý người dùng; nhân viên không truy cập được URL quản trị.
- [ ] Tạo tài khoản có họ tên, username, mật khẩu tạm và vai trò.
- [ ] Sửa họ tên/vai trò; reset mật khẩu; khóa/mở tài khoản khác.
- [ ] Không khóa/hạ quyền `admin` gốc; không tự khóa/tự hạ quyền.
- [ ] Mỗi tài khoản tự đổi mật khẩu: sai mật khẩu hiện tại, mật khẩu mới không khớp, đổi thành công.

## 2. Danh mục dự án và điều hướng

- [ ] Hai vai trò xem được toàn bộ dự án đang hoạt động.
- [ ] URL trực tiếp mở đúng Danh mục, Tổng quan, Gantt, Mốc và Nhật ký.
- [ ] Quản trị viên tạo/sửa/xóa mềm/khôi phục dự án; nhân viên không có thao tác quản trị.
- [ ] Empty/loading/error state và popup xác nhận hiển thị đúng.

## 3. Tiến độ, hạng mục và công việc

- [ ] Quản trị viên thêm hạng mục bằng panel; X/Hủy không lưu, Lưu mới ghi dữ liệu.
- [ ] Thêm công việc con nhiều cấp; sửa tên, ngày, trạng thái, đơn vị chủ trì/phối hợp.
- [ ] Gán nhiều người tham gia; nhân viên chỉ sửa phần việc được phân công.
- [ ] Xóa công việc/hạng mục hiển thị popup và xử lý đúng cây con.
- [ ] Gantt hiển thị đủ chữ, ngày, trạng thái, tên đầy đủ đơn vị chủ trì và dấu diễn biến mới.
- [ ] Tìm kiếm, lọc trạng thái/đơn vị, zoom, thu gọn/mở rộng hoạt động đúng.

## 4. Diễn biến, bằng chứng và duyệt

- [ ] Quản trị viên ghi diễn biến vào công việc đang mở từ Nhật ký và panel Gantt.
- [ ] Nhân viên ghi được diễn biến vào việc tham gia; bị chặn ở việc không tham gia.
- [ ] Việc chờ duyệt/hoàn thành hiển thị lý do bị khóa nhập diễn biến.
- [ ] Một công việc lá chỉ có một file bằng chứng; xem/tải lên/xóa đúng quyền.
- [ ] Không gửi hoàn thành khi thiếu bằng chứng; gửi được khi đủ bằng chứng.
- [ ] Quản trị viên duyệt; từ chối bắt buộc lý do; trạng thái và lịch sử cập nhật đúng.

## 5. Mốc, import/export và báo cáo

- [ ] Thêm/sửa/xóa mốc chỉ lưu khi bấm Lưu; Hủy khôi phục bản đã lưu.
- [ ] Import chỉ đọc sheet đầu, có preview/lỗi và popup trước khi thay dữ liệu.
- [ ] Export Excel và in báo cáo hoạt động.

## Kết quả

Kết quả chi tiết sẽ được cập nhật sau mỗi vòng UAT; dữ liệu có tiền tố `UAT-` phải được dọn sau kiểm thử.
