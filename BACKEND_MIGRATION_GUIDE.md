# Stellar Luna — Backend Migration Specification (PocketBase to Fastify.js)

This document contains a complete architectural teardown of the current **PocketBase** backend and website integration, along with a complete specification, database schemas, API contracts, business logic, and a ready-to-use AI prompt for building the replacement backend using **Fastify.js**.

---

## 1. System Architecture & Inventory

### 1.1 Current Architecture Overview
The current system consists of:
1. **Frontend**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS, Framer Motion).
2. **Current Backend**: **PocketBase** (`v0.26.x`), running both locally (`pocketbase-server/pocketbase serve`) and remotely at `https://pb.byorpheros.com`.
3. **Integration Modes**:
   - **Client-Side Direct PB SDK**: Portal login, authentication state management, real-time transaction updates (via PocketBase Server-Sent Events / SSE), and file access.
   - **Next.js API Routes Proxy**: Routes under `app/api/*` that proxy PocketBase CRUD requests using the JS SDK (`pocketbase`).
   - **SSR Server Components**: Server-side fetching in `app/page.tsx` and `app/members/[slug]/page.tsx`.

### 1.2 Target Architecture (Fastify.js Backend)
- **Framework**: Fastify with TypeScript.
- **Database**: PostgreSQL or SQLite (via Prisma or Drizzle ORM).
- **Authentication**: JWT authentication (`@fastify/jwt`) with access/refresh tokens and password hashing via `bcrypt` / `argon2`.
- **File Storage**: Local file system (`@fastify/static` or `@fastify/multipart`) or S3-compatible object storage.
- **Real-time Engine**: Server-Sent Events (SSE) or WebSockets (`@fastify/websocket`) to replace PocketBase's `pb.collection('transaction').subscribe('*')`.
- **Backward-Compatible File Serving Endpoint**: `/api/files/:collection/:id/:filename` so existing frontend image URLs continue to work seamlessly.

---

## 2. PocketBase Database Schemas & Collections

Analysis of both the local SQLite database (`pocketbase-server/pb_data/data.db`) and the live remote PocketBase server (`https://pb.byorpheros.com`) identified **6 core collections**:

### 2.1 Collection: `users` (Auth Collection)
Manages admin and staff accounts for accessing the `/portal` dashboard.

| Field Name | Type | Required | Constraints / Options | Description |
|---|---|---|---|---|
| `id` | `text` | Yes | 15 chars alphanumeric (PK) | Unique user ID |
| `email` | `email` | Yes | Unique, valid email | User login email |
| `password` | `password` | Yes | Min 8 chars, hashed | User login password |
| `name` | `text` | No | Max 255 chars | Display name |
| `avatar` | `file` | No | Single file (jpeg, png, svg, gif, webp) | User profile image |
| `stellar_role` | `select` | No | Enum: `['admin', 'member']` (default: `'member'`) | Portal access control role |
| `emailVisibility` | `bool` | No | Default `false` | PocketBase privacy flag |
| `verified` | `bool` | No | Default `false` | Email verification flag |
| `created` | `autodate` | System | ISO 8601 string | Creation timestamp |
| `updated` | `autodate` | System | ISO 8601 string | Last updated timestamp |

*Rules:*
- `listRule` / `viewRule` / `updateRule` / `deleteRule`: `id = @request.auth.id`
- Admin user listing and role updates are executed using superuser credentials (`PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`).

---

### 2.2 Collection: `events` (Base Collection)
Stores idol performances, appearances, and tour schedules.

| Field Name | Type | Required | Constraints / Options | Description |
|---|---|---|---|---|
| `id` | `text` | Yes | 15 chars alphanumeric (PK) | Unique event ID |
| `title` | `text` | Yes | Min 1 char | Event title (e.g., `"JIEXPO Kemayoran"`) |
| `description` | `text` | No | Text | Event details & info |
| `location` | `text` | No | Text | Venue / Location (e.g., `"Kemayoran"`, `"Bekasi"`) |
| `start_date` | `date` / `text` | Yes | ISO 8601 timestamp | Event start date & time |
| `end_date` | `date` / `text` | No | ISO 8601 timestamp (nullable) | Event end date & time |
| `variant` | `select` | No | Enum: `['primary', 'success', 'warning', 'danger']` | Visual calendar accent color |
| `status` | `text` | No | Values: `['active', 'selling_fast', 'pre_sale', 'announced', '']` | Ticket / booking availability badge |
| `created` | `autodate` | System | ISO 8601 string | Record creation timestamp |
| `updated` | `autodate` | System | ISO 8601 string | Record update timestamp |

