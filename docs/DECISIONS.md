# Decision Log

Ghi các quyết định ảnh hưởng đến phạm vi, dữ liệu, kiến trúc hoặc vận hành.

| Ngày | Quyết định | Lý do | Ảnh hưởng |
|---|---|---|---|
| 2026-09-08 | Tạo repository độc lập ngoài workspace OpenClaw | Tách source code, Git và dependency khỏi dữ liệu vận hành của trợ lý | Giảm nguy cơ commit nhầm và làm nhiễu context |
| 2026-09-09 | Dùng modular monolith React + TypeScript + Vite | Đủ rõ ràng để bảo trì nhưng không tạo thêm độ phức tạp của microservice | Prototype cũ được giữ trong `prototype/`; V2 có source và build riêng |
| 2026-09-09 | Dùng Supabase Auth, PostgreSQL và Storage cho MVP | Có gói miễn phí, cung cấp backend cần thiết và hỗ trợ RLS | Cần cấu hình dự án Supabase và có phương án export vì Free Plan không có automatic backup |
| 2026-09-09 | Hai vai trò nghiệp vụ: sếp và nhân viên | Phù hợp quy trình hiện tại | Sếp quản lý/duyệt; nhân viên xem tất cả nhưng chỉ cập nhật việc mình tham gia |
| 2026-09-09 | Công việc có nhiều người tham gia, không chia chính/phối hợp | Sếp chỉ cần chọn những người cùng tham gia | Dùng bảng liên kết `work_item_participants`; phòng ban lấy từ hồ sơ người dùng |
| 2026-09-09 | Chỉ import sheet đầu của Excel | Sheet đầu là tiến độ cần số hóa; các sheet khác là phụ/đối chiếu | Import phải preview, giữ chuỗi đơn vị nguồn và không nhập mốc kiểm soát |
| 2026-09-09 | Mốc kiểm soát quản lý độc lập trên web | Prototype đã có màn hình riêng và dữ liệu mốc không lấy từ Excel | Dùng bảng `milestones` theo dự án |
| 2026-09-09 | Danh mục chuẩn gồm 21 phòng ban/đơn vị | Chuẩn hóa cách ghi tắt không nhất quán trong Excel | Có bảng alias cho NVY, MKT, BQLDA, P.Kỹ thuật, TBTN, TBYT và các biến thể |
| 2026-09-09 | Tắt self-signup; sếp tạo tài khoản qua Edge Function | Sếp đồng thời là admin nghiệp vụ, người dùng không tự đăng ký | Edge Function kiểm tra role `manager`; `service_role` chỉ nằm trong Supabase backend |
| 2026-09-09 | Người dùng đăng nhập bằng username + password, không nhập email | Giảm thao tác cho hệ thống nội bộ | Frontend ánh xạ username sang email kỹ thuật ẩn `@ptpk.local`; profile lưu username duy nhất |
| 2026-09-09 | Dùng `main/index.html` mới nhất làm chuẩn giao diện và logic nghiệp vụ | Đây là prototype đã được duyệt và còn thay đổi sau bản local trong `prototype/` | V2 truy ngược từng luồng từ source gốc rồi tách thành module React/service/database; không dựng lại từ ảnh chụp |
| 2026-09-09 | Menu dự án hiển thị theo ngữ cảnh sau khi mở dự án | Phản ánh đúng mô hình điều hướng trong source gốc | Danh mục dự án đứng đầu; Tổng quan, Gantt, Mốc và Nhật ký nằm dưới tên dự án; Chờ duyệt và Người dùng nằm trong nhóm Quản trị |
| 2026-09-09 | Luôn dùng giao diện sáng | Phù hợp yêu cầu sử dụng tại đơn vị | Ứng dụng ép `data-theme=light`, không phụ thuộc dark mode của hệ điều hành |
| 2026-09-09 | Chuyển dữ liệu prototype lên Supabase làm dữ liệu khởi tạo | Tránh màn hình rỗng và bỏ phụ thuộc `localStorage` | Khởi tạo 5 dự án; Khe Tre có 25 hạng mục, 132 công việc và 14 mốc kiểm soát |
| 2026-09-09 | Theme chính trắng–xanh theo nhận diện TTH GROUP | Đồng bộ logo và giảm cảm giác cảnh báo do dùng đỏ làm màu điều hướng | Xanh là màu thương hiệu; đỏ chỉ dùng cho quá hạn, lỗi hoặc hành động nguy hiểm |
| 2026-09-09 | Thêm hạng mục/công việc theo cơ chế bản nháp trong panel | Khớp prototype gốc và tránh tạo dòng rác khi người dùng đóng form | Chỉ nút Lưu gọi RPC tạo dữ liệu; X, lớp nền và Hủy bỏ không ghi database |
| 2026-09-09 | Nút “Xóa” dự án dùng cơ chế xóa mềm, không xóa vĩnh viễn | Giữ lịch sử tiến độ, duyệt, nhật ký và bằng chứng để đối chiếu; vẫn dùng từ ngữ người dùng dễ hiểu | Dự án bị ẩn khỏi nhân viên; sếp có tab “Đã xóa” để khôi phục; database lưu người và thời điểm xóa |
| 2026-09-09 | Dùng popup xác nhận nội bộ thay cho hộp thoại mặc định của trình duyệt | Đồng bộ trải nghiệm và nhận diện TTH, diễn giải rõ hậu quả của từng thao tác | Mọi thao tác bỏ bản nháp, xóa, khôi phục và thay dữ liệu Excel dùng một component xác nhận chung; không dùng `window.confirm` |
