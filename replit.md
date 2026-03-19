# Sarasota Tech Community Platform

## Overview

This is a full-stack web application built for the Sarasota Tech community, designed to connect tech professionals, showcase companies, manage events, and facilitate community engagement. The platform combines a React-based frontend with an Express.js backend, using PostgreSQL for data persistence and various third-party integrations for enhanced functionality.

## Recent Changes

### March 19, 2026 - Luma Membership Sync Bug Fixes
- **Bug 1**: `fetchLumaMembersList()` was calling `memberships/members/list` which returns 404 (endpoint doesn't exist in Luma API). Fixed: now reads membership data from the local `people` table, which is populated during cron sync via `calendar/list-people` (membership status is embedded per-person in Luma's response).
- **Bug 2**: `addMemberToLumaTier()` treated "already has an active membership" 400 errors as failures, causing 3x retries per already-member. Fixed: 400 errors are now flagged `nonRetryable` in `lumaApiRequest()`, and the "already has an active membership" message is caught and treated as a skip/success.
- **Bug 3**: `batchInsertPeople()` was not storing `luma_membership_status` or `luma_membership_tier_id` from Luma person records, so the people table had no membership data for the pull/revocation logic. Fixed: these fields are now extracted and stored during sync.
- **Safe mode guard**: `reconcileMemberships()` checks `hasMembershipData` flag — if no people have membership data yet (first sync with new fields), all pull/revocation logic is skipped to prevent false revocations.
- **Pull logic (Luma→local) uses ticket cross-reference**: Only grants `premiumSource: 'luma'` to Luma-approved members who have `revenue_usd_cents > 0` AND whose revenue is NOT explained by a premium-granting event ticket. Cross-references `attendance.ticket_type_id` against `events.premium_ticket_types` for events where `grants_premium_access = true`. This prevents the recursive loop where users we pushed (via `skip_payment: true`, revenue stays $0) or users who only bought event tickets get incorrectly granted Luma membership premium.
- **Files**: `server/services/LumaMembershipService.ts`, `server/services/CacheService.ts`, `server/routes.ts`

### March 18, 2026 - Email Drift Detection UI
- **Feature**: Surfaces accounts where a linked Luma profile email changed but the user's account email didn't, enabling admin notifications and user self-service resolution.
- **Schema**: Added `emailDriftDetectedAt` (timestamp) and `emailDriftPersonEmail` (varchar) columns to `users` table.
- **CacheService**: During `batchInsertPeople`, drift is detected when a linked person's email differs from their user account email. Drift fields are persisted to the user record. When emails match again (resolved externally), drift fields are automatically cleared.
- **Admin Members Table**: Drifted users sort to the top of the members list. Drifted rows have a subtle amber tint. Warning icon with tooltip in the email column shows the new Luma email.
- **Admin MemberPreview Sidebar**: Shows an "Email Drift Detected" alert card with the new email, detection date, and a "Notify User" button.
- **Admin Notification**: `POST /api/admin/members/:id/notify-drift` sends email to BOTH the account email and the drifted Luma email, linking them to the settings page.
- **User Self-Service**: Alert banner in settings page (above Linked Luma Profiles) with three options: "Update my email" (changes account email), "Link both" (adds second profile link), or "Dismiss" (clears drift).
- **Resolve Endpoint**: `POST /api/user/resolve-drift` handles all three actions. `link-both` validates that a person record exists for the drifted email before claiming success.
- **Admin Dismiss**: `POST /api/admin/members/:id/dismiss-drift` sets `emailDriftAdminDismissedAt` so the drift no longer sorts to top or shows amber tint, but the user can still see and resolve it. If the Luma email changes again (new drift), the admin dismissed flag is automatically cleared so it resurfaces. All three drift fields are cleared together when the user resolves.
- **Files**: `shared/schema.ts`, `server/services/CacheService.ts`, `server/routes.ts`, `server/email.ts`, `client/src/components/admin/DataTable.tsx`, `client/src/components/admin/MembersTable.tsx`, `client/src/components/admin/MemberPreview.tsx`, `client/src/pages/UserSettingsPage.tsx`

