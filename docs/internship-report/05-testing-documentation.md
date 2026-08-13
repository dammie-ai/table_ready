# 6. Testing Documentation — raw material (YOU write the narrative)

This is deliberately **not a draft** — the professor is checking whether you can explain
issues you found and how you fixed them, so this section has to be in your own words.
What follows is real evidence pulled from your own repo to write from, organized so you
don't have to go dig for it yourself under deadline pressure.

## 6.1 Tools used
- **Manual/exploratory:** Postman (`backend/TableReady API.postman_collection.json`),
  logged results in `backend/API_Test_Log.xlsx.csv`, steps in `backend/API_Test_Instructions.txt`
- **Automated:** Jest (`backend/tests/api.test.js`, run via `backend/jest.config.js`)
- **Live/E2E:** real device testing via Expo Go (see commits below) — you tested the
  actual mobile app against the deployed backend, not just mocked endpoints

## 6.2 Real bugs found & fixed (from your own commit history)
Pick 8-12 of these that you actually remember working on, and for each write 2-4
sentences: **what broke, how you noticed it, what the fix was.** This is the strongest,
most authentic content you can put in this section because it's literally your work log.

**Security/authorization bugs (good candidates — these show real testing depth):**
- `fix: close remaining Phase 0 gaps — cart IDOR, usual-order IDOR, inventory exposure, weak rate limit` (2026-08-10)
- `fix: order cancellation had no ownership check at all` (2026-08-10)
- `fix: dashboard routes returned admin/manager data to any logged-in role` (2026-08-10)
- `fix: close unauthenticated staff-registration hole; remove dead-end customer Sign In/Register UI` (2026-08-10)
- `fix: staff login bypass and location geofence skip` (2026-08-03)

**Data-integrity / correctness bugs:**
- `fix: kitchen never saw order modifiers — including allergy-relevant removals` (2026-08-11) — a genuinely serious bug: allergy-relevant item removals weren't reaching the kitchen display
- `fix: payment confirmation didn't verify the charged amount; persist customer tips` (2026-08-11)
- `fix: tax rate silently charged $0, combo orders billed at wrong total` (2026-08-11)
- `fix: location-radius checks silently ignored the radius every caller passed` (2026-08-05) — geofencing wasn't actually enforcing the radius
- `fix: critical checkout/integration bugs + new features from live E2E testing` (2026-08-04)
- `fix: critical integration and reliability bugs found via live E2E testing` (2026-08-04)

**UI/UX bugs found through real usage:**
- `fix: washed-out Menu Management form; broken Manager Panel Menu tab` (2026-08-11)
- `fix: brand-accent text (prices, links, header titles) invisible against the same near-black Primary Color` (2026-08-10)
- `fix: text on colors.primary/secondary was hardcoded white, invisible against light admin-picked brand colors` (2026-08-10)
- `fix: settings button escaped the safe-area inset, overlapping the status bar` (2026-08-10)
- `fix: CartScreen render-phase crash, dish-of-week fields, combo checkout data loss` (2026-08-06)

**Deployment/infra bugs (good example of "issues encountered" beyond just app logic):**
- A long chain on 2026-08-05 fixing Render deployment: monorepo dependency hoisting,
  broken build commands, missing schema in the repo (`fix: commit the actual database
  schema — it never existed in the repo`), CORS between the deployed frontend and
  backend, static site region config. Worth one paragraph summarizing the deployment
  debugging process as its own mini war-story — graders like seeing you can debug
  infra, not just app code.

## 6.3 Test log
`backend/API_Test_Log.xlsx.csv` and the commit `test: run API tests and update actual
status codes` (2026-07-28) show you tracked actual vs. expected status codes per
endpoint during manual testing — open the CSV and pull 1-2 examples of a test that
initially failed and what the fix was.

---
*TODO (you): write 1-2 paragraphs per bug category above (not every single commit),
in your own words — what you were testing, what broke, how you found it, how you
verified the fix. Add a short paragraph on what you'd test next if the internship
continued (shows maturity, low effort, and this cannot be plagiarism-flagged.).*
