# Frontend Integration Guide

Backend: **Fastify** (`fastify-decorators`). Every controller route is mounted under the global prefix `/api`.

## Base URL & Auth

- Base URL: `http://<host>:<port>/api` (default `http://127.0.0.1:3000/api`)
- **Every `/api` route requires an API key header**:

```
x-api-key: <API_KEY>
```

Set from the backend `API_KEY` env var. Missing/wrong key → `401 { "error": "Invalid or missing API key" }`.

> JWT (`@fastify/jwt`) is currently **commented out** in `src/index.ts`. So `/auth/login` returns a token, but `/auth/refresh` and `/auth/me` (which call `request.jwtVerify()`) will fail until JWT is re-enabled. The only auth gate actually enforced right now is the API key.

### Suggested fetch wrapper

```js
const BASE = "http://127.0.0.1:3000/api";
const API_KEY = import.meta.env.VITE_API_KEY;

async function api(path, { method = "GET", body, isForm = false } = {}) {
  const headers = { "x-api-key": API_KEY };
  if (!isForm && body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}
```

---

## Endpoint Reference

### Auth — `auth.controller.ts`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/auth/login` | `{ "email": "a@b.com", "password": "..." }` | `email` or `identity` accepted |
| POST | `/api/auth/refresh` | – | Needs `Authorization: Bearer <token>` (JWT disabled → currently 401) |
| GET  | `/api/auth/me` | – | Needs Bearer token (JWT disabled → currently 401) |
| POST | `/api/auth/logout` | – | Returns `{ "success": true }` |

Login request:
```json
{ "email": "admin@stellarluna.com", "password": "yourpassword" }
```
Login response:
```json
{
  "token": "<jwt>",
  "record": {
    "id": 1, "email": "admin@stellarluna.com", "name": "Admin",
    "avatar": "", "stellar_role": "admin",
    "emailVisibility": false, "verified": false,
    "created": "2026-01-01T00:00:00.000Z", "updated": "2026-01-01T00:00:00.000Z"
  }
}
```

### Users — `user.controller.ts`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/users/` | – (list all) |
| GET | `/api/users/:id` | – (single, 404 if missing) |

### Admin Users — `admin-user.controller.ts`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/admin/users/` | – (list staff) |
| PUT | `/api/admin/users/` | update role (below) |

```json
{ "id": "3", "stellar_role": "admin" }
```
`stellarRole` is also accepted. Role must be `"admin"` or `"member"`.

### Events — `event.controller.ts`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/events/` | – (list all) |
| GET | `/api/events/calendar` | – (calendar shape) |
| POST | `/api/events/` | event body (create) |
| PUT | `/api/events/` | event body + `id` (replace) |
| PATCH | `/api/events/` | event body + `id` (partial) |
| DELETE | `/api/events/?id=<id>` | id via **query string** |

Create body (both `start_date`/`startDate` snake & camel accepted):
```json
{
  "title": "Live Concert",
  "description": "Spring show",
  "location": "Tokyo Dome",
  "start_date": "2026-04-01T18:00:00.000Z",
  "end_date": "2026-04-01T21:00:00.000Z",
  "link": "https://example.com/tickets",
  "status": "published",
  "image": "concert.jpg"
}
```
Update/Patch: same body plus `"id": "5"` (required, else 400).

Response (`toJSON`): `id, title, description, location, start_date, end_date, link, status, image, created, updated`.

### Members — `member.controller.ts`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/members/` | – (list all) |
| GET | `/api/members/:slug` | – (single by slug, 404 if missing) |
| POST | `/api/members/` | multipart **or** JSON (create) |
| PUT | `/api/members/` | multipart **or** JSON + `id` (update) |
| DELETE | `/api/members/?id=<id>` | id via query string |

Accepts `multipart/form-data` (for image upload) or plain JSON. Fields:
```
name, slug, role, hobby, notes, birthdate, instagram, image
```
JSON create:
```json
{
  "name": "Luna", "slug": "luna", "role": "Vocalist",
  "hobby": "Singing", "notes": "", "birthdate": "2000-05-01",
  "instagram": "@luna", "image": "luna.jpg"
}
```
Multipart create (file field = image, rest are text fields):
```js
const fd = new FormData();
fd.append("name", "Luna");
fd.append("slug", "luna");
fd.append("role", "Vocalist");
fd.append("image", fileInput.files[0]); // uploaded & saved under member id
await api("/members/", { method: "POST", body: fd, isForm: true });
```
PUT requires `id` in the form/JSON (400 otherwise).

### Pre-Order Payment — `payment.controller.ts`

| Method | Path | Body |
|--------|------|------|
| POST | `/api/payment/` | multipart or JSON (creates PO transaction) |
| GET | `/api/payment/status?id=<id>` | – |

