# Sarasota Tech Community Platform

## Overview

This is a full-stack web application built for the Sarasota Tech community, designed to connect tech professionals, showcase companies, manage events, and facilitate community engagement. The platform combines a React-based frontend with an Express.js backend, using PostgreSQL for data persistence and various third-party integrations for enhanced functionality.

## Recent Changes

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