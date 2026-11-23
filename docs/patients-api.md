# Patients API

Status: implemented, manually tested against the Railway database. No authentication yet (login card #2).

## 1. Overview

The patients resource is the first resource built end to end. It lets the clinic create a patient profile, search patients by name or phone, and fetch one patient.

| Method | Path | Purpose | Success |
| ------ | ---- | ------- | ------- |
| POST | `/api/patients` | Create a patient profile | 201 |
| GET | `/api/patients?q=&limit=&offset=` | Search patients (name or phone) | 200 |
| GET | `/api/patients/:id` | Fetch one patient | 200 |

Backlog cards: #3 (create patient profile), #4 (search patients by name or phone).

## 2. Architecture

Each request passes through three layers. A layer only talks to the one below it.

```
HTTP request
   |
   v
Route      src/app/api/patients/route.ts, [id]/route.ts
           HTTP only: parse input, validate with zod, call the service, return JSON
   |
   v
Service    src/modules/patients/patient.service.ts
           Business rules only. Depends on the PatientRepository interface.
   |
   v
Repository src/modules/patients/patient.repository.ts
           Database queries only. The only patients file that imports Prisma.
   |
   v
PostgreSQL (Railway)
```

| Layer | Knows about | Does not know about |
| ----- | ----------- | ------------------- |
| Route | HTTP, zod schemas, the service | Prisma, SQL |
| Service | Business rules, the repository interface, domain errors | HTTP, Prisma |
| Repository | Prisma | HTTP, business rules, validation |

Why the service depends on an interface: the service can be unit-tested with a fake repository, and the database can change without touching the rules.

### File map

```
src/
  lib/
    prisma.ts        one shared PrismaClient (TLS validation on)
    errors.ts        AppError, NotFoundError, ConflictError
    http.ts          handleError(): maps any thrown error to a JSON response
  modules/patients/
    patient.schema.ts      zod schemas + input types
    patient.repository.ts  PatientRepository interface + Prisma implementation
    patient.service.ts     PatientService (business rules)
    index.ts               wires the real repository into the service
  app/api/patients/
    route.ts               POST (create), GET (search)
    [id]/route.ts          GET (by id)
```

## 3. Endpoints

### POST /api/patients

Creates a patient profile.

Request body (JSON):

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `first_name` | string | yes | trimmed, 1 to 100 characters |
| `last_name` | string | yes | trimmed, 1 to 100 characters |
| `phone_number` | string | yes | trimmed, matches `^\+?[0-9 ()-]{6,30}$` |
| `email` | string or null | no | valid email, lowercased, max 255 |
| `date_of_birth` | string | yes | `YYYY-MM-DD`, a real calendar date, not in the future, year 1900 or later |
| `medical_alerts` | string | no | trimmed, max 2000, defaults to `""` |

Unknown fields in the body are ignored (stripped by zod).

Example:

```bash
curl -i -X POST localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","phone_number":"+961 70 000 000","date_of_birth":"1990-05-01"}'
```

Response `201 Created`:

```json
{
  "id": "070ec24a-e6c5-4b96-906a-bce8f6d03148",
  "first_name": "Test",
  "last_name": "User",
  "phone_number": "+961 70 000 000",
  "email": null,
  "date_of_birth": "1990-05-01T00:00:00.000Z",
  "medical_alerts": "",
  "created_at": "2026-10-26T17:43:00.000Z",
  "updated_at": "2026-10-26T17:43:00.000Z"
}
```

Business rule: the same person cannot be registered twice. A patient with the same first name, last name (case-insensitive) and date of birth returns `409`.

### GET /api/patients

Searches patients. Without `q`, it lists all patients.

Query parameters:

| Param | Type | Default | Rules |
| ----- | ---- | ------- | ----- |
| `q` | string | none | trimmed, max 100 |
| `limit` | integer | 20 | 1 to 100 |
| `offset` | integer | 0 | 0 or more |

Matching: `q` is matched with "contains" against first name, last name (both case-insensitive) and phone number (as stored, so `70 123` matches `+961 70 123 456` but `7012` does not). Results are ordered by last name, then first name.

Example:

```bash
curl "localhost:3000/api/patients?q=haddad&limit=10"
```

Response `200 OK`:

```json
{
  "items": [ { "id": "...", "first_name": "Maya", "last_name": "Haddad", "...": "..." } ],
  "total": 2,
  "limit": 10,
  "offset": 0
}
```

`total` is the number of matches across all pages, so a client can build pagination.

### GET /api/patients/:id

Fetches one patient by id.

- `:id` must be a UUID, otherwise `400`.
- Unknown id returns `404`.

Response `200 OK`: the patient object, same shape as the create response.

## 4. Errors

Every error uses the same JSON shape, built in one place (`src/lib/http.ts`):

```json
{ "error": "VALIDATION_ERROR", "message": "Invalid input", "details": [ { "field": "first_name", "message": "Required" } ] }
```

`details` is present only for validation errors.

| Status | `error` code | When |
| ------ | ------------ | ---- |
| 400 | `VALIDATION_ERROR` | Body, query string or id failed validation |
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 404 | `NOT_FOUND` | Patient id does not exist |
| 409 | `CONFLICT` | Duplicate patient (same name and date of birth) |
| 500 | `INTERNAL_ERROR` | Anything unexpected. The client gets a generic message; the real error is logged on the server only. |

## 5. Database

Table `patients` (Prisma model `Patient`):

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | uuid | primary key, generated by the database |
| `first_name`, `last_name` | varchar(100) | required |
| `phone_number` | varchar(30) | required |
| `email` | varchar(255) | optional |
| `date_of_birth` | date | required |
| `medical_alerts` | text | required, defaults to empty string |
| `created_at`, `updated_at` | timestamptz | both default to now; `updated_at` is also maintained by Prisma on writes |

Indexes: `idx_patients_name (last_name, first_name)` and `idx_patients_phone (phone_number)`. A "contains" search (`ILIKE '%q%'`) cannot use these btree indexes, which is fine at clinic size. If the table grows, add a `pg_trgm` index.

## 6. Configuration

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `DB_CA_CERT` | Certificate chain of the database server. When set, the app validates TLS against it and removes `sslmode` from the URL so it cannot override the setting. |

`rejectUnauthorized: false` is used only in `prisma/seed.ts` (dev only, guarded against `NODE_ENV=production`). It must never be copied into the app connection.

## 7. Testing

Manual checks that were run against the Railway database:

| Request | Expected | Result |
| ------- | -------- | ------ |
| Create a valid patient | 201 | passed |
| Create the same patient again | 409 | passed |
| Empty name, bad phone, future date of birth | 400 with field errors | passed |
| `date_of_birth` = `2000-02-31` | 400 | passed |
| Search `q=haddad` | 200 | passed |
| Get by valid id | 200 | passed |
| Get `not-a-uuid` | 400 | passed |
| Get unknown valid UUID | 404 | passed |

Seed data (`npx prisma db seed`) provides fake patients for search tests and ends with "All checks passed".

## 8. Known limitations

- **No authentication or authorization.** All three routes are open until login (card #2) lands. Do not deploy before then.
- **No update or delete** for patients yet.
- **Duplicate check is not enforced by the database.** It is a service-level check, so two simultaneous creates of the same person could both succeed. A unique index on `(lower(first_name), lower(last_name), date_of_birth)` would close this gap.
- **Phone numbers are not normalized**, so `+961 70 111 222` and `70111222` are different strings.
- **No automated tests yet.** A unit test for `PatientService` with a fake repository is the next step.
- **No logging yet** (planned next).
