create or replace function public.protect_profile_account_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.username = 'admin' and new is distinct from old then
    raise exception 'Tài khoản admin gốc được bảo vệ và không thể chỉnh sửa';
  end if;

  if new.username <> old.username then
    raise exception 'Không được thay đổi tên tài khoản';
  end if;

  if auth.uid() = old.id and (new.role <> old.role or new.active <> old.active) then
    raise exception 'Không được tự thay đổi vai trò hoặc trạng thái tài khoản';
  end if;

  return new;
end;
$$;