Required fields: `name`, `eventDate` (or `event_date`), `items`. Optional `notes`, `receipt` (file).
`items` is a JSON string (or array) of `{ name, quantity }`:
```js
const fd = new FormData();
fd.append("name", "Jane Doe");
fd.append("eventDate", "2026-04-01");
fd.append("items", JSON.stringify([{ name: "Cheki A", quantity: 2 }]));
fd.append("notes", "front row");
fd.append("receipt", receiptFile); // optional proof-of-payment image
await api("/payment/", { method: "POST", body: fd, isForm: true });
```
JSON equivalent:
```json
{
  "name": "Jane Doe",
  "eventDate": "2026-04-01",
  "items": "[{\"name\":\"Cheki A\",\"quantity\":2}]",
  "notes": "front row"
}
```
Response: `{ "success": true, "transactionId": 12, "id": 12, "record": { ...transaction } }`. PO status starts as `"pending"`.

Status check response:
```json
{ "success": true, "data": { "id": 12, "name": "Jane Doe", "member": "Cheki A (2)", "quantity": 2, "eventDate": "2026-04-01", "status": "pending", "created": "..." } }
```

### On-The-Spot (OTS) — `ots.controller.ts`

| Method | Path | Body |
|--------|------|------|
| POST | `/api/ots/` | JSON or multipart (no file) |

Same required fields as payment (`name`, `eventDate`, `items`), no receipt. OTS status starts as `"confirmed"`.
```json
{
  "name": "Walk-in Guest",
  "eventDate": "2026-04-01",
  "items": "[{\"name\":\"Cheki B\",\"quantity\":1}]",
  "notes": ""
}
```

### Transactions — `transaction.controller.ts`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/transactions/` | – (all, newest first) |
| PUT | `/api/transactions/` | update + `id` |
| DELETE | `/api/transactions/?id=<id>` | id via query string |

Update body (only provided fields change; `id` required):
```json
{ "id": "12", "status": "confirmed", "notes": "paid" }
```
Updatable: `status, name, eventDate, member, notes`.

Transaction `toJSON`: `id, name, event_date, member, quantity, receipt, type, status, notes, created, updated`.

### Settings (Cheki prices) — `setting.controller.ts`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/admin/settings/` | – |
| PUT | `/api/admin/settings/` | price update |

Flexible body — either per-type or combined:
```json
{ "po": 15000, "ots": 20000 }
```
or
```json
{ "type": "po", "price": 15000 }
```

### Files — `file.controller.ts`

| Method | Path | Body |
|--------|------|------|
| POST | `/api/files/upload` | multipart, single file field |
| GET | `/api/files/` | – (list) |
| GET | `/api/files/:filename` | – (serves file; SVG placeholder for missing images) |

Upload:
```js
const fd = new FormData();
fd.append("file", fileInput.files[0]);
const { filename, url } = await api("/files/upload", { method: "POST", body: fd, isForm: true });
// url => "/api/files/<filename>" ; render via <img src={BASE_ORIGIN + url}>
```
Max upload size: **5 MB** (`@fastify/multipart` limit).

### Realtime (SSE) — `realtime.controller.ts`

| Method | Path |
|--------|------|
| GET | `/api/realtime/` |

Server-Sent Events stream. Emits a `connected` event, 15s keep-alive pings, and a `data:` message on every transaction create/update/delete.

```js
// EventSource cannot set custom headers, so pass the key as a query param
// ONLY if your deployment allows it; otherwise proxy the SSE through your own server.
const es = new EventSource(`${BASE}/realtime/`);
es.addEventListener("connected", () => console.log("SSE connected"));
es.onmessage = (e) => {
  const { action, record } = JSON.parse(e.data); // action: create | update | delete
  console.log(action, record);
};
```

> **Caveat:** the API-key `onRequest` hook also guards `/api/realtime/`, and the browser `EventSource` API cannot send an `x-api-key` header. To consume SSE from a browser you must either loosen the guard for this route, accept the key via query string, or proxy the stream through your own frontend server that adds the header. Verify which approach your deployment uses.

---

## Common Conventions

- **Create/update bodies POST/PUT/PATCH to the collection root `/`** (no `:id` in the path).
- **Delete uses a query string** `?id=<id>`, not a path param.
- IDs in bodies are often sent as strings (`"12"`) and coerced with `Number()` server-side.
- Many entities expose both snake_case and camelCase input keys (`start_date`/`startDate`, `event_date`/`eventDate`, `stellar_role`/`stellarRole`).
- Error shape is consistently `{ "error": "message" }` with an appropriate 4xx/5xx status.
