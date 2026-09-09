-- Phòng ban là danh mục đơn vị tham gia công việc, không phải thuộc tính hồ sơ người dùng.
alter table public.profiles drop column if exists department_id;
