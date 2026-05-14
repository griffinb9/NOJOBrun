# Claude Cowork Guide for NOJOB
*Extracted from YouTube transcript + translated for your specific app*

---

## Part 1: The 7 Core Cowork Concepts (Plain English)

The video covers seven capabilities that make Cowork fundamentally different from Claude Chat:

1. **Local file access** — Cowork reads and writes directly to files on your computer. No 20-file limit, no 30MB cap. It can process your entire codebase at once.
2. **Persistent memory** — Cowork saves what it learns about you and your project into `CLAUDE.md` and `MEMORY.md` files. Every new session picks up where the last left off.
3. **Connectors** — Cowork can reach into external tools (Gmail, Notion, Google Drive, etc.) and act inside them directly.
4. **Skills** — Reusable, multi-step workflows you teach Cowork once and it repeats perfectly every time.
5. **Projects** — Like Claude Chat projects but Cowork can write directly to the project's knowledge files without you doing it manually.
6. **Browser extension handoff** — Cowork can hand tasks to the Claude browser extension (currently unreliable — avoid for now).
7. **Scheduled tasks** — Automated recurring work that runs on a timer, pulling from your connectors and memory.

The most important mindset shift: **Chat uses task-first language. Cowork uses outcome-first language.**

| Chat prompt | Cowork prompt |
|---|---|
| "Review my job tracker and suggest improvements" | "The achievements page in NOJOB is missing empty states. Add a locked achievement card UI for achievements the user hasn't earned yet. Constraints: must use existing Tailwind classes, must not touch Supabase schema, match the existing card component style." |

---

## Part 2: NOJOB-Specific Rules (One Per Concept)

### Rule 1 — Local File Access
**Always point Cowork at your NOJOB project root** (`/Desktop/NOJOB`), not a subfolder. Cowork needs to see the full tree — components, Supabase functions, Capacitor config, and all — so it can understand how pieces connect before touching anything.

> If you point it at just `/components`, it won't know about your Supabase schema and may generate code that breaks queries.

### Rule 2 — Persistent Memory (CLAUDE.md)
**Your `CLAUDE.md` is the single source of truth for NOJOB.** It should contain:
- Tech stack: frontend framework, Supabase (auth + DB), Capacitor for mobile
- Database table names and key relationships (e.g., `applications`, `users`, `achievements`, `friends`)
- Naming conventions for components, files, and database columns
- The gamification rules (how points are calculated, what triggers achievements, how streak logic works)
- UI/design language (color tokens, component library, spacing system)

After any significant session, tell Cowork: *"Save what you learned about NOJOB's architecture to CLAUDE.md and update MEMORY.md with any preferences I expressed."*

### Rule 3 — Connectors
**Connect GitHub** so Cowork can read your commit history and branch state before suggesting changes. If you ever connect Supabase via a custom MCP, it can run read-only queries to verify schema before generating migrations. For now, keep your Supabase schema exported as a markdown or SQL file inside the NOJOB folder so Cowork always has it.

### Rule 4 — Skills
**Build a skill for every repeating NOJOB task.** The three you need most:
- `add-achievement`: adds a new achievement type end-to-end (DB row, trigger logic, UI card, unlock condition)
- `add-job-status`: adds a new application status column value and updates the tracker UI
- `new-dashboard-widget`: scaffolds a new card component, wires it to Supabase, and places it on the dashboard

Don't create these from scratch in Cowork. Do the full workflow once manually with Cowork, then at the end say: *"Go back through our conversation and create a skill that captures this entire workflow."*

### Rule 5 — Projects
**Create a NOJOB Cowork project.** Inside it, store:
- Your schema file
- Your achievement definitions list
- Your brand/design tokens
- Any recurring context you'd otherwise paste at the start of every session

When Cowork learns something new mid-session, say: *"Codify this under the NOJOB project knowledge."*

### Rule 6 — Guard Rails (Critical for a live app)
Because NOJOB has real users and a live Supabase database, your guard rail instructions must be strict:

```
Before deleting, overwriting, or renaming any existing file, show me what will change and wait for my confirmation.
Never modify any Supabase migration files without showing me the full diff first.
Never touch the auth flow (login, signup, session handling) without explicit permission.
For any database change, show me the before/after schema and list all components that query the affected table.
Always outline your plan and wait for my approval before executing multi-step tasks.
```

