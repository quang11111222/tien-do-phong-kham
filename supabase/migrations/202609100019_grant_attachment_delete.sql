-- RLS quyết định người nào được xóa và trạng thái nào được xóa; quyền bảng là
-- điều kiện bắt buộc để câu lệnh DELETE có thể đi tới bước kiểm tra policy.
grant delete on public.attachments to authenticated;
