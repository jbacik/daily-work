import { mount } from '@vue/test-utils'
import ReadingItemRow from './ReadingItemRow.vue'
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

function mountRow(item: ReadWatchItem, showActions = true) {
  return mount(ReadingItemRow, {
    props: { item, showActions },
  })
}

describe('ReadingItemRow', () => {
  it('ReadingItemRow_ShowsEmojiForType_WhenRead', () => {
    const wrapper = mountRow(createMockItem({ type: 'Read' }))

    expect(wrapper.get('[data-testid="type-emoji"]').text()).toContain('📔')
  })

  it('ReadingItemRow_ShowsEmojiForType_WhenWatch', () => {
    const wrapper = mountRow(createMockItem({ type: 'Watch' }))

    expect(wrapper.get('[data-testid="type-emoji"]').text()).toContain('📺')
  })

  it('ReadingItemRow_ShowsEmojiForType_WhenLearn', () => {
    const wrapper = mountRow(createMockItem({ type: 'Learn' }))

    expect(wrapper.get('[data-testid="type-emoji"]').text()).toContain('🎓')
  })

  it('ReadingItemRow_ShowsEmojiForType_WhenExperiment', () => {
    const wrapper = mountRow(createMockItem({ type: 'Experiment' }))

    expect(wrapper.get('[data-testid="type-emoji"]').text()).toContain('🧪')
  })

  it('ReadingItemRow_RendersAnchorLink_WhenUrlPresent', () => {
    const wrapper = mountRow(createMockItem({
      title: 'Linked article',
      url: 'https://example.com',
    }))

    const link = wrapper.get('[data-testid="item-link"]')
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('https://example.com')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.text()).toContain('Linked article')
  })

  it('ReadingItemRow_RendersPlainText_WhenNoUrl', () => {
    const wrapper = mountRow(createMockItem({ url: '' }))

    expect(wrapper.find('[data-testid="item-link"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="item-text"]').text()).toContain('Test article')
  })

  it('ReadingItemRow_EmitsConsume_WhenCheckClicked', async () => {
    const wrapper = mountRow(createMockItem())

    await wrapper.get('[data-testid="consume-btn"]').trigger('click')

    expect(wrapper.emitted('consume')).toBeTruthy()
    expect(wrapper.emitted('consume')![0]).toEqual([1])
  })

  it('ReadingItemRow_EmitsToggleActive_WhenBacklogClicked', async () => {
    const wrapper = mountRow(createMockItem())

    await wrapper.get('[data-testid="toggle-active-btn"]').trigger('click')

    expect(wrapper.emitted('toggle-active')).toBeTruthy()
    expect(wrapper.emitted('toggle-active')![0]).toEqual([1])
  })

  it('ReadingItemRow_ShowsBacklogLabel_WhenActive', () => {
    const wrapper = mountRow(createMockItem({ isActive: true }))

    expect(wrapper.get('[data-testid="toggle-active-btn"]').text()).toContain('backlog')
  })

  it('ReadingItemRow_ShowsActivateLabel_WhenBacklogged', () => {
    const wrapper = mountRow(createMockItem({ isActive: false }))

    expect(wrapper.get('[data-testid="toggle-active-btn"]').text()).toContain('activate')
  })

  it('ReadingItemRow_ShowsReviewButton_WhenDone', () => {
    const wrapper = mountRow(createMockItem({ isDone: true }))

    expect(wrapper.find('[data-testid="review-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="consume-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="toggle-active-btn"]').exists()).toBe(false)
  })

  it('ReadingItemRow_EmitsReview_WhenReviewClicked', async () => {
    const wrapper = mountRow(createMockItem({ isDone: true }))

    await wrapper.get('[data-testid="review-btn"]').trigger('click')

    expect(wrapper.emitted('review')).toBeTruthy()
    expect(wrapper.emitted('review')![0]).toEqual([1])
  })
})