### Rule 7 — Scheduled Tasks
Once your NOJOB workflow is stable, consider automating:
- Weekly summary of new features shipped (reads git log, writes a changelog entry)
- Weekly check for unused Supabase columns or orphaned achievement definitions
- Daily prompt to review any flagged/stalled job applications in the tracker (if you're a user of your own app)

---

## Part 3: Workflow for Adding a New Feature Safely

Use this sequence every time you add something new to NOJOB (e.g., a new achievement, a leaderboard filter, a streak bonus mechanic).

**Step 1 — Context load**
Start your session with:
> "Load CLAUDE.md and MEMORY.md. I want to add [feature name]. Before you touch anything, read the relevant files and tell me: what components will be affected, what Supabase tables are involved, and what could break."

**Step 2 — Plan approval**
Cowork will outline a plan. Read it. If anything touches auth, migrations, or shared components used across multiple pages — ask it to scope down or split into phases.

**Step 3 — Isolated build**
> "Build this feature in isolation first. Create the component but don't wire it into the router or dashboard yet. Show me the output."

**Step 4 — Integration**
> "The component looks good. Now wire it into [specific page]. Show me every file you'll modify before making changes."

**Step 5 — Mobile check**
> "This app runs on mobile via Capacitor. Check whether this change has any mobile-specific implications — touch targets, viewport behavior, or any Capacitor plugin conflicts."

**Step 6 — Memory update**
> "Save what you learned about this feature to CLAUDE.md. Note the component name, the Supabase table it reads from, and any edge cases we discussed."

---

## Part 4: Workflow for UI/UX Improvements

Use this when you want to improve how something looks or feels (e.g., better achievement card animations, cleaner dashboard layout, improved streak display).

**Step 1 — Describe the outcome, not the task**
Bad: *"Make the achievement page look better."*
Good: *"The achievement page feels flat. I want locked achievements to look visually distinct — grayed out with a lock icon — and earned achievements to have a subtle glow or badge. Constraints: no new dependencies, use existing Tailwind classes, don't change the data-fetching logic."*

**Step 2 — Scope to one component**
> "Limit this change to `AchievementCard.jsx` only. Don't touch the page layout or any parent components."

**Step 3 — Iterate in isolation**
> "Show me the updated component as a standalone preview. Don't integrate it yet."

**Step 4 — Mobile review**
> "Before we integrate: does this component have any issues on a 390px mobile viewport? Check touch target sizes and text overflow."

**Step 5 — Integrate with confirmation**
> "I'm happy with the design. Integrate it. Show me every file you'll change and wait for my go-ahead."

**Step 6 — Skill candidate**
If this is a pattern you'll repeat (e.g., adding visual states to cards), say:
> "Turn this into a 'polish-card-component' skill I can reuse for other cards."

---

## Part 5: Workflow for Database / Supabase Changes

This is the highest-risk workflow. Follow it strictly.

**Step 1 — Schema read**
> "Read the current Supabase schema from [schema file path]. Don't make any changes yet. Tell me the current structure of [table name] and list every component in the codebase that queries it."

**Step 2 — Change proposal**
> "I want to add [column/table/relationship]. Write the migration SQL and explain: what it adds, whether it's nullable or has a default, whether any existing rows need backfilling, and which components need to be updated to handle the new field."

**Step 3 — Impact review**
Read Cowork's impact list carefully. If it flags a component you didn't expect — stop and understand why before proceeding.

**Step 4 — Migration file only**
> "Write the migration file only. Don't touch any frontend components yet. Save it to `/supabase/migrations/` with today's date prefix. Show me the file before saving."

**Step 5 — Frontend updates**
> "The migration is applied. Now update the frontend components you listed. Change them one at a time and show me each diff."

**Step 6 — RLS check**
> "Check whether this new table or column needs a Row Level Security policy. If so, propose the policy and explain who it grants access to and why."

**Step 7 — Mobile sync**
> "Does this schema change affect any Capacitor offline caching or local storage logic? Check."

---

## Part 6: Reusable Example Prompts

Copy, adapt, and reuse these.

**Feature addition**
> "Load CLAUDE.md. I want to add [feature] to NOJOB. Before touching anything: read the relevant components and schema, tell me what's affected, propose a plan, and wait for my approval."

**Achievement system expansion**
> "I want to add a new achievement called '[Name]'. It should trigger when a user [condition]. Read the existing achievement definitions, show me the pattern, then add the new one — DB row, unlock logic, and UI card — in that order, waiting for approval at each step."

**Streak feature update**
> "The application streak feature needs to [change]. Read `streak` logic across all files first. Show me every place streak is calculated or displayed. Then propose the change with a full diff."

**Dashboard widget**
> "Add a new dashboard widget that shows [metric]. It should read from [table]. Use the same card component pattern as the existing widgets. Don't modify any existing widgets. Show me the plan first."

**Friends/leaderboard update**
> "I want to change how the leaderboard ranks users. Currently it uses [current logic]. I want to switch to [new logic]. Read all files that touch the leaderboard or friends system. Tell me the impact before writing a single line of code."

**UI polish**
> "The [component] on [page] feels off on mobile. Read the component, check it against a 390px viewport mentally, and propose specific Tailwind changes to fix spacing, font size, and touch targets. No logic changes."

**Supabase migration**
> "I need to add [column] to the [table] table. Read the schema, list every component that queries this table, write the migration SQL, and show me the full plan before doing anything."

**Memory update**
> "We just finished adding [feature]. Save everything you learned — component names, table relationships, decisions we made, and any edge cases — to CLAUDE.md and MEMORY.md."

**Skill creation**
> "Go back through our conversation. We just completed the full workflow for [task type]. Turn this into a reusable skill called '[skill-name]' so I can repeat it in one command next time."

---

## Part 7: Mistakes to Avoid on NOJOB

### 1. Vague outcome prompts
**Wrong:** "Improve the job tracker."
**Right:** "The job tracker's status dropdown doesn't show a confirmation when a user moves a job to 'Offer Received'. Add a toast notification. Constraints: use the existing toast component, don't touch the data layer."

### 2. Not loading context first
Every session, start by loading CLAUDE.md. Cowork doesn't automatically remember everything — it reads the memory files. If you skip this, it'll make assumptions about your schema and component structure that may be wrong.

### 3. Letting Cowork touch auth without explicit permission
Your Supabase auth setup is the riskiest part of the codebase. Never let a session drift into auth changes. If Cowork mentions anything auth-related that you didn't ask for, stop it immediately.

### 4. Not splitting DB and frontend changes
Cowork will often try to do the migration AND update the frontend in one pass. Always make it stop after the migration, apply it manually in Supabase's dashboard, then continue with frontend changes. Mixing them makes rollbacks a nightmare.

### 5. Forgetting Capacitor
NOJOB is a web app AND a mobile app via Capacitor. Every UI change must be checked for mobile implications. Build "check for Capacitor implications" into every workflow prompt. Cowork won't do this automatically.

### 6. Skipping the memory update step
After a good session, always ask Cowork to update CLAUDE.md and MEMORY.md. This is how the tool gets smarter over time. Skip it and every future session starts cold.

### 7. Building skills from scratch in Cowork
The video is explicit: don't use the "create skill with Claude" button directly. Go through the real workflow first — achieve the result the messy way — then ask Cowork to reverse-engineer a skill from the conversation. The skill will be far more accurate and practical.

### 8. Not backing up your skills
Skills don't transfer between machines. Once you've built your `add-achievement`, `new-dashboard-widget`, and other NOJOB skills — back them up. Drop them in a `/NOJOB/cowork-skills/` folder or push them to a private GitHub repo.

### 9. Using outcome-first language for exploratory questions
Outcome-first prompts are for *doing* work. When you're still figuring out an approach, use regular conversational prompts first: "What's the best way to structure the friends/leaderboard feature given my current schema?" — then switch to outcome-first once you know what you want built.

### 10. One massive prompt for a complex feature
Don't ask Cowork to build the entire friends system in one prompt. Break it into phases: schema first, then API/queries, then UI, then mobile. Each phase should be its own approved plan.

---

## Quick Reference Card

| Situation | Start your prompt with |
|---|---|
| New feature | "Load CLAUDE.md. Before touching anything, read [files] and tell me what's affected..." |
| UI change | "Scope this to [ComponentName] only. No logic changes. Show me the diff first." |
| DB change | "Read the schema. List every component that queries [table]. Propose the migration. Wait." |
| Something broke | "Don't fix anything yet. Read [file] and tell me what's wrong and why." |
| End of session | "Save what you learned to CLAUDE.md and MEMORY.md." |
| Repeat workflow | "Go back through our conversation and create a skill for this." |

---

*Guide generated: 2026-05-14 | Based on: "Cowork in 20 mins" YouTube transcript*