### March 18, 2026 - CacheService Optimizations
- **Daily full people refresh**: Tracks `last_full_people_refresh` in `cache_metadata` table. Every 24h, bypasses `created_after` filter (passes epoch) to fetch ALL people from Luma, catching records missed by incremental sync. Timestamp updated only after successful sync.
- **Removed dead syncMembershipFromLuma method**: The per-person `syncMembershipFromLuma()` method was removed entirely. Membership state is now handled comprehensively by `reconcileMemberships()` at the end of each sync cycle.
- **Batch-loop optimization**: `existingUsers` and `userPeopleLinks` are loaded once before all people batches (not per-batch), reducing DB queries from O(batches) to O(1).
- **Smart relinking with email drift detection**: Email-based user↔person linking only happens for previously unlinked people. For already-linked people, if their Luma email changes but their linked user account email doesn't match, it's logged as `[Email Drift]` for admin review.
- **Graceful per-person error handling**: Individual person processing failures are caught, logged (with `api_id` and email), and skipped — the batch continues instead of aborting the entire transaction.
- **Files**: `server/services/CacheService.ts`
- **Key constants**: `FULL_PEOPLE_REFRESH_INTERVAL` (24h), `FULL_PEOPLE_REFRESH_KEY` ('last_full_people_refresh'), `SYNC_INTERVAL` (6h)

### March 18, 2026 - Bidirectional Luma Membership Sync
- **Problem**: Luma membership sync was one-directional (push only), didn't fetch the full Luma member roster, couldn't remove stale members, and didn't correct drifted Stripe subscription statuses
- **Solution**: Full bidirectional reconciliation in `LumaMembershipService.reconcileMemberships()`
- **Key methods added**:
  - `fetchLumaMembersList()` — paginated fetch of all members in the configured Luma tier
  - `getActivePremiumEmails()` — aggregates premium users from ALL sources: Stripe connector (`stripe.subscriptions` + `stripe.customers`), manual admin grants (`users.premiumSource='manual'`), and Luma/event grants (`users.premiumSource='luma'`)
  - `reconcileMemberships()` — compares DB premium set against Luma tier roster:
    - Pushes DB premium users missing from Luma
    - Pulls Luma-approved members into DB (grants `premiumSource='luma'` for users with no prior premium)
    - Removes stale Luma members who previously had premium but lost it
    - Corrects stale `users.subscriptionStatus` by comparing against `stripe.subscriptions` connector data
  - `reconcileStripeStatuses()` — fixes users whose local `subscriptionStatus` drifted from Stripe connector truth
- **Integration**:
  - `CacheService.updateCache()` now calls `reconcileMemberships()` instead of `syncPremiumMembersToLuma()`
  - New admin endpoint `POST /api/admin/luma-membership-sync` for on-demand reconciliation
- **Files**: `server/services/LumaMembershipService.ts`, `server/services/CacheService.ts`, `server/routes/premium.ts`
- **Critical note**: Premium source determination uses ALL three sources — never just Stripe alone. The Stripe connector (`stripe-replit-sync`) auto-syncs subscription data to `stripe.*` schema; do NOT add manual webhook handlers.

### March 18, 2026 - Fix Zero Attendee Count During Sync
- **Issue**: Event sync service deleted all attendance records before re-fetching from Luma API, causing attendee counts to show as zero during the sync window (or permanently if the API call failed)
- **Fix**: Removed the destructive `deleteAttendanceByEvent()` call from `syncEventAttendees()`. The sync now purely upserts new/updated attendee records. After all upserts complete successfully, stale records (those with `lastSyncedAt` older than the sync start time) are cleaned up. This ensures existing data is always visible and only removed after the full sync succeeds.
- **Files**: `server/services/eventSyncService.ts`

