# Summary

- Merge strategy: prefer local (ours). Clean and ignore artifacts (.env, .next)
- Auth: Admin login via .env ADMIN_NAME/ADMIN_KEY, bound to ADMIN_AUTH. High-reliability bootstrap (insert/update) on first login
- Register: Support invitation via ADMIN_AUTH fallback when DB invite code not found (auto-ensure admin profile as inviter)
- Types: Unify CommissionLog to avoid duplicate/contradictory definitions
- Conflicts: Resolved across api/auth routes, types, and contexts; removed ignored files from VCS

## Details

### Admin login (/api/auth/login)
- If SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY present: ensure admin profile exists (is_admin=true, not frozen, invitation_code=ADMIN_AUTH). Insert if missing; otherwise update flags and last_login_at
- If Supabase not configured (dev fallback): allow local admin login returning an in-memory admin user
- Issue session cookie using signSession, getDefaultCookieOptions, sessionCookieName

### Register (/api/auth/register)
- Validate invitation from DB first; if not found and matches ADMIN_AUTH, ensure/create admin inviter
- Create user with password_hash, call create_initial_balances, set cookie

### Types
- Unified CommissionLog for referral/generic tracking, removed duplicates

## Security and hygiene
- .env and .next are removed from Git; .gitignore protects future commits
- No secrets in repo; .env.example contains placeholders and notes

## Testing notes
- Set .env:
  - ADMIN_NAME=<your_admin_username>
  - ADMIN_KEY=<your_admin_password>
  - ADMIN_AUTH=<your_invite_code>
  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- Login with admin credentials; first login should bootstrap admin profile
- Register with invitationCode = ADMIN_AUTH should succeed and set inviter_id to admin

## Follow-ups (suggested)
- Rate-limit and brute-force protection for /api/auth/login
- Structured audit logs for auth events
- Consistent error mapping and observability (trace IDs, structured logs)