*Rules:* Public read & write.

---

### 2.3 Collection: `members` (Base Collection)
Stores the idol group member profiles.

| Field Name | Type | Required | Constraints / Options | Description |
|---|---|---|---|---|
| `id` | `text` | Yes | 15 chars alphanumeric (PK) | Unique member ID |
| `name` | `text` | Yes | Min 1 char | Full member name (e.g., `"Maricel"`, `"Rakun"`, `"Yenna"`) |
| `slug` | `text` | Yes | Unique string (lowercase slug) | URL route slug (e.g., `"maricel"`, `"rakun"`, `"yenna"`) |
| `role` | `text` | No | Text | Band position (e.g., `"Lead Vocalist"`, `"Dancer"`) |
| `hobby` | `text` | No | Text | Member hobbies / quirks |
| `notes` | `text` | No | Text | Biography / description |
| `birthdate` | `text` | No | Format: `YYYY-MM-DD` | Date of birth |
| `image` | `file` | No | Single file upload | Member photo |
| `instagram` | `text` | No | URL string | Instagram profile link |
| `created` | `autodate` | System | ISO 8601 string | Record creation timestamp |
| `updated` | `autodate` | System | ISO 8601 string | Record update timestamp |

*Rules:* Public read & write.

---

### 2.4 Collection: `transaction` (Base Collection — singular name in DB)
Tracks merchandise and Cheki ticket pre-orders (PO) and on-the-spot (OTS) sales and line queues.

| Field Name | Type | Required | Constraints / Options | Description |
|---|---|---|---|---|
| `id` | `text` | Yes | 15 chars alphanumeric (PK) | Unique transaction ID |
| `name` | `text` | Yes | Customer name | Name of purchaser / fan |
| `event_date` | `text` | Yes | Text string | Event selection (e.g., `"JIEXPO Kemayoran — 21 Apr"`) |
| `member` | `text` | Yes | Comma-separated summary | Ordered breakdown, e.g. `"Ihuy (1), Maricel (2)"` |
| `quantity` | `number` | Yes | Integer >= 1 | Total ticket quantity |
| `receipt` | `file` | No | File upload (JPEG, PNG, PDF <= 5MB) | Proof of transfer image/pdf (required for PO, optional for OTS) |
| `type` | `select` | Yes | Enum: `['PO', 'OTS']` | Transaction mode (Pre-Order vs On The Spot) |
| `status` | `text` | No | Lifecycle status | Details below |
| `notes` | `text` | No | Customer notes | Additional request instructions |
| `created` | `autodate` | System | ISO 8601 string | Created timestamp (used for queue ordering) |
| `updated` | `autodate` | System | ISO 8601 string | Updated timestamp |

#### `status` Field Lifecycle & Queue Tracking Logic:
- For **PO**: Defaults to `'pending'` upon creation until staff confirms or processes it.
- For **OTS**: Defaults to `'confirmed'`.
- Possible base statuses: `'pending'`, `'confirmed'`, `'rejected'`, `'complete'`.
- **Multi-member completion queue logic**: In `/portal/tracking`, when a ticket has multiple members (e.g. `"Maricel (1), Rakun (1)"`), staff mark each member as finished one by one. The `status` field stores the completed members as a comma-separated string:
  1. Initial: `"pending"`
  2. Maricel done: `"Maricel"`
  3. All members done: `"complete"`

---

### 2.5 Collection: `cheki_price` (Base Collection)
Stores configuration prices for Cheki tickets.

| Field Name | Type | Required | Constraints / Options | Description |
|---|---|---|---|---|
| `id` | `text` | Yes | 15 chars alphanumeric (PK) | Unique price entry ID |
| `type` | `select` | Yes | Enum: `['ots', 'po']` (unique) | Cheki type |
| `price` | `number` | Yes | Number (e.g., `35000` for PO, `40000` for OTS) | Price in IDR |
| `created` | `autodate` | System | ISO 8601 string | Timestamp |
| `updated` | `autodate` | System | ISO 8601 string | Timestamp |

---

### 2.6 Collection: `listings` (Base Collection)
General merchandise / catalog collection (prepared in PB for shop listings).

| Field Name | Type | Required | Constraints / Options | Description |
|---|---|---|---|---|
| `id` | `text` | Yes | 15 chars alphanumeric (PK) | Unique listing ID |
| `name` | `text` | Yes | Product name | Merchandise title |
| `price` | `number` | Yes | Number | Price in IDR |
| `category` | `text` | No | Text | Category name |
| `rating` | `number` | No | Float / Number | Rating (0-5) |
| `description` | `text` | No | Text | Product description |
| `image` | `file` | No | Single file | Main thumbnail image |
| `images` | `file` | No | Multiple files (up to 99) | Additional photo gallery |
| `created` | `autodate` | System | ISO 8601 string | Timestamp |
| `updated` | `autodate` | System | ISO 8601 string | Timestamp |

