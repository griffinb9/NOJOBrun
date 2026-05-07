# NOJOB — Job Application Assistant
## Product Specification

---

## Overview

A web application that helps students and new graduates manage their job search. Two core areas: a visual job application tracker and an AI-powered interview preparation tool. Built to feel warm and approachable, not corporate.

**Target users:** Students and new grads starting their first serious job search.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Drag and Drop | dnd-kit |
| Data persistence | localStorage (phase 1) |
| AI | Claude API (Anthropic) via `@anthropic-ai/sdk` |
| Icons | Lucide React |

**Auth:** None in MVP. All data stored in browser localStorage. Auth (NextAuth or Clerk) is a planned future phase.

---

## Design System

### Vibe
Friendly, approachable, and encouraging. The app should feel like it's rooting for you — not like a corporate HR tool. Rounded corners, generous spacing, warm tones, occasional personality in empty states and labels.

### Color Palette
- **Primary:** Violet/indigo (`#7C3AED` / `violet-600`) — calm, focused, modern
- **Accent:** Amber/warm yellow (`#F59E0B` / `amber-400`) — optimism, highlights
- **Background:** Warm off-white (`#FAFAF9` / `stone-50`)
- **Surface:** White with subtle shadow
- **Text:** `stone-800` (primary), `stone-500` (secondary/muted)
- **Status colors:**
  - Applied: Blue (`blue-500`)
  - Phone Screen / Interview: Violet (`violet-500`)
  - Offer: Green (`green-500`)
  - Rejected: Red (`red-400`)
  - Ghosted: Stone (`stone-400`)

### Typography
- Font: Inter (Google Fonts)
- Headings: `font-semibold`, tracking normal
- Body: `font-normal`, `text-sm` to `text-base`

### Component style
- Border radius: `rounded-xl` for cards, `rounded-lg` for inputs and buttons
- Shadows: soft (`shadow-sm`, `shadow-md`) — no harsh borders
- Buttons: filled primary (violet), ghost for secondary actions
- Kanban cards: white card with left-colored border strip indicating status

---

## Pages & Navigation

### Layout
- Persistent left sidebar on desktop
- Bottom tab bar on mobile
- App name + logo at top of sidebar
- Nav items: Dashboard, Job Tracker, Story Bank
- (Interview Prep is accessed from within a job card, not top-level nav)

### Pages

#### 1. Dashboard (`/`)
- **Purpose:** High-level view of the job search at a glance
- **Metric cards (top row):**
  - Total applications
  - Response rate (interviews / total apps)
  - Upcoming interviews (next 7 days)
  - Days since last application
- **Below metrics:**
  - Recent job cards (last 5 updated)
  - Quick-add job button
- **Empty state:** Friendly illustration + "Add your first application to get started"

#### 2. Job Tracker (`/tracker`)
- **Purpose:** Kanban board of all job applications
- **Columns:**
  1. Applied
  2. Phone Screen / Interview
  3. Offer
  4. Rejected
  5. Ghosted
- **Behavior:**
  - Drag cards between columns to update status
  - Each column shows a card count badge
  - "Add job" button at top of each column (or global FAB on mobile)
  - Clicking a card opens a detail drawer/modal

#### 3. Story Bank (`/story-bank`)
- **Purpose:** Library of the user's personal STAR stories used to generate personalized interview answers
- **Two ways to add stories:**
  1. **Resume import:** Paste full resume text → AI extracts 5–10 candidate stories
  2. **Manual entry:** Write a short story yourself (1–3 sentences of context), AI formats into STAR
- **Story card fields:**
  - Title (e.g. "Led redesign of student portal")
  - Situation / Task / Action / Result (editable)
  - Tags (e.g. Leadership, Teamwork, Problem Solving, Technical)
- **Usage:** Stories are automatically available when generating STAR answers in Interview Prep

#### 4. Interview Prep (`/prep/[jobId]`)
- **Purpose:** AI-generated interview prep content for a specific job
- **Accessed from:** A "Prep for Interview" button on any job card
- **Context auto-loaded from job card:** Company name, role title, job description
- **Generated sections:**
  - **Tell Me About Yourself** — 2–3 paragraph narrative tailored to the role
  - **Why This Company** — 2–3 specific, researched-feeling talking points
  - **Why This Role** — Bridges user's background to this specific position
  - **Likely Interview Questions** — 8–12 role-specific questions, grouped by category (behavioral, technical, situational)
  - **STAR Answers** — For each behavioral question, matches a story from the Story Bank and formats a full STAR answer
- **UX:**
  - Sections generate one at a time (streamed)
  - Each section has a "Regenerate" button
  - User can edit any generated text inline
  - "Copy" button on each section

---

## Job Card

Each job application is a card with the following fields:

