# People Bets - Multi-Step Implementation Plan

## Project Overview
A betting platform where users can create and participate in "Over or Under" bets using platform currency. Features include authentication, group management, bet creation/resolution, and daily currency claims.

**Tech Stack:** Vite + React, Supabase (Auth, Database, Real-time)

## Phase 1: Project Setup & Infrastructure (complete)

## Phase 2: Database Schema Design (complete)

## Phase 3: Authentication System (complete)

## Phase 4: Core Layout & Navigation (complete)

## Phase 5: Daily Currency Claim Feature (complete)

## Phase 6: Groups System (complete)

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