### March 8, 2026 - Sync Status Persistence (Shadow Sync)
- **Issue**: When the server restarted or a Luma sync ran, the frontend would show blank attendee lists and zero stats while data was being re-synced
- **Solution**: "Shadow sync" pattern — frontend holds cached data during sync and refreshes all at once when sync completes
- **Backend**:
  - `server/services/SyncStatusService.ts` — singleton EventEmitter tracking which sync services (cache, events) are active
  - `GET /api/sync/status` — returns `{ syncing: boolean, services: string[] }`
  - `/api/public/stats` and `/api/events/:id/attendees` responses now include `syncing` flag
  - `CacheService` and `EventSyncService` call `syncStatusService.startSync()` / `endSync()` around their sync operations
- **Frontend**:
  - `client/src/hooks/use-sync-status.ts` — polls `/api/sync/status` every 5s, detects sync completion transition, and invalidates all relevant query caches (stats, events, attendees, admin stats)
  - `BulletinBoard.tsx` and `EventContent.tsx` use `placeholderData: keepPreviousData` and disable refetching during sync
- **Impact**: Users never see blank or partially-loaded data during sync; previous data persists until sync is fully complete

### March 8, 2026 - Guest Premium Checkout (Stripe-First Onboarding)
- **Feature**: Non-logged-in users can now purchase Premium memberships directly via Stripe without creating an account first
- **Flow**: Click "Get Premium" → Stripe Checkout (collects email + payment) → Account auto-created → Verification email sent → User sets password → Logged in as Premium member with Luma profile auto-linked
- **Backend**:
  - `StripeService.createGuestCheckoutSession(priceId)` — creates Stripe Checkout session without requiring a customer ID
  - `POST /api/stripe/create-guest-checkout-session` — new unauthenticated endpoint for guest checkout
  - `GET /api/stripe/session-status` — extended to auto-create user accounts for guest checkouts when payment confirmed (creates user, links Stripe customer ID, auto-links Luma profile, generates auto-coupons, syncs Luma tier, sends verification email)
  - `StripeService.verifySession()` — now returns `customerEmail` from Stripe session data
- **Frontend**:
  - `use-subscription.ts` — added `startGuestSubscription()` function
  - `MembershipsPage.tsx` — Premium button now enabled for logged-out users, shows "Get Premium" text, calls guest checkout
  - `SubscriptionSuccessPage.tsx` — handles guest flow with account setup instructions and email prompt
- **Integration**: Uses Replit Stripe connector (`getUncachableStripeClient()`) for all Stripe API calls

### March 8, 2026 - User-Centric Architecture & Slug-Based Profile URLs
- **Architecture Shift**: Transitioned from `people`-record-centric to `users`-record-centric throughout the app
- **Database Changes**:
  - Added `slug` column (varchar, unique) to `users` table — stores URL-friendly profile identifiers
  - Populated slugs for all 580 existing users from linked people.userName/displayName/email with uniqueness via numeric suffixes
- **Backend**:
  - `GET /api/people` directory API now queries `users` table, returns user-sourced displayName/avatarUrl/slug
  - `GET /api/people/by-username/:username` looks up by `users.slug` first, falls back to `people.userName` for unclaimed attendees
  - `GET /api/people/:id` redirects to user's slug URL if a user account exists
  - `GET /api/auth/me` includes `slug` in response
  - `PATCH /api/user/slug` — change profile URL slug with uniqueness validation
  - `GET /api/user/check-slug/:slug` — real-time slug availability check
  - `getFeaturedMember()` now includes user slug in response
  - Added `getUserBySlug()`, `generateUniqueSlug()`, `formatSlug()` to storage
  - `createUser()` auto-generates slug on signup
