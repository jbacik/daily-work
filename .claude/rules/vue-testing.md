# Vue Component Testing Conventions

## Stack

- **Vitest** — test runner and assertion library
- **Vue Test Utils v2** (`@vue/test-utils`) — component mounting
- **@pinia/testing** — Pinia store utilities
- **jsdom** — DOM environment (configured in `vite.config.ts`)

Test globals (`describe`, `it`, `expect`, `vi`) are available without imports — configured via `globals: true` in `vite.config.ts`.

## File Naming & Location

Co-locate spec files with source files. Name them `ComponentName.spec.ts`:

```
src/
  components/
    WorkItemList.vue
    WorkItemList.spec.ts
  stores/
    workItemStore.ts
    workItemStore.spec.ts
```

## Test Naming

Three-part pattern matching the API testing conventions — `Subject_Description_WhenCondition`:

```ts
WorkItemList_RendersItems_WhenStoreHasData
WorkItemList_ShowsEmptyState_WhenNoItems
WorkItemForm_EmitsSubmit_WhenFormIsValid
```

No `Should_` prefix. No extra underscores beyond the three-part pattern.

## Component Mounting

Always use `mount()` — never `shallowMount()`. Pass props and slots directly:

```ts
import { mount } from '@vue/test-utils';
import WorkItemList from './WorkItemList.vue';

const wrapper = mount(WorkItemList, {
  props: {
    date: '2026-04-02',
  },
  slots: {
    empty: '<div>No items</div>',
  },
});
```

## Pinia Setup

Create a fresh Pinia instance per test in `beforeEach`. Do not share store state across tests:

```ts
import { setActivePinia, createPinia } from 'pinia';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});
```

To test a component that reads from a store, use the real store populated via the API client mock — do not reach into the store directly to set state.

## API / Axios Mocking

Mock the entire axios module. Cast the mocked function with `as Mock` for typed `.mockResolvedValue()` calls:

```ts
import axios from 'axios';
import type { Mock } from 'vitest';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = axios.get as Mock;

mockGet.mockResolvedValue({ data: [{ id: 1, title: 'Buy milk' }] });
```

Note: The Axios client at `@/api/client.ts` has a response interceptor that returns `response.data` directly. Tests that call store methods (which use the client) will get the unwrapped payload — mock accordingly.

## Selectors

Use `data-testid` as the primary selector. Add `data-testid` attributes to components as you write tests. Fall back to component queries only when testing composition:

```ts
// Primary — stable, intent-revealing
wrapper.find('[data-testid="work-item-title"]')

// Component query — for composition tests
wrapper.findComponent(WorkItemRow)
wrapper.findAllComponents(WorkItemRow)
```

Never select by CSS class or element tag for meaningful assertions.

## User Interactions

Trigger events with `await`. Wait for Vue reactivity with `await nextTick()` after state-changing interactions:

```ts
import { nextTick } from 'vue';

const button = wrapper.find('[data-testid="add-item-btn"]');
await button.trigger('click');
await nextTick();

expect(wrapper.find('[data-testid="item-form"]').exists()).toBe(true);
```

For inputs:

```ts
const input = wrapper.find('[data-testid="title-input"]');
await input.setValue('Buy milk');
```

## Assertions

| Goal | Assertion |
|---|---|
| Element exists | `expect(wrapper.find(...).exists()).toBe(true)` |
| Element visible | `expect(wrapper.find(...).isVisible()).toBe(true)` |
| Text content | `expect(wrapper.get(...).text()).toContain('Buy milk')` |
| Child components | `expect(wrapper.findAllComponents(WorkItemRow)).toHaveLength(3)` |
| Event emitted | `expect(wrapper.emitted('submit')).toBeTruthy()` |
| Event payload | `expect(wrapper.emitted('submit')![0]).toEqual([{ title: 'Buy milk' }])` |
| Mock called | `expect(mockGet).toHaveBeenCalledWith('/api/work-items', expect.any(Object))` |

Use `wrapper.get(...)` (throws if missing) over `wrapper.find(...)` when the element must exist — the error message is clearer on failure.

## Component Instance Access

Cast `wrapper.vm` to access internal state and exposed methods directly:

```ts
const vm = wrapper.vm as InstanceType<typeof WorkItemList>;
expect(vm.isLoading).toBe(false);
vm.refresh();
```

Only access `vm` when the DOM alone can't express the assertion.

## AAA Structure

Separate Arrange / Act / Assert with blank lines:

```ts
it('WorkItemList_RendersItems_WhenStoreHasData', async () => {
  // Arrange
  mockGet.mockResolvedValue({ data: [{ id: 1, title: 'Buy milk', isDone: false }] });
  const wrapper = mount(WorkItemList, { props: { date: '2026-04-02' } });

  // Act
  await wrapper.find('[data-testid="load-btn"]').trigger('click');
  await nextTick();

  // Assert
  expect(wrapper.findAllComponents(WorkItemRow)).toHaveLength(1);
  expect(wrapper.get('[data-testid="item-title"]').text()).toContain('Buy milk');
});
```

## Mock Data Factories

Use factory functions with optional overrides for repeated mock objects:

```ts
const createMockWorkItem = (overrides: Partial<WorkItem> = {}): WorkItem => ({
  id: 1,
  title: 'Default task',
  category: 'SmallThing',
  isDone: false,
  date: '2026-04-02',
  createdAt: '2026-04-02T00:00:00Z',
  ...overrides,
});
```

## Test Isolation

Tests share a Vitest worker but each creates its own Pinia via `setActivePinia(createPinia())`. Never assert on counts without filtering to data your test created — other tests may run in the same suite:

```ts
// CORRECT — filters to this test's data
expect(wrapper.findAllComponents(WorkItemRow).filter(r =>
  r.props('item').title === 'My unique title'
)).toHaveLength(1);

// WRONG — assumes nothing else was rendered
expect(wrapper.findAllComponents(WorkItemRow)).toHaveLength(1);
```
