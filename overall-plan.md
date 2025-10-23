# People Bets - Multi-Step Implementation Plan

## Project Overview
A betting platform where users can create and participate in "Over or Under" bets using platform currency. Features include authentication, group management, bet creation/resolution, and daily currency claims.

**Tech Stack:** Vite + React, Supabase (Auth, Database, Real-time)

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Project
- Vite + React App with Typescript has already been initialized.
- Install and configure dependencies (React Router, Supabase client, UI library)
- Set up ESLint, Prettier, and Git configuration
- Create folder structure (components, pages, hooks, utils, types, contexts)

### 1.2 Supabase Configuration
- Create Supabase project
- Configure authentication providers (email/password minimum)
- Create Supabase client instance with proper configuration
- URL and anon key in /Users/mensun/Documents/projects/people-bets/.env.local

---

## Phase 2: Database Schema Design

### 2.1 Design Database Tables

**users_profile table:**
- id (uuid, references auth.users)
- username (text, unique)
- currency_balance (integer, default 1000)
- last_claim_date (timestamp)
- created_at (timestamp)

**groups table:**
- id (uuid, primary key)
- name (text)
- description (text)
- is_private (boolean, default false)
- leader_id (uuid, references users_profile)
- created_at (timestamp)

**group_members table:**
- id (uuid, primary key)
- group_id (uuid, references groups)
- user_id (uuid, references users_profile)
- joined_at (timestamp)
- UNIQUE constraint on (group_id, user_id)

**bets table:**
- id (uuid, primary key)
- title (text)
- description (text)
- bet_type (text, default 'over_or_under')
- target_number (numeric)
- creator_id (uuid, references users_profile)
- group_id (uuid, references groups)
- betting_window_end (timestamp)
- status (text: 'open', 'closed', 'resolved')
- winning_side (text: 'over', 'under', null)
- resolved_at (timestamp)
- created_at (timestamp)

**user_bets table:**
- id (uuid, primary key)
- bet_id (uuid, references bets)
- user_id (uuid, references users_profile)
- side (text: 'over', 'under')
- amount (integer)
- created_at (timestamp)
- UNIQUE constraint on (bet_id, user_id)

### 2.2 Create Database Schema
- Execute SQL to create all tables
- Set up Row Level Security (RLS) policies for each table
- Create indexes for performance optimization
- Set up database triggers (e.g., auto-create user profile on signup)

### 2.3 Create Database Functions
- Function to process bet resolution and distribute winnings
- Function to validate daily claim eligibility
- Function to calculate bet statistics and odds

---

## Phase 3: Authentication System

### 3.1 Auth Context & Provider
- Create AuthContext with user state management
- Implement useAuth hook for accessing auth state
- Handle authentication state changes (onAuthStateChange)
- Implement session persistence

### 3.2 Authentication Pages
- Create Login page with email/password form
- Create Sign Up page with email/password and username
- Implement form validation for both pages
- Add error handling and loading states
- Implement redirect logic after successful auth

### 3.3 Protected Routes
- Create ProtectedRoute component
- Redirect unauthenticated users to login
- Implement route guarding throughout the app

---

## Phase 4: Core Layout & Navigation

### 4.1 App Layout
- Create main layout component with navigation
- Implement responsive sidebar/navbar
- Add user profile display in header
- Show currency balance in header
- Add logout functionality

### 4.2 Navigation Structure
- Home/Dashboard page
- My Bets page
- Groups page
- Profile page
- Create Bet page (modal or separate page)

---

## Phase 5: Daily Currency Claim Feature

### 5.1 Claim Button Component
- Create prominent "Claim Daily Currency" button/card
- Check last_claim_date to determine eligibility
- Show countdown timer until next claim available
- Disable button if already claimed today

### 5.2 Claim Functionality
- Implement API call to claim currency
- Update user's currency balance (+500 or configurable amount)
- Update last_claim_date to current timestamp
- Show success notification with animation
- Handle edge cases (timezone considerations)

---

## Phase 6: Groups System

### 6.1 Global Group Setup
- Create default "global" group on database setup
- Ensure all users are automatically members of global group
- Display global group prominently in UI

### 6.2 Private Groups - Creation
- Create "Create Group" form (name, description, private toggle)
- Implement group creation API call
- Auto-assign creator as group leader
- Auto-add creator to group_members

### 6.3 Private Groups - Discovery & Joining
- Create groups list/grid view
- Implement join group mechanism (join code or invite link)
- Add search/filter functionality for groups
- Show member count and group metadata

### 6.4 Group Management
- Group detail page showing members and bets
- Display group leader badge/indicator
- Implement leave group functionality (non-leaders only)
- Show group-specific bet feed

