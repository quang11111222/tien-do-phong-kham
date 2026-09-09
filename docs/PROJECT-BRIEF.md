# Project Brief — Tiến độ dự án PTPK

## 1. Business Problem

Phòng Phát triển phòng khám (PTPK) đang theo dõi tiến độ dự án bằng Excel. Dữ liệu khó dùng chung, không xác định chắc chắn ai cập nhật, không có quy trình duyệt hoàn thành và khó tổng hợp trạng thái giữa nhiều dự án.

## 2. Mục tiêu

- Số hóa dữ liệu tiến độ Excel thành dữ liệu dùng chung trên web.
- Theo dõi hạng mục, công việc, người tham gia, mốc kiểm soát và diễn biến.
- Mọi người dùng được xem toàn bộ dự án; người tham gia cập nhật công việc của mình.
- Công việc chỉ hoàn thành sau khi sếp duyệt.
- Giữ được lịch sử thay đổi và tài liệu bằng chứng.

## 3. Stakeholders và người dùng

| Nhóm/Vai trò | Nhu cầu | Quyền dự kiến |
|---|---|---|
| Sếp | Quản lý toàn bộ tiến độ, phân công và kiểm soát kết quả | Tạo/sửa dự án, import Excel, quản lý hạng mục/mốc, tài khoản, phân công, duyệt hoặc từ chối hoàn thành |
| Nhân viên | Theo dõi toàn bộ dự án và cập nhật phần việc tham gia | Xem toàn bộ dự án; cập nhật, thêm bằng chứng và gửi duyệt đối với công việc được phân công |

## 4. Current State

- Quy trình hiện tại: lập và cập nhật tiến độ theo từng dự án trong Excel.
- Dữ liệu mẫu đã khảo sát: `TIEN DO KHE TRE 25.8.xlsx`; sheet đầu có 25 hạng mục và 132 công việc.
- Prototype gốc là một file `index.html`, dùng dữ liệu hard-code và `localStorage` riêng trên từng trình duyệt.
- MVP mới đã tách giao diện theo module React và đưa dữ liệu mẫu lên Supabase; file `main/index.html` mới nhất tiếp tục là chuẩn đối chiếu giao diện và luồng nghiệp vụ.
- Điểm còn phải hoàn thiện trước vận hành chính thức: kiểm thử nghiệm thu đủ hai vai trò và chốt phương án backup định kỳ.

## 5. Desired State

Ứng dụng web có đăng nhập, dữ liệu tập trung, phân quyền hai vai trò, hỗ trợ import kế hoạch từ sheet đầu của Excel và quản lý tiến độ hằng ngày trên hệ thống.

## 6. Phạm vi MVP

### Trong phạm vi

- Đăng nhập bằng tên tài khoản và mật khẩu do sếp tạo; không có màn hình hoặc API tự đăng ký công khai.
- Danh mục 21 phòng ban/đơn vị.
- Danh mục dự án, hạng mục và công việc.
- Import có preview từ sheet đầu của Excel.
- Gán nhiều người tham gia một công việc, không chia người chính/phối hợp.
- Gantt được tính từ ngày bắt đầu/kết thúc.
- Nhật ký diễn biến và tài liệu bằng chứng.
- Gửi duyệt, duyệt và từ chối hoàn thành.
- Mốc kiểm soát được quản lý riêng trên web, không import từ Excel.
- Dashboard, lọc, báo cáo và export dữ liệu cơ bản.

### Ngoài phạm vi

- Chat/Chat AI.
- Thông báo đa kênh.
- Ứng dụng mobile native.
- Quy trình duyệt nhiều cấp.
- Tích hợp với hệ thống khác của TTH.

## 7. Yêu cầu chức năng

1. Đăng nhập/đăng xuất.
2. Sếp quản lý tài khoản: tạo người dùng và gán vai trò; tài khoản không gắn phòng ban.
3. Tạo, sửa, xóa mềm và khôi phục dự án; chỉ sếp xem được danh sách đã xóa.
4. Import sheet đầu của file tiến độ Excel, xem trước và xác nhận.
5. Quản lý hạng mục, công việc và nhiều người tham gia.
6. Xem Gantt, tổng quan và công việc cần xử lý.
7. Cập nhật diễn biến, nguyên nhân chậm và bằng chứng.
8. Nhân viên gửi hoàn thành; sếp duyệt hoặc từ chối.
9. Quản lý mốc kiểm soát theo dự án.
10. Lưu audit log và export dữ liệu.

### Quy tắc nhập liệu hạng mục/công việc