- **Frontend**:
  - `PeopleDirectory.tsx` — uses user slug for URLs, identifies current user by `userId` (number)
  - `PersonProfilePage.tsx` — passes slug directly to API (no hyphen-to-space conversion needed)
  - `NavBar.tsx` — profile link uses `user.slug` when available
  - `FeaturedMemberCard.tsx` — profile links use slug
  - `CompanyProfile.tsx` — team member links use user slug
  - `UserSettingsPage.tsx` — editable profile URL slug with real-time availability checking
- **SEO**: Profile URLs stay at `/people/:slug` preserving existing search rankings
- **People table**: Now secondary/fallback for unclaimed attendees without user accounts

### March 8, 2026 - Dynamic Luma Membership Tier Resolution & Bi-directional Push Sync
- **Feature**: Membership tier ID is now dynamically fetched from Luma API instead of relying solely on `LUMA_MEMBERSHIP_TIER_ID` env var
- **Dynamic Tier Resolution**: `LumaMembershipService.resolveTierId()` calls `GET /v1/memberships/tiers/list` to fetch available tiers, caches the result. `LUMA_MEMBERSHIP_TIER_ID` env var still works as an override.
- **Push Sync (Our System → Luma)**: New `syncPremiumMembersToLuma()` method queries all users with active premium status (Stripe active, or premiumSource with valid expiry) and pushes them to Luma membership tier via `addMemberToLumaTier()`. Runs on startup and at end of each sync cycle.
- **Sync Interval**: Changed from 1 hour to 6 hours (`CacheService.SYNC_INTERVAL`)
- **Startup Flow**: Server resolves Luma tier ID early during startup → CacheService pulls data from Luma → push sync sends premium members to Luma
- **Files Changed**: `server/services/LumaMembershipService.ts`, `server/services/CacheService.ts`, `server/index.ts`

### March 7, 2026 - Luma Membership Sync & Decoupled Account Creation
- **Feature**: Unified membership system between internal platform and Luma
- **Database Changes**:
  - Added `user_people_links` junction table for many-to-many user-to-Luma-profile mapping (`userId`, `personId`, `isPrimary`, `linkedAt`) with unique constraint on `(userId, personId)`
  - Added `luma_membership_status` and `luma_membership_tier_id` columns to `people` table
  - Changed `users.person_id` from `serial` to `integer` (nullable) — no longer auto-increments
  - Migrated 580 existing user-person relationships into junction table with `isPrimary = true`
- **New Service**: `server/services/LumaMembershipService.ts`
  - `addMemberToLumaTier(email)` — pushes membership to Luma via `POST /v1/memberships/members/add` with `skip_payment: true`
  - `removeMemberFromLumaTier(email)` — removes via `POST /v1/memberships/members/update-status` with `status: "declined"`
  - `autoLinkByEmail(userId, email)` — auto-links Luma people records to user accounts
  - `linkPersonToUser/unlinkPerson/setPrimaryPerson` — junction table management
  - `getLinkedPeople(userId)` — returns all linked Luma profiles for a user
- **Outbound Sync (Stripe → Luma)**: When subscription activates or admin grants premium, pushes to Luma tier. When cancelled or revoked, removes from Luma tier.
  - Integrated into: `server/services/stripe.ts` (verifySession, reconcileAllSubscriptions), `server/routes/stripe.ts` (cancel-subscription), `server/routes/premium.ts` (grant/revoke premium)
- **Inbound Sync (Luma → Our System)**: During 6-hour people sync in `CacheService.ts`, captures `membership.status` and `membership.calendar_membership_tier_id` from Luma data, stores on `people` table, and reconciles premium access
- **Account Creation Decoupled**: Users no longer need a Luma profile to sign up. `createUser()` in `server/storage.ts` allows null `personId`. Auto-linking happens during verification.
- **Profile Linking API**: New endpoints for managing linked profiles:
  - `GET /api/users/linked-profiles` — list linked Luma profiles
  - `POST /api/users/link-profile` — link by email
  - `DELETE /api/users/unlink-profile/:personId` — unlink
  - `POST /api/users/set-primary-profile/:personId` — set primary
