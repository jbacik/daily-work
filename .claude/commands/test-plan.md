# /test-plan

Given a feature or endpoint name, read the relevant source files and enumerate every test case that needs to be written — before writing any test code.

## Philosophy

Tests verify behavior through public interfaces, not implementation details. A good test reads like a specification; it survives refactors because it doesn't care about internal structure. Avoid "horizontal slicing" — writing all tests at once and then all code. Write one test, implement it, then move to the next.

## Step 1 — Locate source files

If $ARGUMENTS names an endpoint (e.g. `work-items`, `ReadWatch`, `ScratchPad`):
- Find the matching `api/src/Endpoints/*Endpoints.cs` file
- Find the matching `web/src/components/*.vue` file(s) and `web/src/stores/*.ts` file(s)

If $ARGUMENTS names a specific file path, read it and infer the counterpart files from naming conventions.

## Step 2 — Read the source

Read each located file. Identify:
- Every route (GET, POST, PUT, DELETE) with its parameters and response shapes
- Every business rule enforced inline (status code 422, limits, guards)
- Every component state (loading, error, empty, populated)
- Every user interaction (clicks, form submits, input changes)
- Every event emitted and every store action called

## Step 3 — Confirm scope

Before enumerating, confirm with the user which behaviors are most important to test and which can be deferred. Identify the tracer bullet — the single test that proves the most critical end-to-end path works.

## Step 4 — Enumerate xUnit tests

Group under: `api/tests/{Resource}EndpointTests.cs`

Name each test `Route_Description_WhenCondition`. No `Should_` prefix. Cover:
- Happy path for every route (correct status + response shape)
- Empty collection (GET returns `[]`, not 404)
- Not found (404) for every route that takes an ID
- Bad request (400) for missing or malformed required inputs
- Business rule violations (422) for every guard in the handler
- Each mutation: verify the change persisted by re-reading via GET

Mark the tracer bullet with `[TRACER BULLET]`.

## Step 5 — Enumerate Vitest tests

Group under: `web/src/components/{Name}.spec.ts` or `web/src/stores/{name}.spec.ts`

Name each test `Subject_Description_WhenCondition`. No `Should_` prefix. Cover:
- Renders correctly with data
- Empty state (mock returns `[]`)
- Loading state (mock is pending)
- Error state (mock rejects)
- Each distinct user interaction
- Each event emitted
- Each store action (verify called with correct args)

## Output format

Print as a checklist grouped by file. One sentence per test describing the seed/mock setup and the assertion:

**`api/tests/WorkItemEndpointTests.cs`**
- [ ] `[TRACER BULLET] PostWorkItem_CreatesItem_ReturnsCreated` — POSTs a valid payload; asserts 201 and the returned item matches the input
- [ ] `PostWorkItem_Returns422_WhenDailyLimitExceeded` — seeds 5 SmallThing items via POST for the same date; asserts the sixth returns 422

**`web/src/components/WorkItemList.spec.ts`**
- [ ] `WorkItemList_RendersItems_WhenStoreHasData` — axios.get resolves with 2 items; asserts two WorkItemRow components are rendered

End with: `Total: N xUnit tests, M Vitest tests`

## Constraint

Output names and one-sentence descriptions only — no test code, no imports, no implementation.