- Bấm thêm hạng mục hoặc công việc chỉ mở panel và tạo bản nháp trên trình duyệt, chưa ghi vào database.
- Chỉ thao tác **Lưu hạng mục/Lưu công việc** mới tạo dữ liệu thật.
- Đóng bằng nút `X`, lớp nền hoặc **Hủy bỏ** phải bỏ bản nháp; nếu đã nhập liệu thì cần cảnh báo trước khi bỏ.

## 8. Business Rules và ngoại lệ

- Mọi người dùng đã đăng nhập được xem toàn bộ dự án.
- Chỉ sếp được tạo tài khoản; Supabase Auth tắt self-signup và frontend không giữ `service_role` key.
- Nhân viên chỉ cập nhật công việc mình tham gia.
- Một công việc có thể có nhiều người tham gia; tất cả người tham gia có quyền cập nhật và gửi duyệt.
- Khi đã gửi duyệt, công việc tạm khóa cập nhật cho đến khi sếp duyệt hoặc từ chối.
- Chỉ sếp được thay đổi công việc thành hoàn thành.
- Từ chối duyệt đưa công việc về trạng thái đang thực hiện và bắt buộc lưu lý do.
- Mỗi vòng gửi/duyệt phải được lưu riêng để truy vết.
- Chỉ import sheet đầu của Excel; các sheet khác không thuộc luồng import.
- Chuỗi phòng ban từ Excel không tự động trở thành người tham gia.
- Phòng ban/đơn vị chỉ gắn vào hạng mục hoặc công việc, độc lập với tài khoản và danh sách người tham gia. Đơn vị chủ trì là một trường chọn riêng; đơn vị phối hợp là danh sách chọn nhiều, không nhập chuỗi phân cách bằng dấu `/`.
- Khi công việc có diễn biến hoặc vòng duyệt mới mà người dùng chưa xem, Gantt hiển thị dấu sáng tại dòng công việc và menu Nhật ký diễn biến. Trạng thái đã xem được lưu riêng theo từng tài khoản.
- Xóa dự án là xóa mềm: người dùng thường không còn xem được dự án và dữ liệu con; sếp có thể xem danh sách đã xóa và khôi phục. MVP không xóa vĩnh viễn dự án từ giao diện.

## 9. Dữ liệu và tích hợp

- Dữ liệu đầu vào: Excel tiến độ theo mẫu Khe Tre và dữ liệu cập nhật trên web.
- Dữ liệu đầu ra: danh sách dự án, Gantt, công việc trễ/chờ duyệt, mốc kiểm soát, báo cáo và Excel export.
- Tích hợp MVP: Supabase Auth, PostgreSQL và Storage.
- Lưu trữ: dữ liệu nghiệp vụ trong PostgreSQL, tệp trong private Storage, lịch sử gửi duyệt và audit log riêng.

## 10. Yêu cầu phi chức năng

- Bảo mật: không tự đăng ký, RLS ở database, tệp bằng chứng không public, không lưu secret trong Git.
- Hiệu năng: đáp ứng dữ liệu nhiều dự án ở quy mô nội bộ PTPK; bảng dài cần lọc và phân trang/ảo hóa khi cần.
- Thiết bị/trình duyệt: ưu tiên máy tính trên Chrome/Edge; responsive để xem trên điện thoại.
- Giao diện: luôn dùng chế độ sáng, không thay đổi theo theme của trình duyệt hoặc hệ điều hành.
- Triển khai: Cloudflare Pages Free và Supabase Free trong giai đoạn MVP.
- Sao lưu: cần export định kỳ vì Supabase Free không cung cấp automatic backup.

## 11. Tiêu chí thành công

- Người dùng đăng nhập và cùng xem một nguồn dữ liệu thống nhất.
- Import đúng đủ hạng mục/công việc từ sheet đầu, có báo lỗi trước khi ghi.
- Nhân viên không sửa được công việc ngoài phạm vi tham gia.
- Không thể hoàn thành công việc nếu chưa qua sếp duyệt.
- Lịch sử cập nhật, gửi duyệt và bằng chứng truy vết được theo người dùng/thời gian.

## 12. Open Questions

1. Ai chịu trách nhiệm vận hành tài khoản sếp đầu tiên và cấp/khóa tài khoản về sau?
2. `PTNL1`, `PTNL2` và `Z1` có tên đầy đủ cần hiển thị hay giữ nguyên mã?
3. Chính sách dung lượng, định dạng và thời gian lưu tài liệu bằng chứng là gì?
4. Tần suất backup/export dữ liệu trong giai đoạn MVP?