- **Frontend**: Updated `ClaimProfileDialog.tsx` to reflect new flow; integrated linked Luma profiles directly into the Profile Details card in `UserSettingsPage`
- **Profile Management (Independent of Luma)**:
  - Profile picture upload via camera overlay on avatar (saves to `user.featuredImageUrl`)
  - Inline display name editing with pencil icon (saves to `user.displayName`)
  - NavBar avatar shows `user.featuredImageUrl` with initial fallback
  - Linked Luma profiles data is included in `/api/auth/me` response (no separate query needed)
  - Luma profiles section is purely informational — platform identity is managed independently
- **Environment Variable**: `LUMA_MEMBERSHIP_TIER_ID` — the Luma membership tier ID for syncing (required for outbound sync)

### December 22, 2025 - Environment-Aware Event Sync
- **Issue**: Heavy Luma event sync was running on every server restart, slowing down development
- **Solution**: Added environment check to skip all event syncing in development mode
- **Changes Made**:
  - `startEventSyncService()` now checks `NODE_ENV` and returns null intervals in development
  - Production environment maintains startup sync + scheduled intervals (hourly for recent events, 6-hour for future events)
  - Updated interval types to allow null values for proper cleanup handling
- **Impact**: Development restarts are now much faster - no more waiting for Luma sync to complete
- **Production Behavior**: Unchanged - full sync on deployment + scheduled intervals

### December 18, 2025 - Interactive Event Agenda System for Summit 2026
- **Feature**: Built a comprehensive agenda management system for the Sarasota Tech Summit 2026
- **Database Schema**:
  - `presentations` table: Stores agenda items with title, description, start/end times, track (startup_school/main_stage), session type (keynote/panel/workshop/break/networking/round/talk), and isFullWidth flag for breaks/networking spanning all tracks
  - `speakers` table: Speaker profiles with name, bio, photo, title, company, and optional bio URL
  - `presentation_speakers` junction table: Many-to-many relationship with isModerator flag and displayOrder for panel moderators
- **Frontend Components**:
  - `AgendaSection`: Main component with toggle between calendar day view and traditional list view
  - `PresentationCard`: Renders individual agenda items with session type badges, track info, and speaker avatars
  - `PresentationModal`: Admin modal for creating/editing presentations and managing speaker assignments
  - `SpeakerModal`: Admin modal for adding/editing speakers with photo upload support
- **Two Tracks**: Startup School and Main Stage, displayed in columns in calendar view
- **Admin Features**: Full CRUD for presentations and speakers, moderator assignment, drag-and-drop speaker ordering
- **Integration**: Replaced static AgendaCard on SummitPage with dynamic AgendaSection

### November 7, 2025 - Email Invitation System Redesigned for Manual Control
- **Context**: Automatic batch enrollment accidentally sent 147 emails and created 671 invitation records before being stopped, leaving 558 people with broken verification links
- **Key Design Decisions**:
  - **Manual Control**: Removed automatic backfilling; admins must manually select people to enroll
  - **Immediate Sending**: Emails now send immediately when enrolled (no time restrictions) for better user experience
  - **Automatic for New Signups Only**: New account creation automatically enrolls users in email workflow
  - **Protected Completed Invitations**: 365 completed invitations (claimed accounts) never receive emails again
- **Architecture Changes**:
  - Created `enrollSpecificPeople(personIds[], apologyMessage?)` method for controlled enrollment
  - Removed `processNewPeople()` from automatic hourly processing
  - Updated `/api/admin/batch-invite-people` endpoint to accept specific person IDs array
  - Automatic service now only handles: `detectClaimedAccounts()` (24/7) and `sendFollowUpEmails()` (9-10 AM Eastern)
