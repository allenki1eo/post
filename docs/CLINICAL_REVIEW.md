# Clinical Review Register

Nothing in this repository is clinically reviewed yet. Every care-plan
template carries `clinicalReview.status = "pending_review"` and the label
`FOR DEMONSTRATION - CLINICAL REVIEW REQUIRED` (enforced by
`tests/seedData.test.ts`). A qualified doctor must review the items below
before any real-world use; a fluent Tanzanian Kiswahili speaker must review
all Kiswahili wording. Record each review here with reviewer, date, content
version, and exact scope — never claim endorsement beyond what was actually
reviewed. Editing a reviewed template creates a new unreviewed version.

## Awaiting qualified doctor review

| Item | Location | Version | Status |
|---|---|---|---|
| Minor-procedure template: questions, thresholds (pain ≥ 8, bleeding, fever), rules, messages | `data/care-plan-templates.json` (`tmpl-minor-procedure`) | 1 | pending_review |
| Antibiotic template: rash-urgent rule, fever review, 80% adherence threshold, missed ×2 | `tmpl-antibiotic` | 1 | pending_review |
| Hypertension template: headache ≥ 8 urgent, dizziness review, missed ×3 | `tmpl-hypertension` | 1 | pending_review |
| Diabetes template: low-sugar-signs urgent wording, foot sore review, missed ×2 | `tmpl-diabetes` | 1 | pending_review |
| 12 synthetic follow-up cases and their expected labels | `data/synthetic-cases.json` | 1 | pending_review (blind review recommended) |
| Urgent-instruction sample text (all "SAMPLE TEXT" strings) | templates + `synthetic-patients.json` | 1 | pending_review |
| Safety-verifier forbidden-claim patterns | `src/domain/safety.ts` | 1 | pending_review (demo heuristics) |
| Care Passport category wording and source labels | `src/i18n/*`, `data/synthetic-passports.json` | 1 | pending_review |
| Synthetic passport clinical records | `data/synthetic-passports.json` | 1 | pending_review |

## Awaiting Kiswahili language review

| Item | Location | Version | Status |
|---|---|---|---|
| Full `sw` UI bundle | `src/i18n/sw.ts` | 1 | provisional |
| Glossary | `src/i18n/glossary.ts` | 1 | provisional (all entries) |
| Bilingual template questions, rule messages, instructions | `data/care-plan-templates.json` | 1 | provisional |
| Patient disclaimer and consent/privacy wording | `src/i18n/*` | 1 | provisional |

## Review log

_No reviews recorded yet._

Template for entries:

```
### YYYY-MM-DD — <reviewer name, qualification>
Scope: <exact files/versions reviewed>
Decisions: <accepted / changes requested, with rationale>
Content version reviewed: <n>
```

## Doctor-review worksheet (Milestone 7)

The evaluation milestone adds a worksheet pairing each synthetic case with
its expected label, matched rules, and evidence for blind review.
