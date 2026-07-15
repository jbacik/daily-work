import { mount, flushPromises } from '@vue/test-utils'
import ForecastLoader from './ForecastLoader.vue'
import type { ForecastStatus } from '@/types'

function mountComponent(props: { status: ForecastStatus; fileName?: string | null; error?: string | null }) {
  return mount(ForecastLoader, { props })
}

describe('ForecastLoader', () => {
  it('ForecastLoader_ShowsScanning_WhenStatusLoading', () => {
    // Arrange / Act
    const wrapper = mountComponent({ status: 'loading' })

    // Assert
    expect(wrapper.get('[data-testid="forecast-scanning"]').text()).toContain('scanning local filesystem')
  })

  it('ForecastLoader_ShowsFileNameAndUnload_WhenStatusLoaded', () => {
    // Arrange / Act
    const wrapper = mountComponent({ status: 'loaded', fileName: 'daily-forecast-2026-07-14.json' })

    // Assert
    expect(wrapper.get('[data-testid="forecast-filename"]').text()).toBe('daily-forecast-2026-07-14.json')
    expect(wrapper.find('[data-testid="forecast-unload"]').exists()).toBe(true)
  })

  it('ForecastLoader_ShowsLocateButton_WhenStatusMissing', () => {
    // Arrange / Act
    const wrapper = mountComponent({ status: 'missing' })

    // Assert
    expect(wrapper.get('[data-testid="forecast-missing"]').text()).toContain('no forecast file found')
    expect(wrapper.find('[data-testid="forecast-pick"]').exists()).toBe(true)
  })

  it('ForecastLoader_ShowsErrorMessage_WhenStatusError', () => {
    // Arrange / Act
    const wrapper = mountComponent({ status: 'error', error: "'bad.json' is not valid JSON" })

    // Assert — the real error is surfaced, not the misleading "not found" message
    expect(wrapper.get('[data-testid="forecast-error"]').text()).toContain('is not valid JSON')
    expect(wrapper.find('[data-testid="forecast-missing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="forecast-pick"]').exists()).toBe(true)
  })

  it('ForecastLoader_EmitsUnload_WhenUnloadClicked', async () => {
    // Arrange
    const wrapper = mountComponent({ status: 'loaded', fileName: 'daily-forecast-2026-07-14.json' })

    // Act
    await wrapper.get('[data-testid="forecast-unload"]').trigger('click')

    // Assert
    expect(wrapper.emitted('unload')).toBeTruthy()
  })

  it('ForecastLoader_EmitsPickWithContent_WhenFileSelected', async () => {
    // Arrange
    const wrapper = mountComponent({ status: 'missing' })
    const content = '{"date":"2026-07-14"}'
    const file = new File([content], 'picked.json', { type: 'application/json' })
    const input = wrapper.get('[data-testid="forecast-file-input"]')
    Object.defineProperty(input.element, 'files', { value: [file] })

    // Act
    await input.trigger('change')
    await flushPromises()

    // Assert — FileReader completes on the event loop, not the microtask queue
    await vi.waitFor(() => expect(wrapper.emitted('pick')).toBeTruthy())
    expect(wrapper.emitted('pick')![0]).toEqual([content, 'picked.json'])
  })
})