---

## 3. Relational Database Schema (PostgreSQL / SQLite DDL)

Here is the clean relational SQL schema for the Fastify backend:

```sql
-- Enums
CREATE TYPE stellar_role_enum AS ENUM ('member', 'admin');
CREATE TYPE event_variant_enum AS ENUM ('primary', 'success', 'warning', 'danger');
CREATE TYPE event_status_enum AS ENUM ('active', 'selling_fast', 'pre_sale', 'announced', '');
CREATE TYPE transaction_type_enum AS ENUM ('PO', 'OTS');
CREATE TYPE cheki_type_enum AS ENUM ('po', 'ots');

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(15) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT '',
    avatar VARCHAR(255) DEFAULT '',
    stellar_role stellar_role_enum DEFAULT 'member',
    email_visibility BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Events Table
CREATE TABLE events (
    id VARCHAR(15) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    location VARCHAR(255) DEFAULT '',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    variant event_variant_enum DEFAULT 'primary',
    status VARCHAR(50) DEFAULT '',
    image VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Members Table
CREATE TABLE members (
    id VARCHAR(15) PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT '',
    hobby TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    birthdate VARCHAR(20) DEFAULT '',
    image VARCHAR(255) DEFAULT '',
    instagram VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Transactions Table
CREATE TABLE transactions (
    id VARCHAR(15) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_date VARCHAR(255) NOT NULL,
    member TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    receipt VARCHAR(255) DEFAULT '',
    type transaction_type_enum NOT NULL DEFAULT 'PO',
    status VARCHAR(255) DEFAULT 'pending',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX idx_transactions_type ON transactions (type);
CREATE INDEX idx_transactions_status ON transactions (status);

-- 5. Cheki Prices Table
CREATE TABLE cheki_prices (
    id VARCHAR(15) PRIMARY KEY,
    type cheki_type_enum NOT NULL UNIQUE,
    price INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Listings Table
CREATE TABLE listings (
    id VARCHAR(15) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    category VARCHAR(100) DEFAULT '',
    rating NUMERIC(3, 2) DEFAULT 0,
    description TEXT DEFAULT '',
    image VARCHAR(255) DEFAULT '',
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 4. API Endpoints Specification (Fastify Routes)

### 4.1 Authentication & User Management
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Logs in staff (`email`, `password`), returns JWT token + user record |
| `POST` | `/api/auth/refresh` | Bearer Token | Refreshes token and returns updated user profile |
| `GET` | `/api/auth/me` | Bearer Token | Returns current authenticated user snapshot |
| `POST` | `/api/auth/logout` | Optional | Clears session cookie/token |
| `GET` | `/api/admin/users` | Admin JWT | Lists all staff users (`id, name, email, stellar_role`) sorted by name |
| `PUT` | `/api/admin/users` | Admin JWT | Updates user role `{ id, stellar_role: 'admin' \| 'member' }` |

### 4.2 Events
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/events` | Public | Returns events formatted for calendar (`id, title, description, startDate, endDate, variant`) sorted by `start_date` |
| `GET` | `/api/events/raw` | Public | Returns raw event records sorted by `start_date` |
| `POST` | `/api/events/raw` | Staff JWT | Creates event (`title, description, location, start_date, end_date, variant, status`) |
| `PUT` | `/api/events/raw` | Staff JWT | Updates event by `id` in body |
| `PATCH` | `/api/events/raw` | Staff JWT | Partial update (e.g. `{ id, status }`) |
| `DELETE` | `/api/events/raw` | Staff JWT | Deletes event by query param `?id=<id>` |

