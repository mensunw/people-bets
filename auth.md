# Authentication Flow

## Overview
People Bets uses Supabase Auth with email confirmation enabled.

## Signup Flow
1. User submits email, password, and username via `SignUp.tsx`
2. Supabase sends confirmation email (email confirmation is ENABLED)
3. User sees "Check Your Email" screen and must click confirmation link
4. After confirmation, Supabase trigger `on_auth_user_created` automatically creates user profile in `users_profile` table with 1000 starting currency
5. User can then login via `Login.tsx`

## Key Components
- **AuthContext** (`src/contexts/AuthContext.tsx`): Manages auth state, provides `signUp`, `signIn`, `signOut` methods, loads user profile
- **ProtectedRoute** (`src/components/ProtectedRoute.tsx`): Guards routes, redirects unauthenticated users to `/login`
- **Database Trigger**: `create_user_profile()` function in SQL migration creates profile on auth signup

## Important Notes
- Email confirmation is REQUIRED (not optional) - users cannot login until they confirm
- Username is stored in Supabase `user_metadata` during signup and copied to `users_profile` table by trigger
- User profile includes: id, username, currency_balance (default 1000), last_claim_date, created_at
