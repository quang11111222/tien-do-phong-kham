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
| 2026-09-09 | Dùng `prototype/index.html` làm chuẩn giao diện và logic nghiệp vụ | Prototype đã được duyệt; không cần thiết kế lại trải nghiệm | V2 tái sử dụng bố cục, màu sắc, Gantt, drawer và các luồng chính rồi tách thành module React/service/database |
| 2026-09-09 | Menu trái chỉ giữ 5 chức năng đang dùng | Loại bỏ các mục điều hướng không có nghiệp vụ trong phạm vi hiện tại | Giữ Danh mục dự án, Tiến độ & Gantt, Mốc kiểm soát, Chờ duyệt và Quản lý người dùng |
| 2026-09-09 | Luôn dùng giao diện sáng | Phù hợp yêu cầu sử dụng tại đơn vị | Ứng dụng ép `data-theme=light`, không phụ thuộc dark mode của hệ điều hành |
| 2026-09-09 | Chuyển dữ liệu prototype lên Supabase làm dữ liệu khởi tạo | Tránh màn hình rỗng và bỏ phụ thuộc `localStorage` | Khởi tạo 5 dự án; Khe Tre có 25 hạng mục, 132 công việc và 14 mốc kiểm soát |
