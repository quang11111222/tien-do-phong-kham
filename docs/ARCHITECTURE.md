# Kiến trúc V2 — Tiến độ dự án PTPK

## Mục tiêu

Chuyển prototype một file HTML thành ứng dụng web có đăng nhập, phân quyền, dữ liệu dùng chung và lịch sử duyệt. Kiến trúc ưu tiên đơn giản, miễn phí trong giai đoạn MVP và có thể nâng cấp mà không viết lại nghiệp vụ.

## Kiến trúc tổng thể

```text
React + TypeScript + Vite
        |
        | Supabase client với JWT
        v
Supabase Auth + PostgreSQL + Storage + Edge Functions
        |
        v
RLS, database functions và audit log
```

Ứng dụng là modular monolith. Không sử dụng microservice trong MVP.

## Ranh giới bảo mật

- Frontend chỉ chứa Supabase URL và publishable/anon key.
- Không đưa service-role key hoặc mật khẩu vào source code.
- Giao diện ẩn nút theo vai trò chỉ để cải thiện trải nghiệm; RLS và database functions mới là lớp phân quyền bắt buộc.
- Mọi người dùng đã đăng nhập được xem toàn bộ dự án.
- Nhân viên chỉ cập nhật công việc mình tham gia.
- Sếp quản lý dự án, phân công và duyệt hoàn thành.
- Self-signup bị tắt. Sếp tạo tài khoản qua Edge Function; hàm xác thực JWT và kiểm tra profile `manager` trước khi dùng Admin API.

## Module

- `auth`: đăng nhập, phiên làm việc, hồ sơ và vai trò.
- `users`: sếp tạo tài khoản, gán phòng ban và vai trò.
- `projects`: danh mục và thông tin dự án.
- `work-items`: hạng mục, công việc, Gantt và người tham gia.
- `completion-requests`: gửi duyệt, duyệt và từ chối.
- `milestones`: mốc kiểm soát độc lập với Excel.
- `progress-updates`: nhật ký diễn biến.
- `attachments`: bằng chứng trên private Storage bucket.
- `imports`: đọc sheet đầu của file Excel, preview, validation và xác nhận trước khi ghi.

## Luồng duyệt

```text
not_started -> in_progress -> pending_approval -> completed
                                  |
                                  +-> rejected -> in_progress
```

Mỗi lần gửi duyệt là một `completion_request` riêng để lưu được nhiều vòng gửi lại.

## Import Excel

- Chỉ đọc sheet đầu của workbook.
- Dòng số La Mã là hạng mục cha; dòng số thường là công việc con.
- Nhập tên, chuỗi đơn vị nguồn, ngày bắt đầu và ngày kết thúc.
- Không nhập các ô đánh dấu Gantt theo ngày; giao diện tự tính từ khoảng ngày.
- Không tự gán người tham gia từ chuỗi phòng ban cũ.
- Chuỗi `Chủ trì / phối hợp` được giữ trong `source_responsibility_text` để truy vết.
- Sau preview, sếp xác nhận rồi mới ghi dữ liệu.

## Triển khai MVP

- Frontend: Cloudflare Pages Free.
- Backend: Supabase Free.
- Free Plan không có automatic backup; MVP phải có quy trình export dữ liệu định kỳ trước khi đưa vào vận hành chính thức.
