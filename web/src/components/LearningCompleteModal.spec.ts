import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LearningCompleteModal from './LearningCompleteModal.vue'
import type { ReadWatchItem } from '@/types'

const createMockItem = (overrides: Partial<ReadWatchItem> = {}): ReadWatchItem => ({
  id: 1,
  title: 'Test article',
  url: '',
  type: 'Read',
  isDone: false,
  isActive: true,
  worthSharing: null,
  notes: null,
  weekConsumed: null,
  date: '2026-04-08',
  ...overrides,
})

// Teleport renders outside the wrapper, so query from document.body
function findTestId(testId: string) {
  return document.body.querySelector(`[data-testid="${testId}"]`)
}

async function mountModal(props: {
  isOpen: boolean
  item: ReadWatchItem | null
  mode?: 'consume' | 'review'
}) {
  const wrapper = mount(LearningCompleteModal, {
    props,
    attachTo: document.body,
  })
  await nextTick()
  return wrapper
}

describe('LearningCompleteModal', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('LearningCompleteModal_RendersWhenOpen', async () => {
    await mountModal({
      isOpen: true,
      item: createMockItem(),
    })

    expect(findTestId('learning-complete-modal')).not.toBeNull()
  })

  it('LearningCompleteModal_DoesNotRender_WhenClosed', async () => {
    await mountModal({
      isOpen: false,
      item: createMockItem(),
    })

    expect(findTestId('learning-complete-modal')).toBeNull()
  })

  it('LearningCompleteModal_DisablesSubmit_WhenFieldsEmpty', async () => {
    await mountModal({
      isOpen: true,
      item: createMockItem(),
    })

    const submitBtn = findTestId('submit-btn') as HTMLButtonElement
    expect(submitBtn).not.toBeNull()
    expect(submitBtn.disabled).toBe(true)
  })

  it('LearningCompleteModal_EmitsSubmit_WithFormData', async () => {
    const wrapper = await mountModal({
      isOpen: true,
      item: createMockItem(),
    })

    // Select "Yes" for worth sharing
    const yesRadio = findTestId('worth-sharing-yes') as HTMLInputElement
    yesRadio.click()
    await nextTick()

    // Fill notes
    const notesInput = findTestId('notes-input') as HTMLTextAreaElement
    notesInput.value = 'Great insights on testing'
    notesInput.dispatchEvent(new Event('input'))
    await nextTick()

    // Submit
    const submitBtn = findTestId('submit-btn') as HTMLButtonElement
    submitBtn.click()
    await nextTick()

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0]).toEqual([
      { worthSharing: true, notes: 'Great insights on testing' },
    ])
  })

  it('LearningCompleteModal_EmitsClose_OnCancel', async () => {
    const wrapper = await mountModal({
      isOpen: true,
      item: createMockItem(),
    })

    const cancelBtn = findTestId('cancel-btn') as HTMLButtonElement
    cancelBtn.click()
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('LearningCompleteModal_PopulatesExistingData_InReviewMode', async () => {
    const item = createMockItem({
      worthSharing: true,
      notes: 'Previous notes',
    })

    await mountModal({
      isOpen: true,
      item,
      mode: 'review',
    })

    const notesInput = findTestId('notes-input') as HTMLTextAreaElement
    expect(notesInput.value).toBe('Previous notes')

    const yesRadio = findTestId('worth-sharing-yes') as HTMLInputElement
    expect(yesRadio.checked).toBe(true)
  })

  it('LearningCompleteModal_ShowsItemTitle', async () => {
    await mountModal({
      isOpen: true,
      item: createMockItem({ title: 'My Learning Item' }),
    })

    const modal = findTestId('learning-complete-modal')
    expect(modal?.textContent).toContain('My Learning Item')
  })

  it('LearningCompleteModal_ShowsTitleAsLink_WhenUrlPresent', async () => {
    await mountModal({
      isOpen: true,
      item: createMockItem({
        title: 'Linked item',
        url: 'https://example.com',
      }),
    })

    const link = document.body.querySelector('a[href="https://example.com"]')
    expect(link).not.toBeNull()
    expect(link?.textContent).toContain('Linked item')
  })

  it('LearningCompleteModal_ShowsCompleteButton_InConsumeMode', async () => {
    await mountModal({
      isOpen: true,
      item: createMockItem(),
      mode: 'consume',
    })

    const submitBtn = findTestId('submit-btn')
    expect(submitBtn?.textContent).toContain('complete')
  })

  it('LearningCompleteModal_ShowsSaveButton_InReviewMode', async () => {
    await mountModal({
      isOpen: true,
      item: createMockItem({ worthSharing: false, notes: 'test' }),
      mode: 'review',
    })

    const submitBtn = findTestId('submit-btn')
    expect(submitBtn?.textContent).toContain('save')
  })
})
