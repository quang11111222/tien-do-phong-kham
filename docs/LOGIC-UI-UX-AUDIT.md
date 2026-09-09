# Rà soát Logic nghiệp vụ, UI và UX

Ngày rà soát: 2026-09-09
Nguồn đối chiếu: `index.html` tại `origin/main`, ứng dụng React hiện tại và schema/RLS Supabase.

## Kết quả đã xử lý

| Khu vực | Phát hiện | Xử lý |
|---|---|---|
| Danh mục dự án | “Lưu trữ” khó hiểu theo cách gọi người dùng; chưa có nơi khôi phục | Đổi thành **Xóa** theo cơ chế xóa mềm; thêm hai tab **Đang theo dõi / Đã xóa** và nút **Khôi phục** |
| Quyền xem dự án đã xóa | Nếu chỉ ẩn ở frontend thì nhân viên vẫn có thể đọc qua API | Bổ sung RLS để nhân viên không đọc dự án đã xóa và dữ liệu nghiệp vụ con; sếp vẫn đọc để khôi phục |
| Thống kê dự án | Có thể tính cả node cha và sai lệch số ngày do giờ hiện tại | Chỉ tính công việc lá; chuẩn hóa “Hôm nay” và số ngày theo đầu ngày |
| Sửa dự án | Chưa kiểm tra ngày kết thúc trước ngày bắt đầu ở UI | Chặn lưu, báo lỗi rõ ràng và đặt ngày bắt đầu làm giới hạn tối thiểu |
| Sửa công việc | Cập nhật công việc và người tham gia bằng nhiều lệnh rời có thể làm mất phân công nếu lỗi giữa chừng | Gom thành một RPC transaction, giữ kiểm tra version chống ghi đè |
| Nhật ký diễn biến | Query dùng nhầm `manager_note` thay vì cột thật `review_note` | Sửa đúng trường nhận xét của vòng duyệt |
| Chờ duyệt | Lúc tải có thể nháy trạng thái rỗng; có thể bấm xử lý lặp | Thêm loading và khóa các nút của yêu cầu đang xử lý |
| Bản nháp chưa lưu | Có thể rời panel công việc hoặc bảng mốc bằng menu và mất bản nháp mà không cảnh báo | Cảnh báo khi đổi menu/quay về danh mục và khi đóng hoặc tải lại tab trình duyệt |
| Header | Ô tìm nhanh và phím `Ctrl+K` mới chỉ là giao diện, bấm không hoạt động | Tạm bỏ khỏi MVP để không tạo affordance giả; chỉ đưa lại khi có chức năng tìm thật |
| Xác nhận thao tác | Hộp thoại mặc định của trình duyệt thô và không thống nhất giao diện | Thay bằng popup dùng chung theo theme TTH, có tiêu đề, mô tả hậu quả, màu hành động và hỗ trợ phím Escape |

## Luồng nghiệp vụ đã đối chiếu

1. Danh mục dự án → mở dự án vào Gantt; dự án chưa có kế hoạch hiển thị màn hình rỗng với các cách khởi tạo.
2. Thêm hạng mục/công việc mở panel bên phải; chỉ nút Lưu mới ghi database; X, lớp nền và Hủy bỏ bỏ bản nháp sau cảnh báo.
3. Công việc hỗ trợ nhiều cấp con; người tham gia không chia chính/phối hợp.
4. Nhân viên tham gia cập nhật diễn biến, quản lý đúng một tệp bằng chứng và gửi hoàn thành.
5. Sếp duyệt hoặc từ chối; từ chối bắt buộc nhập lý do; hoàn thành chỉ hình thành qua vòng duyệt.
6. Mốc kiểm soát chỉnh theo bản nháp và chỉ ghi khi bấm Lưu thay đổi.

## Khoảng trống còn lại trước nghiệm thu vận hành

| Ưu tiên | Khoảng trống | Đề xuất nghiệm thu |
|---|---|---|
| Cao | Chưa kiểm thử đầy đủ bằng hai tài khoản sếp/nhân viên trên dữ liệu thật | Chạy kịch bản phân quyền, gửi duyệt, từ chối, gửi lại và duyệt |
| Cao | Chưa chốt backup/export định kỳ cho Supabase Free | Chọn người phụ trách và lịch export |
| Trung bình | Từ Tổng quan/Nhật ký bấm công việc mới chỉ mở Gantt, chưa tự mở đúng panel công việc | Thêm deep-link theo `work_item_id` sau khi luồng chính ổn định |
| Trung bình | Sửa thông tin dự án chỉ có ở Danh mục dự án, chưa có nút trên header từng dự án | Xác nhận có cần thao tác nhanh trong mọi màn hình dự án |
| Trung bình | Prototype có nhân bản kế hoạch và import; cần test dữ liệu lớn, ngày dịch chuyển và rollback lỗi | Chạy bộ test bằng file Khe Tre và một dự án rỗng |

## Tiêu chí QA cho xóa mềm dự án

- Sếp bấm **Xóa** phải thấy cảnh báo nêu rõ dữ liệu được giữ và có thể khôi phục.
- Sau khi xác nhận, dự án biến mất khỏi **Đang theo dõi** và xuất hiện trong **Đã xóa**.
- Nhân viên không nhìn thấy dự án đã xóa và không đọc được dữ liệu con qua API.
- Sếp bấm **Khôi phục** thì dự án cùng toàn bộ tiến độ, mốc, nhật ký và bằng chứng xuất hiện lại.
- Không có nút xóa vĩnh viễn trong MVP.
