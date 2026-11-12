-- Đăng nhập bằng Zalo (server/auth/zalo-oauth.ts): Zalo không cung cấp email, nên tài khoản
-- được tạo với một địa chỉ nội bộ `zalo_<id>@zalo.<host>` và được đánh dấu bằng
-- raw_app_meta_data.external_provider. Phần trước @ của địa chỉ đó không phải là tên người
-- dùng, nên không được dùng làm profiles.display_name: rơi về 'Người dùng' thay vì 'zalo_123…'.
-- Khớp với displayNameFromMetadata() + toPublicUser() trong server/auth/supabase-auth-service.ts.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  candidate text;
begin
  candidate := left(btrim(coalesce(
    case when char_length(btrim(new.raw_user_meta_data ->> 'display_name')) >= 2 then new.raw_user_meta_data ->> 'display_name' end,
    case when char_length(btrim(new.raw_user_meta_data ->> 'full_name')) >= 2 then new.raw_user_meta_data ->> 'full_name' end,
    case when char_length(btrim(new.raw_user_meta_data ->> 'name')) >= 2 then new.raw_user_meta_data ->> 'name' end,
    -- Chỉ tài khoản có email thật mới lấy tên từ email.
    case when new.raw_app_meta_data ->> 'external_provider' is null then split_part(coalesce(new.email, ''), '@', 1) end
  )), 50);
  if char_length(candidate) < 2 then
    candidate := 'Người dùng';
  end if;

  insert into public.profiles (id, email, display_name, created_at)
  values (new.id, coalesce(new.email, ''), candidate, new.created_at)
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name;
  return new;
end;
$$;
