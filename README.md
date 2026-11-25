# ALTAI Rating Workbench

Version 2.0 · live at https://evared-code.github.io/altai-rating-workbench/
Version 1.2 (one rating per stakeholder) stays at https://evared-code.github.io/altai-rating-workbench/v1/

A static web app for assessing the AI components of one AI app against the 69 ALTAI criteria. The assessor works for the app side (the AI provider). Each criterion gets a registered plan, then one rating per AI component. The app also runs the release check and produces three outputs.

## What changed in 2.0

- **One assessment per AI component** (rule-based, ML, LLM, other), each with its producer and version. Stakeholder views are no longer rated separately.
- **The 7 ALTAI requirements** group the 69 criteria (11, 21, 6, 5, 10, 8, 8).
- **Element 4 now asks two questions**: *Can the app side answer alone?* and *Can the producer answer without knowing this use?* The answers set the holder (App side, Producer, Shared, Each its own) and suggest the evidence classes (O, D, C, N).
- **Plain action names**: Ask producer (N), Own task (O, C), Fix before release (Not met).
- **Registered acceptance criterion** (Case setup): error types with weight w(e) and the lecturer–lecturer baseline, locked before evidence. The check is Σ p(e, model)·w(e) ≤ Σ p(e, lecturers)·w(e), per component.
- **Release check** per component: no Not met; coverage for each stakeholder group ≥ R_min; every Cannot judge has a named person accepting the risk. Stakeholder groups enter here only.
- **Evidence rounds R0, R1, R2** and **ΔR = R2 − R0**. A criterion first judged after R0 is tagged data-, model- or process-added.
- **Three outputs**, PDF or JSON: for the producer, for the provider side, for the AI users. The full JSON record can be imported again.
- **Re-assessment triggers** (lecturer changes to AI levels, upheld appeals, new component version), each linked to criteria. Reaching the threshold reopens those criteria.
- **Holder draft** for the 326501 grading case (`data/holder-draft-326501.json`) can be filled into unregistered plans from Case setup, or one criterion at a time with *Use draft*.

## Use

1. Open `index.html`, or publish the folder with GitHub Pages (Settings → Pages → deploy from branch, root).
2. **Case setup**: list the AI components; register the acceptance criterion; set R_min for each group; check the re-assessment triggers.
3. **Rate**: pick the component and the evidence round. For each criterion, register the plan before looking at evidence: applicability (element 1), measure and rationale (element 2), acceptance criterion and source (element 3), the two holder questions and the classes to consult (element 4). Then **Register and lock**. Registration stamps the time (C1).
4. Rate. Amending a plan needs a reason, is kept in the report, and clears the rating.
5. **Release check and outputs**: read the check for each component and export the outputs.

## Import JSON

**Import JSON** loads a full record from 2.0 (restores everything), or a 1.x report. A 1.x report becomes one component named after its case and stakeholder view. Its criteria outside that stakeholder's scope show as *plan needed*, and its plans have no holder answers yet: amend a plan to add them. **Load example** opens the built-in fictional example.

Work is saved in the browser (localStorage) on this device only. Version 2.0 uses a new storage key, so 1.2 work in the same browser is untouched and still opens at `/v1/`.

## Case files

Rating records for the study cases are not in this public repository until both human assessors have finished, so that they cannot anchor either assessment. They will be added with the replication package.

## Rating rule (G1–G5)

- G1: applicability is decided in element 1 of the registered plan; a criterion registered as not applicable gets no rating.
- G2: list the expected elements (each measure, each named subgroup).
- G3: compare each with the acceptance criterion, using only evidence about this component as the app uses it; mark shown met, shown not met, or missing.
- G4: any shown not met → Not met; none shown → Cannot judge; all shown met → Met; otherwise → Partly met (after ITU-T X.290 fail / inconclusive / pass).
- G5: record claim, evidence, argument. Not met becomes Fix before release. Missing evidence becomes Ask producer (class N, counts in ΔR) or an Own task on the app side (classes O and C).

The G4 helper only suggests a level; the assessor chooses the rating.

## Data

- `data/altai-plan.json`: the plan (criterion paraphrase, ALTAI requirement, question type, elements 1–4, stakeholder code).
- `data/holder-draft-326501.json`: Q1, Q2, holder and classes for the grading case.

Both are **drafts by Claude**. Stakeholder codes must be verified against the full ALTAI wording; the holder draft must be checked by the second coder before use in a study.

## Build

`index.html` is built from `src/` and `data/`: run `python3 build.py`. It takes the page head and styles, and the built-in example, from `v1/index.html`.

## Limits

- The report's C1 check lists any rating time earlier than its plan's registration time.
- The PDF uses a Latin-1 font: Thai and other non-Latin text is replaced by `?`. The JSON keeps it.
- Coverage R = (Met + Partly met + Not met) / applicable criteria. Per group, only criteria coded for that group count.
- Re-assessment triggers act on the component that is selected.
