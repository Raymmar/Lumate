# Sarasota Tech Community Platform

## Overview

This is a full-stack web application built for the Sarasota Tech community, designed to connect tech professionals, showcase companies, manage events, and facilitate community engagement. The platform combines a React-based frontend with an Express.js backend, using PostgreSQL for data persistence and various third-party integrations for enhanced functionality.

## Recent Changes

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
  - Company information (companies, company_members, company_tags, industries)
  - Permissions system (roles, permissions, role_permissions, user_roles)
  - Badge system (badges, user_badges)
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