### 4.3 Members
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/members/raw` | Public | Returns all members sorted by `name` |
| `GET` | `/api/members/:slug` | Public | Returns single member by unique `slug` (e.g. `maricel`) |
| `POST` | `/api/members/raw` | Staff JWT | Creates member via `multipart/form-data` with optional `image` upload |
| `PUT` | `/api/members/raw` | Staff JWT | Updates member via `multipart/form-data` (receives `id` in form) |
| `DELETE` | `/api/members/raw` | Staff JWT | Deletes member by query param `?id=<id>` |

### 4.4 Payments & Transactions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/payment` | Public | **Pre-Order (PO) submission**: `multipart/form-data` containing `name`, `eventDate`, `items` (JSON string array), optional `notes`, and required `receipt` file (max 5MB, JPEG/PNG/PDF). Saves record with `type: 'PO'`, `status: 'pending'`, emits real-time event. |
| `POST` | `/api/ots` | Staff JWT | **On-The-Spot (OTS) submission**: `application/json` containing `name`, `eventDate`, `items` (JSON string), optional `notes`. Saves record with `type: 'OTS'`, `status: 'confirmed'`, emits real-time event. |
| `GET` | `/api/payment/status` | Public | Inquire single transaction status by query `?id=<txid>`. Returns safe fields (`id, name, member, quantity, eventDate, status, created`). |
| `GET` | `/api/transactions/raw` | Staff JWT | Lists all transactions sorted by `created DESC`. |
| `PUT` | `/api/transactions/raw` | Staff JWT | Updates transaction fields (especially `status` queue progression: `pending` -> `MemberA` -> `complete`). |
| `DELETE` | `/api/transactions/raw` | Staff JWT | Deletes transaction by `?id=<id>`. |

### 4.5 Admin Settings (Pricing)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/settings` | Public/Auth | Returns Cheki prices: `{ ots: { id, price }, po: { id, price } }` (defaults: ots=40000, po=35000). |
| `PUT` | `/api/admin/settings` | Admin JWT | Upserts prices for `'ots'` and `'po'`. |

### 4.6 File Serving (PocketBase Compatible)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/files/:collection/:id/:filename` | Public | Serves stored file (member images, payment receipts, avatars). This preserves 100% compatibility with existing Next.js frontend helper `getMemberImageUrl()` and `getReceiptUrl()`. |

### 4.7 Real-time Queue Stream (SSE or WebSocket)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/realtime` or `/api/transactions/stream` | Staff JWT / Public | Server-Sent Events stream delivering `{ action: 'create' \| 'update' \| 'delete', record: Transaction }` updates whenever a transaction is placed or its status is modified. |

---

## 5. Key Business Logic to Implement in Fastify

1. **ID Generation**:
   PocketBase uses 15-character lowercase alphanumeric IDs (e.g. `848xjh5j2t35dwu`, `l17syk3g4nslfkb`). Use `nanoid(15)` or `customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 15)`.

2. **Items Serialization & Member Summary**:
   In both `/api/payment` and `/api/ots`:
   - `items` arrives as a JSON string: `[{"id":"...", "name":"Maricel", "quantity":2}]`.
   - Compute `quantity = sum(item.quantity)`.
   - Compute `member = items.map(i => `${i.name} (${i.quantity})`).join(', ')`.
   - Store these formatted strings into the `transactions` table.

3. **Status Queue Progression (Portal Tracking)**:
   - When a ticket has members `"Maricel (1), Rakun (1)"`:
   - Initial status: `"pending"`.
   - When staff clicks finish for Maricel:
     `currentStatus = "pending"` -> updates to `"Maricel"`.
   - When staff clicks finish for Rakun:
     Check all members against completed members. If all done -> updates to `"complete"`.
     Otherwise -> updates to comma-separated list `"Maricel, Rakun"`.