- **Recovery System**:
  - Added apology message parameter to email templates
  - Created `/api/admin/send-apology-emails` endpoint to resend working links to affected users
  - Apology email automatically includes message: "Our previous email had a technical error with the verification link. We apologize for the inconvenience. This email contains a working link to claim your profile."
  - SQL query identifies 558 people who received tokens without invitations: `SELECT DISTINCT p.id FROM verification_tokens vt INNER JOIN people p ON p.email = vt.email LEFT JOIN email_invitations ei ON ei.person_id = p.id WHERE vt.created_at > '2025-11-07 21:03:00' AND ei.id IS NULL`
- **Database Cleanup**: Removed all auto-created invitations except the 365 completed ones
- **Impact**: System now provides full admin control over enrollment while maintaining automatic processing for follow-ups and claim detection

### November 6, 2025 - Email Invitation Claim Detection Fixed
- **Issue**: Service only checked for claimed accounts during 9-10 AM Eastern window, causing up to 23-hour delay in detection
- **Root Cause**: `processFollowUps()` had early return if outside sending window, preventing claim detection from running
- **Solution**: Separated claim detection from email sending into two distinct methods
  - `detectClaimedAccounts()` - Runs every hour, 24/7, regardless of time
  - `sendFollowUpEmails()` - Only runs during 9-10 AM Eastern window
- **Changes Made**:
  - Refactored EmailInvitationService to separate concerns
  - Added new storage method `getActiveEmailInvitations()` for 24/7 claim detection
  - Updated `processInvitations()` to call both methods in proper sequence
- **Testing Verified**: 
  - Test accounts (ID 1364, 1365) marked completed_at within 5 seconds of server restart at 10:42 PM
  - Accounts excluded from "due for sending" query (0 results)
  - No duplicate emails will be sent to completed accounts
- **Impact**: Claimed accounts now detected immediately (within 1 hour) instead of waiting up to 23 hours

### October 1, 2025 - Profile URL Generation Fixed
- **Issue**: Users without Luma profile names were getting broken profile pages
- **Root Causes Identified**:
  - Duplicate `/api/people/by-username` endpoint causing incorrect routing
  - Fallback URL format mismatch: frontend generated `u-{api_id}` but Luma IDs are `usr-{id}`
  - Some users had empty `userName` fields from Luma sync
- **Changes Made**:
  - Removed duplicate endpoint, kept the working one with proper username-to-spaces conversion
  - Updated `formatUsernameForUrl()` to use API ID directly without prefix when username is empty
  - Now generates URLs like `/people/usr-abc123` instead of `/people/u-usr-abc123`
- **Testing Verified**: Both named users (dan-veitkus) and users with empty names (usr-xxx) now resolve correctly
- **Impact**: All user profile pages now work regardless of whether they set a name in Luma

### August 6, 2025 - Password Reset Production Environment Issue Resolved
- **Issue**: Password reset working in development but failing in production deployment
- **Root Cause Analysis**: Production environment missing critical configuration
  - `NODE_ENV` environment variable not set in production (causes app to run in development mode)
  - Production email behavior differs from development expectations
  - Development mode bypasses actual email sending when SENDGRID_API_KEY exists
- **Required Production Environment Variables**:
  - `NODE_ENV=production` (critical for proper email behavior)
  - `APP_URL` (must be set to production domain, not localhost)
  - `SENDGRID_API_KEY` (verified present)
  - `SENDGRID_FROM_EMAIL` (verified present)
- **Solution**: Ensure all required environment variables are properly configured in production deployment
- **Impact**: Password reset functionality now works consistently across environments

### July 30, 2025 - Email Verification System Investigation & Fix
- **Investigation**: Comprehensive testing of email verification flow after user reports of failures
- **Findings**: Email verification system is working correctly
  - SendGrid API calls successful
  - Token generation and validation working
  - User creation process functioning
  - Emails being delivered successfully
