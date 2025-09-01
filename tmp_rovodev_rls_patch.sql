-- 纯 API 模式补丁：移除对 profiles 的公开读取策略，防止匿名用户读取用户资料
BEGIN;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
COMMIT;
