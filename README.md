# Dental Clinic Appointment System

Appointment and patient-record system for a single-dentist clinic (Dr Manal Nahleh).
Primary goal: **save time** by moving appointments and patient records out of manual handling.

## Stack

- Next.js (TypeScript)
- Prisma 7 + PostgreSQL
- Local dev on Ubuntu (WSL), PostgreSQL installed directly (no Docker)

## Getting started

```bash
git clone <repo-url>
cd dental-clinic
npm install
cp .env.example .env        # then fill in your own values
npx prisma generate         # Prisma 7 does not generate automatically
npx prisma migrate dev      # create/update the database schema
npx prisma db seed          # load fake data and run constraint checks
npm run dev
```

### Environment variables

All variables are documented in `.env.example`. The real `.env` is never committed.

| Variable       | Purpose                                  |
| -------------- | ---------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string             |

## Database

- Schema: `prisma/schema.prisma` (Dentist, Patient, Appointment, HealthReport, ReportNote)
- Migrations: `prisma/migrations/`. The init migration also contains hand-written SQL that Prisma cannot express:
  - exclusion constraint that blocks overlapping `SCHEDULED` appointments
  - `CHECK` constraints for time order, cancel consistency and lowercase dentist emails
- Seed: `prisma/seed.ts` creates fake data and verifies every constraint is enforced (rejected writes are expected).
- **Never edit an applied migration.** Add a new one.

## Branch naming

`<type>/<short-kebab-description>`

| Type        | Use for                          | Example                        |
| ----------- | -------------------------------- | ------------------------------ |
| `feature/`  | new functionality                | `feature/weekly-schedule`      |
| `fix/`      | bug fixes                        | `fix/overlap-error-message`    |
| `chore/`    | tooling, config, dependencies    | `chore/env-example`            |
| `docs/`     | documentation only               | `docs/readme-conventions`      |

`main` is protected: no direct pushes, everything goes through a pull request.

## Commit messages

Short imperative subject, optionally prefixed with the type:

```
feature: add weekly schedule query
fix: return 409 when appointment slot is taken
```

## Pull request rules

1. One branch = one focused change. Keep PRs small enough to review in one sitting.
2. Fill in the PR template (what, why, how it was tested).
3. Link the board card the PR closes.
4. The branch is up to date with `main` and builds locally.
5. At least one review before merge (self-review of the diff counts when working solo).
6. Squash-merge, then delete the branch.

## Definition of done

A card is done only when **all** of these are true:

- [ ] Behaviour matches the requirement on the card (FR/NFR reference in the PR)
- [ ] `npx tsc --noEmit` and the linter pass
- [ ] Database changes are in a migration, and `npx prisma db seed` still reports "All checks passed"
- [ ] The feature was exercised manually (happy path plus at least one failure case)
- [ ] No secrets, tokens or real patient data in the diff
- [ ] README or `.env.example` updated if setup changed
- [ ] PR reviewed, merged into `main`, branch deleted

## Secrets hygiene

- `.env` and `.env.*` are git-ignored; only `.env.example` (placeholders, no real values) is committed.
- Never paste a connection string or password into an issue, PR, chat or screenshot.
- If a secret is ever committed, treat it as leaked: rotate it first, then clean the history.
- Seed data is fake. Never load real patient data into a development database.