- **Root Cause**: User confusion rather than technical failure
  - Users with existing accounts get "Profile already claimed" message
  - New users without event history get invited to events instead of verification emails
  - Some verification emails may go to spam folders
- **Fix Applied**: Corrected double-slash URL formatting issue in verification emails
- **Result**: System functioning properly, improved URL formatting for better reliability

### July 19, 2025 - Application Startup Issues Fixed
- **Issue**: App failing to restart after being stopped, with port conflicts and hanging processes
- **Resolution**: Implemented comprehensive graceful shutdown handling
  - Added proper cleanup for all intervals (badge assignment, event sync)
  - Improved database connection pool closure
  - Added signal handlers for SIGTERM, SIGINT, SIGQUIT
  - Implemented process cleanup for uncaught exceptions and unhandled rejections
  - Added timeout mechanisms to prevent hanging shutdowns
  - Made heavy startup processes non-blocking to prevent timeout failures
- **Result**: App now starts and restarts reliably without port conflicts or hanging processes

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with custom theme configuration
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with bcrypt password hashing
- **File Structure**: Modular route handlers with middleware for authentication and authorization

### Database Schema
- **Primary Database**: PostgreSQL (via Neon serverless)
- **Key Tables**: 
  - Users and authentication (users, verification_tokens, password_reset_tokens)
  - Community data (people, events, attendance, posts, tags)
  - User-Luma profile linking (user_people_links — junction table for many-to-many user↔people mapping)
  - Company information (companies, company_members, company_tags, industries)
  - Permissions system (roles, permissions, role_permissions, user_roles)
  - Badge system (badges, user_badges)
  - Summit agenda (presentations, speakers, presentation_speakers)
  - Caching layer (cache_metadata)

## Key Components

### Authentication System
- Session-based authentication with secure password hashing
- Email verification for new accounts
- Password reset functionality via email tokens
- Role-based access control with admin privileges

### Community Features
- Member profiles with customizable information and social links
- Company directory with detailed company profiles
- Event management with attendance tracking
- News/bulletin board system with tagging
- Badge system for member achievements

### Admin Dashboard
- Comprehensive statistics and analytics
- User, company, and event management
- Content moderation capabilities
- Data migration tools for system updates

### Third-Party Integrations
- **Stripe**: Payment processing for memberships and subscriptions
- **SendGrid**: Email delivery for notifications and verification
- **Unsplash**: Image search and selection for content
- **Google Maps**: Location services for events and companies
- **Replit Object Storage**: File upload and storage

### File Upload System
- Integration with Replit's file upload service
- Support for profile images and company assets
- Secure API key authentication for upload operations

## Data Flow

1. **Client Requests**: React components make API calls using TanStack Query
2. **Authentication**: Express middleware validates session cookies
3. **Route Processing**: Express routes handle business logic and database operations
4. **Database Operations**: Drizzle ORM executes type-safe database queries
5. **Response**: JSON responses sent back to client with proper error handling

### Real-time Features
- Server-Sent Events (SSE) for live data synchronization
- Background event attendance syncing
- Cache invalidation strategies for data consistency

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/**: UI component primitives
- **tailwindcss**: Utility-first CSS framework

### Service Integrations
- **@stripe/stripe-js**: Payment processing
- **@sendgrid/mail**: Email delivery
- **@react-google-maps/api**: Google Maps integration
- **@replit/object-storage**: File storage service

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for server development

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with Express backend
- **Hot Reloading**: Full-stack development with automatic refresh
- **Database**: Development PostgreSQL instance

### Production Deployment
- **Platform**: Replit deployment with Cloud Run integration
- **Build Process**: Vite production build with server compilation
- **Environment Variables**: Secure configuration for API keys and database URLs
- **Health Checks**: Application health monitoring endpoints

### Database Management
- **Migrations**: Drizzle migrations for schema changes
- **Seeding**: Automated data seeding for initial setup
- **Backup Strategy**: Regular database backups via Neon

## Changelog

- June 20, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.