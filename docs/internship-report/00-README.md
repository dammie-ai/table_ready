# Internship Report — Assembly Order

Matches the Final International University template from your screenshots. Assemble
your Word doc in this exact order.

**Your `SRS.docx` (copied into this folder) is now the primary source for Chapters
1-4** — it's your own original writing and is far more accurate/detailed than my
drafts, which were reverse-engineered from code and got at least one thing wrong
(guest checkout — your SRS confirms accounts are now required, my drafts have been
corrected to match). Specifically pull from SRS.docx for:
- Ch.1 Introduction — the "Project Target Definition" and "System Requirements
  Specification / Introduction / Audience / Scope" sections map almost directly
- Ch.2 Literature Review — the "Gap Analysis" table (TableReady vs. Toast KDS, Square
  for Restaurants, OpenTable) is real, already-done competitive research — use it
  instead of my generic placeholder table in 08-chapter2-literature-review.md
- Ch.3 System Analysis — the "Non-Functional Requirements" and "Functional
  Requirements" sections in the SRS are more complete and accurate than my draft;
  use SRS wording as primary, my draft only for anything the SRS doesn't cover
- Ch.4.4 Use Case Diagram — the "Use Cases" section in the SRS has full written
  scenarios (actor, preconditions, steps, error cases, result) for every actor —
  richer than my table; draw the diagram from these, and consider including the
  written scenarios as supporting text alongside the diagram
- Note the SRS's "PLANNED — NOT YET IMPLEMENTED" callouts throughout — carry these
  into your report as an honest scope boundary (Ch.1.4 Scope / Ch.7.2 Future Work);
  this kind of honesty is exactly what reads as genuine understanding, not AI filler

| Order | Section | Source | Status |
|---|---|---|---|
| — | Title page (project name, name, student number, "Final International University", date, Girne North Cyprus) | you | fill in |
| — | Ethical Declaration | you | **must be your own — do not draft this with AI** |
| — | Acknowledgments | you | **personal — write yourself** |
| — | Abstract | draft after everything else is final (write last, summarizes the whole report) | pending |
| — | Öz (Turkish abstract) | translate Abstract | **needs a real Turkish translation — MT + your own check, not left to AI alone** |
| Ch.1 | Introduction | [07-chapter1-introduction.md](07-chapter1-introduction.md) | draft, review |
| Ch.2 | Literature Review | [08-chapter2-literature-review.md](08-chapter2-literature-review.md) | **needs your real citations** |
| Ch.3 | System Analysis | [09-chapter3-system-analysis.md](09-chapter3-system-analysis.md) | draft, review |
| Ch.4 | System Design (architecture, data flow, ER diagram, use case, Gantt, UI, user guide) | [10-chapter4-system-design.md](10-chapter4-system-design.md) | draft + diagrams to render |
| 5.1 | Technology Stack | [01-technical-documentation.md](01-technical-documentation.md) | ready |
| 5.2-5.3 | Dev Environment, Code Samples | [11-chapter5-dev-environment-and-code-samples.md](11-chapter5-dev-environment-and-code-samples.md) | code samples need you |
| Ch.6 | Testing and Validation | [05-testing-documentation.md](05-testing-documentation.md) | **you write the narrative** |
| Ch.7 | Conclusion and Future Work | [12-chapter7-conclusion.md](12-chapter7-conclusion.md) | draft, review |

**Not part of the university template but kept for reference / extra detail:**
- [02-api-documentation.md](02-api-documentation.md) — full endpoint reference (pull from for Ch.4/5 as needed, or an appendix)
- [03-database-documentation.md](03-database-documentation.md) — full 50-table schema detail (Ch.4.3 uses a simplified version of this)
- [04-functional-documentation.md](04-functional-documentation.md) — feature list (source material for Ch.3.2.1)
- [06-user-manual.md](06-user-manual.md) — full page-by-page screenshot plan (source for Ch.4.7)

## Before you submit — priority order given the Aug 13 deadline
1. **Chapter 6 (Testing)** and **Chapter 4.6/4.7 (screenshots)** — need real content only you can produce; start here
2. **Chapter 2 (Literature Review)** section 2.2 — needs real sources, budget real search time
3. **Diagrams** — render the Mermaid ER/Gantt in Ch.4 (any Mermaid live editor), hand-draw the architecture/DFD/use-case diagrams from the descriptions given
4. **Ethical Declaration, Acknowledgments, Abstract, Öz** — must be your own words start to finish
5. Read every "draft, review" chapter (1, 3, 4, 5, 7) end to end and rewrite anything
   you can't defend out loud — that's the exact bar your professor set