---

## Phase 7: Bet Creation System

### 7.1 Create Bet UI
- Create bet creation form/modal
- Implement bet type selector with "Over or Under" active
- Add placeholder buttons for future bet types (grayed out, "Coming Soon" label)
- Style to clearly show which options are available vs coming soon

### 7.2 Over or Under Bet Form
- Title input field (required)
- Description textarea (required)
- Target number input (required, numeric validation)
- Betting window end datetime picker (required, must be future)
- Group selector dropdown (show only groups where user is leader, plus global)
- Form validation for all required fields

### 7.3 Bet Creation Logic
- Validate user is group leader (if private group selected)
- Create bet record in database
- Set initial status as 'open'
- Redirect to bet detail page or show success message
- Handle errors gracefully

---

## Phase 8: Bet Display & Feed

### 8.1 Bet List/Feed Component
- Display bets in card/list format
- Show bet title, description, target number, creator
- Display time remaining until betting window closes
- Show current status (open/closed/resolved)
- Filter bets by status and group

### 8.2 Bet Card Information
- Bet type indicator ("Over or Under")
- Target number prominently displayed
- Betting window countdown
- Total amount bet on each side
- Number of participants
- Creator name and avatar

### 8.3 Filtering & Sorting
- Filter by: All, Active, Closed, Resolved
- Filter by group
- Sort by: Newest, Ending Soon, Most Popular

---

## Phase 9: Placing Bets

### 9.1 Bet Detail Page
- Show full bet information
- Display betting interface (if betting window open)
- Show current odds and total amounts per side
- Display list of participants (optional: can be anonymous)

### 9.2 Place Bet Interface
- Side selector (Over vs Under buttons)
- Amount input field with validation
- Show user's current balance
- Prevent betting more than balance
- Confirm bet button

### 9.3 Place Bet Logic
- Validate betting window is still open
- Validate user hasn't already bet on this bet
- Validate user has sufficient balance
- Deduct amount from user balance
- Create user_bets record
- Show confirmation message
- Update UI to reflect bet placement

---

## Phase 10: Bet Resolution System

### 10.1 Bet Resolution UI (Creator Only)
- Show "Resolve Bet" button on bet detail page
- Only visible to bet creator
- Only available after betting window has closed
- Display modal/form to select winning side

### 10.2 Resolution Logic
- Validate user is bet creator
- Validate betting window has ended
- Validate bet hasn't already been resolved
- Select winning side (Over or Under)
- Calculate winnings distribution

### 10.3 Winnings Distribution
- Calculate total pot (sum of all bets)
- Calculate winning side total
- Distribute winnings proportionally to winners
- Update all winner balances
- Update bet status to 'resolved'
- Record winning_side and resolved_at
- Notify participants (optional: notifications system)

### 10.4 Display Resolution Results
- Show winning side clearly
- Display winners list with winnings
- Show losers list (or hide for privacy)
- Update bet status throughout UI

---

## Phase 11: User Profile & My Bets

### 11.1 Profile Page
- Display user information (username, member since)
- Show current currency balance
- Display betting statistics (total bets, wins, losses, win rate)
- Show betting history

### 11.2 My Bets Page
- Tab view: Active Bets, Created Bets, Past Bets
- Show bets user has participated in
- Display potential winnings for active bets
- Show resolved bets with outcomes

---

## Phase 12: Real-time Updates (Optional but Recommended)

### 12.1 Supabase Real-time Subscriptions
- Subscribe to bets table changes
- Subscribe to user balance changes
- Subscribe to group_members changes

### 12.2 UI Updates
- Auto-update bet feed when new bets are created
- Update countdown timers in real-time
- Show live updates when bets are placed
- Update balance display when currency changes

---

## Phase 13: UI/UX Polish

### 13.1 Styling & Theming
- Implement consistent design system
- Add animations and transitions
- Create loading skeletons
- Design empty states

### 13.2 Responsive Design
- Ensure mobile responsiveness
- Test on various screen sizes
- Optimize touch interactions

### 13.3 Error Handling
- Implement global error boundary
- Add user-friendly error messages
- Create fallback UI for errors

### 13.4 Loading States
- Add loading indicators for async operations
- Implement optimistic UI updates
- Show progress for long operations

---


## Future Enhancements (Post-Launch)

- Additional bet types (Multiple Choice, Yes/No, etc.)
- Leaderboards and rankings
- Bet commenting and discussion
- Push notifications for bet updates
- Social features (follow users, share bets)
- Advanced betting options (multipliers, insurance)
- Bet templates for common scenarios
- Mobile app (React Native)
- Email notifications
- Admin dashboard
- Betting limits and responsible gambling features

---