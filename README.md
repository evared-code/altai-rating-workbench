# ALTAI Rating Workbench

A static web app for rating the 69 ALTAI criteria against a registered assessment plan, one rating per criterion and stakeholder, with a PDF or JSON report at the end.

## Use

1. Open `index.html`, or publish the folder with GitHub Pages (Settings → Pages → deploy from branch, root).
2. Fill in case, assessor and evidence cut-off.
3. Choose the stakeholder: **AI regulator** (all 69 criteria, the default), **AI customer** or **AI subject**. Criteria not rated for that stakeholder fade out and leave the count.
4. For each criterion, **register the plan** before looking at evidence: decide applicability (element 1), choose the measure with a rationale (element 2), set the acceptance criterion and its source (element 3), tick the evidence classes to consult (element 4), then **Register and lock**. Registration stamps the time (C1).
5. Rate on behalf of the chosen stakeholder. The rating opens only for a registered plan. Amending a plan needs a reason, is kept in the report, and clears the rating.
6. Export **Report PDF** or **Report JSON**.

## Import JSON

**Import JSON** loads a report exported from this app, to continue on another device, to review a second assessor's file, or to keep the record. It replaces the records for the stakeholder named in the file. **Load example** opens the built-in example.

`examples/example-fictional-loanscreen-ai-customer.json` is a **fictional** case (an invented loan-scoring tool, AI customer view) with 15 registered plans and 13 ratings, made for trying the import. It is not study data.

Work is saved in the browser (localStorage) on this device only.


## AI-rater case files

`cases/` holds four files rated by an **AI rater (Claude)** for the two study cases, R0 with outside evidence only:

| File | Rating for | To rate | Met | Partly | Not met | Cannot judge |
|---|---|---|---|---|---|---|
| ai-rater-epic-ai-customer.json | AI customer (hospital) | 53 | 2 | 1 | 2 | 48 |
| ai-rater-epic-ai-subject.json | AI subject (patients) | 19 | 0 | 0 | 2 | 17 |
| ai-rater-rite-aid-ai-customer.json | AI customer (retailer) | 54 | 0 | 0 | 0 | 54 |
| ai-rater-rite-aid-ai-subject.json | AI subject (shoppers) | 18 | 0 | 0 | 1 | 17 |

Two further files repeat Epic at **R2**, adding the inside reference (Epic's internal documentation as reported by Wong et al. 2021) with the same plans: `ai-rater-epic-ai-customer-R2.json` (R 9% → 11%, ΔR = 1 criterion: A-63 Cannot judge → Partly met) and `ai-rater-epic-ai-subject-R2.json` (ΔR = 0). Each holds a `deltaR` block.

- **C1 is not met**: the AI wrote the plans after reading the evidence. The app labels these files "AI rater".
- Use them as a separate rater, compared with the human assessors only after both have finished. Do not show them to the second assessor before then.
- Evidence base. Epic: Wong et al. 2021 (hospital's own data, class O) and Bennett et al. 2019 (class D); Epic's internal documentation is excluded (inside reference, R2). Rite Aid: the Reuters 2020 report as summarised by Gizmodo; the FTC complaint and order are excluded because they are the comparison reference; cut-off 31 Jul 2020 set by the AI rater.
- Criteria with no case evidence use generic plan text (marked in the rationale) and get Cannot judge by G4. Who holds the missing evidence is set by a mechanical rule stated in each argument and should be reviewed.

## Rating rule (G1–G5)

- G1: applicability is decided in element 1 of the registered plan; a criterion registered as not applicable gets no rating.
- G2: list the expected elements (each measure, each named subgroup).
- G3: compare each with the acceptance criterion, using attributable evidence only; mark shown met, shown not met, or missing.
- G4: any shown not met → Not met; none shown → Cannot judge; all shown met → Met; otherwise → Partly met (after ITU-T X.290 fail / inconclusive / pass).
- G5: record claim, evidence, argument; missing evidence becomes a request to the provider (class N, counts in ΔR) or a task for the customer's own records (class C).

The G4 helper only suggests a level; the assessor chooses the rating.

## Data

`data/altai-plan.json` holds the plan (also inlined in `index.html`): criterion paraphrase, ALTAI requirement, question type, elements 1–4, and a stakeholder code.

Stakeholder codes (C, S, C+S, C indirect, X; rules R1–R5) are a **draft by Claude from the codebook paraphrases** and must be verified against the full ALTAI wording before use in a study.

## Limits

- The report's C1 check lists any rating time earlier than its plan's registration time.

- The PDF uses a Latin-1 font: Thai and other non-Latin text is replaced by `?`. The JSON report keeps it.
- Coverage R is computed as (Met + Partly met + Not met) / applicable criteria for the chosen stakeholder.
