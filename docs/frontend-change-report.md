# Frontend Change Report

## Summary
Updated the Offside AI frontend from a single dashboard prototype into a clearer multi-page app with authentication screens, user-scoped favorite teams, a cleaner home dashboard, and a livelier header.

## Changes Made
- Added `/login` and `/signup` pages.
- Added shared local authentication helpers in `frontend/lib/auth.ts`.
- Favorite teams are now saved per user using `followed_teams:<user email>`.
- Guest users still have a fallback favorite-team key.
- Removed the chatbot/RAG assistant from the home dashboard so it can be rebuilt as a separate page later.
- Kept the schedule panel on home with `All Matches` and `Favorite Teams` filters.
- Added search to the `Follow Your Teams` panel.
- Redesigned the header with a brighter accent bar, pill navigation, login/signup actions, and logged-in user display.
- Kept the live-match loading animation in a full 16:9 media box so the uploaded MP4 displays properly.

## New Files
- `frontend/app/login/page.tsx`
- `frontend/app/signup/page.tsx`
- `frontend/components/AuthForm.tsx`
- `frontend/components/AuthForm.css`
- `frontend/lib/auth.ts`

## Updated Files
- `frontend/app/page.tsx`
- `frontend/components/Header.tsx`
- `frontend/components/Header.css`
- `frontend/components/FollowTeam.tsx`
- `frontend/components/FollowTeam.css`
- `frontend/components/ScheduleRAG.tsx`
- `frontend/components/ScheduleRAG.css`
- `frontend/components/LiveScore.tsx`
- `frontend/components/LiveScore.css`

## Notes
- Authentication is currently local-browser storage for demo purposes. A production version should move users, sessions, and favorites to the backend database.
- Passwords are stored locally only for the current prototype and should be replaced with a real auth provider before deployment.