| Field | Type | Notes |
|---|---|---|
| Company | Text | Required |
| Role / Title | Text | Required |
| Location | Text | e.g. "San Francisco, CA" or "Remote" |
| Salary / Comp | Text | Optional, free-form (e.g. "$120k–$140k") |
| Status | Enum | Applied, Phone Screen / Interview, Offer, Rejected, Ghosted |
| Date Applied | Date | |
| Interview Date(s) | Date(s) | Multiple allowed |
| Job URL | URL | Link to the original posting |
| Job Description | Long text | Pasted JD — used by AI features |
| Notes | Long text | Free-form notes |
| Contact Name | Text | Recruiter or hiring manager |
| Contact Email | Email | For follow-up email generation |

### Job Card Detail View (drawer/modal)
Tabs:
1. **Details** — all fields above, editable
2. **Emails** — AI-generated follow-up email drafts
3. **Interview Prep** — shortcut into the prep page for this job

---

## AI Features

### Follow-up Email Generator
- Located in the "Emails" tab of a job card
- **Types of emails (MVP):**
  1. **Post-interview thank-you** — warm, specific thank-you email after a screen or interview
  2. **Status check-in** — polite follow-up when no response after ~1 week
- **Context used:** Company, role, interviewer name (if provided), interview date, notes
- **UX:** Click "Generate" → streamed output → editable textarea → "Copy to clipboard"

### Interview Prep Generator
- **Context used:** Job description, company, role, Story Bank
- **Prompt strategy:** System prompt establishes the user's background; each section is a separate API call
- **Streaming:** Each section streams as it generates

### Story Bank Extractor
- User pastes resume text
- Claude extracts experiences and returns structured story objects (title + STAR breakdown)
- User reviews, edits, and saves

---

## Data Model (localStorage)

```typescript
interface Job {
  id: string;
  company: string;
  role: string;
  location?: string;
  salary?: string;
  status: 'applied' | 'interviewing' | 'offer' | 'rejected' | 'ghosted';
  dateApplied?: string; // ISO date
  interviewDates?: string[];
  jobUrl?: string;
  jobDescription?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

interface Story {
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  jobs: Job[];
  stories: Story[];
  settings: {
    anthropicApiKey?: string; // user-provided key stored locally
  };
}
```

---

## Settings

A settings modal (not a full page) accessible from the sidebar:
- **Anthropic API Key** — user pastes their own key; stored in localStorage only
- (Future: theme toggle, data export/import as JSON)

---

## Kanban UX Details

- Columns are fixed (not user-customizable in MVP)
- Cards within a column are sorted by `updatedAt` descending
- Drag and drop powered by `dnd-kit`
- On mobile: no drag-and-drop; status is changed via a dropdown on the card detail
- Card front (summary view) shows: company, role, date applied, status color strip, interview date badge (if upcoming)

---

## Mobile Layout

- Bottom navigation bar: Dashboard, Tracker, Story Bank, (Settings icon)
- Kanban board on mobile: horizontal scroll between columns, or a single-column list view with status filter chips
- Job card detail: full-screen sheet instead of side drawer
- AI content: same generation flow, scrollable

---

## MVP Scope (Phase 1)

**In scope:**
- Full job CRUD with all fields
- Kanban board with drag-and-drop (desktop) and status change (mobile)
- Dashboard with 4 metric cards and recent jobs
- Story Bank with resume extraction and manual entry
- Interview prep generation for a job (all sections)
- AI follow-up emails: thank-you + check-in
- Settings modal with API key input

**Out of scope (future phases):**
- User accounts / auth / cloud sync
- Offer / rejected / wishlist email types
- Calendar integration for interview dates
- Browser extension to auto-fill job details
- Export to PDF / CSV
- Shared prep packs

---

## File Structure (Planned)

```
/app
  /page.tsx                    → Dashboard
  /tracker/page.tsx            → Kanban board
  /story-bank/page.tsx         → Story bank
  /prep/[jobId]/page.tsx       → Interview prep
  /api/ai/
    /emails/route.ts           → Email generation endpoint
    /prep/route.ts             → Interview prep endpoint
    /stories/route.ts          → Resume story extraction endpoint
/components
  /ui/                         → shadcn primitives
  /jobs/
    KanbanBoard.tsx
    KanbanColumn.tsx
    JobCard.tsx
    JobDetailDrawer.tsx
    JobForm.tsx
  /prep/
    PrepSection.tsx
    PrepPage.tsx
  /stories/
    StoryCard.tsx
    StoryForm.tsx
    ResumeImport.tsx
  /emails/
    EmailGenerator.tsx
  /dashboard/
    MetricCard.tsx
    RecentJobs.tsx
  /layout/
    Sidebar.tsx
    MobileNav.tsx
/lib
  /storage.ts                  → localStorage read/write helpers
  /ai.ts                       → Claude API client and prompt builders
  /types.ts                    → Shared TypeScript types
```

---

*Last updated: 2026-05-07*