4. **File Upload Security & Limits**:
   - Max file size: `5MB` (5242880 bytes).
   - Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`, `image/webp`.
   - Sanitize file names and store using a safe random token suffix (e.g. `original_8i9evaeanx.jpg`).

5. **Role-Based Access Control**:
   - `stellar_role === 'admin'`: Full access, including `/api/admin/users` and `/api/admin/settings`.
   - `stellar_role === 'member'`: Staff access to portal (Events, Members, Transactions, OTS, Tracking), but restricted from managing other staff roles or prices.

---

## 6. Prompt to Build the Fastify Backend

Copy and paste the prompt below into your AI assistant or agent to generate the complete Fastify backend:

````markdown
You are an expert backend engineer. Build a high-performance, robust backend server using Fastify with TypeScript to replace our existing PocketBase backend for "Stellar Luna" (an idol group booking, schedule, and Cheki ticketing portal).

### 1. Technology Stack
- **Framework**: Fastify v4 or v5 with TypeScript
- **Database & ORM**: PostgreSQL (or SQLite for local dev) using Prisma ORM or Drizzle ORM
- **Authentication**: `@fastify/jwt` and `bcryptjs`
- **File Uploads**: `@fastify/multipart` (5MB limit, disk storage under `uploads/`)
- **Static File Serving**: `@fastify/static`
- **CORS**: `@fastify/cors` (allow Next.js frontend origin)
- **Validation**: Zod with `fastify-type-provider-zod`
- **Real-time**: Server-Sent Events (SSE) or `@fastify/websocket` for transaction queue events

### 2. Database Schema
Implement the following entities with 15-character alphanumeric IDs (`nanoid(15)`):
1. **User**: `id`, `email` (unique), `passwordHash`, `name`, `avatar`, `stellarRole` ('admin' | 'member', default 'member'), `emailVisibility`, `verified`, `createdAt`, `updatedAt`
2. **Event**: `id`, `title`, `description`, `location`, `startDate`, `endDate`, `variant` ('primary' | 'success' | 'warning' | 'danger'), `status` ('active' | 'selling_fast' | 'pre_sale' | 'announced' | ''), `image`, `createdAt`, `updatedAt`
3. **Member**: `id`, `slug` (unique), `name`, `role`, `hobby`, `notes`, `birthdate`, `image`, `instagram`, `createdAt`, `updatedAt`
4. **Transaction**: `id`, `name`, `eventDate`, `member` (summary string), `quantity` (int), `receipt` (file path), `type` ('PO' | 'OTS'), `status` (string, default 'pending'), `notes`, `createdAt`, `updatedAt`
5. **ChekiPrice**: `id`, `type` ('po' | 'ots', unique), `price` (int), `createdAt`, `updatedAt`
6. **Listing**: `id`, `name`, `price` (int), `category`, `rating` (float), `description`, `image`, `images` (json array), `createdAt`, `updatedAt`

### 3. Required API Endpoints
Implement the following routes:
- **Auth**:
  - `POST /api/auth/login`: verifies email/password, returns `{ token, record: user }`
  - `POST /api/auth/refresh`: verifies JWT, returns fresh token and user record
  - `GET /api/auth/me`: returns current user profile
- **Admin**:
  - `GET /api/admin/users`: returns all users (admin only)
  - `PUT /api/admin/users`: updates `stellar_role` (admin only)
  - `GET /api/admin/settings`: returns Cheki prices for 'ots' and 'po' (defaults: 40000, 35000)
  - `PUT /api/admin/settings`: upserts 'ots' and 'po' prices (admin only)
- **Events**:
  - `GET /api/events`: returns events mapped to `{ id, title, description, startDate, endDate, variant }` sorted by `startDate`
  - `GET /api/events/raw`: returns full raw event records sorted by `startDate`
  - `POST /api/events/raw`: creates event
  - `PUT /api/events/raw`: updates event
  - `PATCH /api/events/raw`: partial update `{ id, status }`
  - `DELETE /api/events/raw?id=:id`: deletes event
- **Members**:
  - `GET /api/members/raw`: returns all members sorted by `name`
  - `GET /api/members/:slug`: returns single member by `slug`
  - `POST /api/members/raw`: multipart upload (`name, role, hobby, notes, birthdate, instagram, image`)
  - `PUT /api/members/raw`: multipart update
  - `DELETE /api/members/raw?id=:id`: deletes member
- **Transactions & Orders**:
  - `POST /api/payment`: multipart upload for Pre-Order (PO). Parses `name, eventDate, items (JSON array), notes, receipt (file)`. Calculates total `quantity` and `member` summary (`"Name (qty), ..."`). Sets `type: 'PO'`, `status: 'pending'`. Dispatches real-time 'create' event. Returns `{ success: true, transactionId }`.
  - `POST /api/ots`: JSON body for On-The-Spot (OTS). Parses `name, eventDate, items (JSON array), notes`. Sets `type: 'OTS'`, `status: 'confirmed'`. Dispatches real-time 'create' event. Returns `{ success: true, transactionId }`.
  - `GET /api/payment/status?id=:id`: returns safe status info (`id, name, member, quantity, eventDate, status, created`)
  - `GET /api/transactions/raw`: lists all transactions sorted by `createdAt DESC`
  - `PUT /api/transactions/raw`: updates transaction (specifically `status` string during queue tracking). Dispatches real-time 'update' event.
  - `DELETE /api/transactions/raw?id=:id`: deletes transaction. Dispatches real-time 'delete' event.
- **File Serving (PocketBase Compatible)**:
  - `GET /api/files/:collection/:id/:filename`: serves uploaded static images and receipts.
- **Real-Time Queue SSE**:
  - `GET /api/realtime`: Server-Sent Events endpoint streaming `{ action: 'create' | 'update' | 'delete', record }` to all connected portal clients.

### 4. Implementation Guidelines
- Modular architecture: `src/plugins/`, `src/modules/{auth,events,members,transactions,settings}/`, `src/utils/`
- Full TypeScript types for requests, replies, and database models.
- Seed script that initializes default prices (`po: 35000, ots: 40000`) and a superadmin account (`xemmo25@gmail.com`).
````
