# MMK Accountants Backend

Production-ready REST backend for the MMK Accountants website frontend.

## 1) Frontend Audit Summary

The existing frontend is a static multi-page website generated from `src/*.html` via `build.js` includes.

### Detected frontend pages

40 source pages:

- `index.html`
- `about.html`
- `accessibility.html`
- `accounting.html`
- `bookkeeping.html`
- `business-news.html`
- `business-start-ups.html`
- `careers.html`
- `charity.html`
- `cloud-accounting.html`
- `company-formation.html`
- `company-secretarial.html`
- `consultants.html`
- `contact.html`
- `cookies.html`
- `corporate-finance.html`
- `disclaimer.html`
- `doctors.html`
- `expatriates.html`
- `help.html`
- `hot-topics.html`
- `news.html`
- `payroll.html`
- `privacy.html`
- `property-tax.html`
- `resources.html`
- `retail.html`
- `schools.html`
- `services.html`
- `site-map.html`
- `specialists.html`
- `tax-information.html`
- `tax-investigation.html`
- `tax-strategies.html`
- `taxation.html`
- `terms.html`
- `tools.html`
- `why-us.html`
- `your-business.html`
- `your-money.html`

### Detected forms

- `quoteForm` in `includes/quote-modal.html`
- `contactForm` in `src/contact.html`
- `newsletterForm` in `includes/footer.html`

### User actions and backend-required actions

- Submit quote request
- Submit contact message
- Subscribe to newsletter

Other actions (tools calculators, company search, VAT checker, MTD checker, news/resources pages) are currently client-only/static and do not require backend persistence in the current frontend implementation.

## 2) Backend Architecture

### Modules

- `auth`: login, refresh, logout, logout-all, me
- `users`: internal admin user management
- `inquiries`: public form submission + protected inquiry management
- `newsletter`: public subscribe/unsubscribe + protected subscriber management
- `admin`: dashboard metrics and audit logs

### Database entities

- `User`
- `RefreshToken`
- `Inquiry`
- `InquiryNote`
- `NewsletterSubscriber`
- `AuditLog`

### Auth and authorization

- Access token: JWT
- Refresh token: opaque token stored hashed in DB
- Roles: `ADMIN`, `STAFF`
- Public routes for website form submissions
- Protected routes for internal operations

### External integrations

- Optional SMTP email notifications for new inquiries

## 3) Tech Stack

- Node.js + Express + TypeScript
- PostgreSQL
- Prisma ORM
- Zod validation
- Pino logging
- Helmet + CORS + rate limiting

## 4) Project Structure

```txt
backend/
  prisma/
    schema.prisma
    seed.ts
    migrations/
  src/
    app.ts
    server.ts
    config/
    lib/
    middleware/
    modules/
      auth/
      users/
      inquiries/
      newsletter/
      admin/
    routes/
    services/
    utils/
```

## 5) Environment Variables

Copy `.env.example` to `.env` and adjust values.

Required core variables:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `PORT`
- `API_PREFIX`
- `CORS_ORIGINS`

Optional integrations:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `NOTIFICATION_TO`

## 6) Setup

From `backend/`:

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## 7) Prisma Schema, Migration, and Seed

- Prisma schema: `backend/prisma/schema.prisma`
- Initial migration SQL: `backend/prisma/migrations/20260311090000_init/migration.sql`
- Seed script: `backend/prisma/seed.ts`

Default seed users:

- `admin@mmkaccountants.local` / `ChangeMe123!`
- `staff@mmkaccountants.local` / `ChangeMe123!`

## 8) API Endpoints

Base prefix: `/api/v1`

### Public

- `GET /health`
- `POST /inquiries/contact`
- `POST /inquiries/quote`
- `POST /newsletter/subscribe`
- `GET /newsletter/unsubscribe?token=...`

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all` (auth)
- `GET /auth/me` (auth)

### Protected (`ADMIN`/`STAFF` unless stated)

- `GET /inquiries`
- `GET /inquiries/:id`
- `PATCH /inquiries/:id`
- `POST /inquiries/:id/notes`
- `GET /newsletter/subscribers`
- `PATCH /newsletter/subscribers/:id`
- `GET /admin/dashboard`
- `GET /admin/audit-logs` (`ADMIN` only)

### Admin users (`ADMIN` only)

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PATCH /users/:id`
- `PATCH /users/:id/password`
- `DELETE /users/:id`

## 9) Response Pattern

Success:

```json
{
  "success": true,
  "message": "optional",
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## 10) Frontend Integration

`script.js` now posts real form data to:

- `POST /api/v1/inquiries/quote`
- `POST /api/v1/inquiries/contact`
- `POST /api/v1/newsletter/subscribe`

API base URL behavior in frontend:

- `localhost`/`127.0.0.1` -> `http://localhost:4000/api/v1`
- other hosts -> `/api/v1`

You can override by setting `window.MMK_API_BASE` before `script.js` loads.

## 11) Security Defaults

- Helmet headers
- CORS allowlist
- Global + route-specific rate limiting
- Argon2 password hashing
- Refresh token rotation and revocation
- Centralized validation and error handling
- Audit logging for sensitive actions

## 12) Not Implemented by Design

- File upload module (no frontend file input)
- News/resource CMS endpoints (frontend is static and has no API-driven content flows yet)
