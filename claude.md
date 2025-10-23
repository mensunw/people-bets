# People Bets - Implementation Documentation

## Project Overview
A betting platform where users can create and participate in "Over or Under" bets using platform currency. Features authentication, group management, bet creation/resolution, and daily currency claims.

**Tech Stack:** Vite + React + TypeScript, Supabase (Auth, Database, Real-time)

---

## File Structure

### Root Configuration
- `.prettierrc` - Code formatting configuration
- `plan.md` - Multi-phase implementation plan

### Database
- `supabase/migrations/20250101000000_initial_schema.sql` - Complete database schema with tables, RLS policies, triggers, and functions for bet resolution and currency management

### Core Application Files

#### `src/main.tsx`
- Application entry point with React and router setup

#### `src/App.tsx`
- Main routing configuration with protected and public routes

#### `src/types/index.ts`
- TypeScript interfaces for UserProfile, Group, Bet, UserBet, and related types

---

## Library & Configuration

#### `src/lib/supabase.ts`
- Supabase client initialization with environment variables

---

## Contexts

#### `src/contexts/AuthContext.tsx`
- Authentication state management with sign in/up/out methods and user profile loading

---

## Hooks

#### `src/hooks/useBets.ts`
- Fetches bets from user's groups with enriched data (creator, group, statistics)

#### `src/hooks/useGroups.ts`
- Manages group data with membership and leadership status

#### `src/hooks/useUserStats.ts`
- Calculates user betting statistics (wins, losses, win rate)

#### `src/hooks/useCountdown.ts`
- Real-time countdown timer for bet windows

#### `src/hooks/useDailyClaim.ts`
- Manages daily currency claim eligibility and countdown

---

## Pages

#### `src/pages/Login.tsx`
- User login form with email/password authentication

#### `src/pages/SignUp.tsx`
- User registration with username, email, and password

#### `src/pages/Home.tsx`
- Main dashboard with daily claim feature, create bet button, and bet feed

#### `src/pages/Groups.tsx`
- Group listing with create group modal, search, and filter functionality

#### `src/pages/GroupDetail.tsx`
- Individual group view with member list and group-specific bets

#### `src/pages/BetDetail.tsx`
- Detailed bet view with place bet interface, participants list, and resolve button for creators

#### `src/pages/MyBets.tsx`
- Three tabs: Active Bets (with potential winnings), Created Bets, and Past Bets with outcomes

#### `src/pages/Profile.tsx`
- User profile with statistics and recent betting history

---

## Components

### Layout & Navigation
#### `src/components/Layout.tsx`
- Main app layout with sidebar navigation and header with currency display

#### `src/components/ProtectedRoute.tsx`
- Route wrapper that requires authentication

### Groups
#### `src/components/CreateGroupModal.tsx`
- Modal form for creating new groups with privacy settings

#### `src/components/GroupCard.tsx`
- Individual group display with join/leave functionality and member count

### Bets
#### `src/components/CreateBetModal.tsx`
- Modal form for creating bets with type selector (Over or Under active, others coming soon)

#### `src/components/BetCard.tsx`
- Standard bet card with countdown, odds display, and status badges

#### `src/components/ActiveBetCard.tsx`
- Enhanced bet card for active bets showing potential winnings and profit calculations

#### `src/components/BetsFeed.tsx`
- Bet list with filtering (status, group) and sorting (newest, ending soon, most popular)

#### `src/components/ResolveBetModal.tsx`
- Modal for bet creators to resolve bets by entering actual result and selecting winner

### Currency
#### `src/components/DailyClaim.tsx`
- Daily currency claim card with countdown timer and claim button

---

## Styles

#### `src/styles/auth.css`
- Login and signup page styling

#### `src/styles/layout.css`
- Sidebar, header, and main layout styling

#### `src/styles/pages.css`
- Page containers, profile cards, stats, tabs, and history list styling

#### `src/styles/daily-claim.css`
- Gradient claim card with animations and countdown styling

#### `src/styles/groups.css`
- Group cards, search bar, and group detail page styling

#### `src/styles/modal.css`
- Reusable modal overlay and content styling

#### `src/styles/create-bet.css`
- Bet type selector and create bet form styling

#### `src/styles/bets.css`
- Bet cards, feed, filters, and odds display styling

#### `src/styles/bet-detail.css`
- Two-column bet detail layout and place bet interface styling

#### `src/styles/resolve-bet.css`
- Resolve bet modal with winner selection styling

#### `src/styles/active-bet-card.css`
- Enhanced active bet card with potential winnings display styling

---

## Key Features Implemented

### Phase 1-2: Foundation
- Project setup with Vite, React, TypeScript
- Supabase integration with complete database schema
- RLS policies for security
- Triggers for auto-profile creation, bet expiration, currency deduction
- Functions for claim_daily_currency, resolve_bet, get_bet_stats

### Phase 3-4: Authentication & Navigation
- Full authentication system with protected routes
- Responsive sidebar navigation with currency display
- User session management

### Phase 5: Daily Currency
- 24-hour claim system with countdown
- Visual feedback and success notifications

### Phase 6: Groups
- Global group with auto-enrollment
- Private and public group creation
- Member management with leader roles
- Join/leave functionality

### Phase 7-8: Bet Creation & Display
- "Over or Under" bet type (others marked as "Coming Soon")
- Leader-only bet creation in their groups
- Real-time countdown timers
- Odds visualization with progress bars
- Filtering and sorting

### Phase 9: Placing Bets
- Over/Under side selection
- Balance validation and duplicate prevention
- Participants list with color-coded badges

### Phase 10: Bet Resolution
- Creator-only resolution after window closes
- Actual result input with auto-winner determination
- Proportional winnings distribution
- Winning side banner display

### Phase 11: Profile & My Bets
- Real user statistics (wins, losses, win rate)
- Recent betting history with outcomes
- Active bets with potential winnings calculations
- Created bets overview
- Past bets with won/lost status
- Profit and return multiplier display

---

## Database Functions

**claim_daily_currency()** - Awards 1000 currency once per 24 hours per user

**resolve_bet(p_bet_id, p_winning_side)** - Resolves bet and distributes winnings proportionally to winners

**get_bet_stats(p_bet_id)** - Returns total amounts wagered on each side and participant count

---

## Security

- Row Level Security (RLS) policies on all tables
- Users can only see bets in their groups
- Only group leaders can create bets
- Only bet creators can resolve bets
- Currency deduction handled server-side via triggers

---

## Responsive Design

- Mobile-first approach
- Sidebar collapses to icons on small screens
- Cards and grids adapt to screen size
- Touch-friendly button sizes
