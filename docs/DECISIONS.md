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
