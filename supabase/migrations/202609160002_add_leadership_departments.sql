begin;

insert into public.departments (code, name, sort_order)
values
  ('THUKY', 'Thư ký', 22),
  ('BTGD', 'Ban Tổng giám đốc', 23),
  ('BGD', 'Ban giám đốc', 24)
on conflict (code) do nothing;

do $$
begin
  if (
    select count(*)
    from public.departments
    where (code = 'THUKY' and name = 'Thư ký' and active)
       or (code = 'BTGD' and name = 'Ban Tổng giám đốc' and active)
       or (code = 'BGD' and name = 'Ban giám đốc' and active)
  ) <> 3 then
    raise exception 'Danh mục ba phòng/ban mới đã tồn tại nhưng khác tên hoặc không hoạt động';
  end if;
end;
$$;

commit;
