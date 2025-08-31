# 📜 MatEx Project Rules (for Copilot ChatGPT-5)

## 🔹 1. General Principles
1. **No Hallucinations**: Never invent APIs, libraries, or frameworks. Only use the stack defined:
   - Next.js 14 + TypeScript
   - Supabase (DB, Auth, Storage, Realtime)
   - Stripe (Payments & Deposits)
   - TailwindCSS + shadcn/ui
   - Zod for validation
   - Nodemailer for email stubs
2. **One Task at a Time**: Always follow the Task List (`matex_full_task_list.csv`). Do not jump ahead.
3. **Documentation First**: For each task:
   - Explain what files will be touched
   - Explain DB changes (if any)
   - Explain API endpoints and expected responses
   - Add docstring & inline comments in code
4. **Suggest Better Options**: If there’s a simpler/cleaner approach, suggest it before implementing.

## 🔹 2. Coding Rules
5. **Parameterised, No Hardcoding**: All values (fees, deposits, durations, T&C version) must come from DB (`app_settings`) or ENV (`.env`).
6. **Type Safety**: Always use TypeScript interfaces & Zod schemas.
7. **Consistency**: Follow repo conventions (folder structure, naming, coding style).
8. **Atomic Commits**: One commit per task with clear message (from Task List).

## 🔹 3. Git Rules
9. After finishing each task:
   - `git add -A`
   - `git commit -m "feat: task summary"`
   - `git push origin <branch>`
10. Always work on a branch (`feat/...`, `db/...`, `ui/...`, `legal/...`).
11. Create PR if multiple tasks need review before merging to `main`.

## 🔹 4. Testing Rules
12. **Unit Test / Manual Check** per task:
   - For DB: run query against Supabase and confirm schema.
   - For API: use `curl` or `httpie` to test endpoints.
   - For UI: show screenshots or Storybook (optional).
13. Never mark a task done until tested.
14. If test fails: rollback, fix, re-test, then commit.

## 🔹 5. Documentation Rules
15. Update `CHANGELOG.md` after each Phase.
16. Update `README.md` if dependencies or env variables change.
17. Keep `docs/` folder with:
   - `DB_SCHEMA.md`
   - `API_ROUTES.md`
   - `NOTIFICATIONS.md`
   - `SETTINGS_KEYS.md`
18. All changes must be logged (which task, what changed, what tested).

## 🔹 6. Review & Feedback Loop
19. At the end of each task, output in chat:
   - ✅ What was done
   - 📂 Files changed
   - 🔧 Tests performed & results
   - 📌 Next suggested improvement (if any)
20. Always ask: *“Shall I proceed to next task?”* before moving.

## 🔹 7. Error Handling & Improvements
21. If unsure → Ask for clarification, don’t assume.
22. If better library/framework emerges, suggest with pros/cons.
23. If bug found in earlier phase, open new issue instead of sneaking changes.

## 🔹 8. Example Workflow for Copilot
**Task:** T023 - POST /api/auctions/[id]/bid with soft-close

1. Summarize what’s required
2. Show DB rows needed (`auctions`, `bids`, `app_settings`)
3. Draft API handler with validation
4. Document endpoint in `API_ROUTES.md`
5. Add Zod validation + error messages
6. Test with sample data (success, invalid bid, expired auction)
7. Commit & push branch `feat/api-bid`

Output in chat:
```
✅ Task T023 complete
📂 Files: /app/api/auctions/[id]/bid/route.ts, lib/auction.ts, docs/API_ROUTES.md
🔧 Tests: success bid = 200, too low = 400, expired = 403
📌 Suggestion: add audit log for all bids
Shall I proceed to T024 (Realtime bids)?
```
