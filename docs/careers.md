# Careers

## Overview

The careers section has three public routes:

- `/careers`
- `/careers/[slug]`
- `/careers/[slug]/apply`

Public job content is repo-managed under `content/careers/`. Supabase is only used for submitted applications in `public.job_applications`.

## Source Of Truth

Add one Markdown or MDX file per role in `content/careers/`.

Each file uses frontmatter for listing metadata and screening questions, followed by the full job body. The canonical slug is derived from the frontmatter `title`.

If you change the title:

- the card title changes
- the job page title changes
- the apply page title changes
- the canonical slug changes
- the job URL changes
- the application URL changes
- share text changes

Old URLs are not preserved automatically in this version.

## Frontmatter Schema

Minimum frontmatter fields:

- `title`
- `team`
- `employmentType`
- `location`
- `compensation`
- `status`
- `applicationMode`
- `summary`
- `screeningQuestions`

Supported values:

- `employmentType`: `Full-time`, `Part-time`, `Contract`, `Fractional`
- `status`: `draft`, `open`, `closed`
- `applicationMode`: `native`, `external`

Example:

```md
---
title: QA Engineer
team: Engineering
employmentType: Contract
location: Remote
compensation: Contract scope based on launch and release cadence
status: open
applicationMode: native
summary: Own release quality before, during, and after production launch across wallet, SDK, resolver, app, and docs flows.
postedAt: 2026-06-28T00:00:00.000Z
updatedAt: 2026-06-29T00:00:00.000Z
screeningQuestions:
  - id: release-risk
    prompt: Describe a release or regression you caught before users saw it.
    placeholder: What was the risk, how did you find it, and what changed after?
    required: true
    maxLength: 1200
---
```

## Editing Job Content

Update the body of the file to change the public job page. You can add new sections without changing code.

Current renderer behavior:

- `Purpose` sections are suppressed on job detail pages
- `##` and `###` headings receive careers-specific styling
- list sections get icon styles by section name
- unrecognized sections still render normally

## Supabase Setup

Run this SQL file in Supabase:

- `sql/careers_jobs_and_applications.sql`

That script creates only `public.job_applications`.

Without that table:

- public careers pages still render normally
- native applications will not persist

If you want to remove the old public jobs table, run:

- `sql/careers_legacy_jobs_cleanup.sql`
