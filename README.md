# ALTAI Rating Workbench

Version 1.2 · live at https://evared-code.github.io/altai-rating-workbench/

A static web app for rating the 69 ALTAI criteria against a registered assessment plan, one rating per criterion and stakeholder, with a PDF or JSON report at the end.

## Use

1. Open `index.html`, or publish the folder with GitHub Pages (Settings → Pages → deploy from branch, root).
2. Fill in case, assessor and evidence cut-off.
3. Choose the stakeholder: **Relevant authority** (all 69 criteria, the default), **AI customer** or **AI subject**. Criteria not rated for that stakeholder fade out and leave the count.
4. For each criterion, **register the plan** before looking at evidence: decide applicability (element 1), choose the measure with a rationale (element 2), set the acceptance criterion and its source (element 3), tick the evidence classes to consult (element 4), then **Register and lock**. Registration stamps the time (C1).
5. Rate on behalf of the chosen stakeholder. The rating opens only for a registered plan. Amending a plan needs a reason, is kept in the report, and clears the rating.
6. Export **Report PDF** or **Report JSON**.

## Import JSON

**Import JSON** loads a report exported from this app, to continue on another device, to review a second assessor's file, or to keep the record. It replaces the records for the stakeholder named in the file. **Load example** opens the built-in example.

`examples/example-fictional-loanscreen-ai-customer.json` is a **fictional** case (an invented loan-scoring tool, AI customer view) with 15 registered plans and 13 ratings, made for trying the import. It is not study data.

Work is saved in the browser (localStorage) on this device only.


## Case files

Rating records for the study cases are not in this public repository until both human assessors have finished, so that they cannot anchor either assessment. They will be added with the replication package.

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
