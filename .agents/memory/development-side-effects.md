---
name: Development startup side effects
description: Safety constraint when restarting the application for verification
---

Treat development startup as potentially capable of sending real invitation emails.

**Why:** During verification on 2026-09-27, restarting the development workflow triggered the invitation processor and logs confirmed successful real email delivery. Development mode alone is not a safe dry-run guarantee.

**How to apply:** Before future restart-heavy testing, check whether an outbound-email safety gate has since been implemented. Prefer isolated tests that do not import application startup or initialize background services.