import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CommandModal from './CommandModal.vue'
import axios from 'axios'
import type { Mock } from 'vitest'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: { use: vi.fn() },
        request: { use: vi.fn() },
      },
    })),
  },
}))

// Get the mocked client instance that the component will use
const mockClient = axios.create() as any
const mockPost = mockClient.post as Mock

// The client module uses axios.create() — we need to mock the module directly
vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import client from '@/api/client'
const clientPost = (client as any).post as Mock

function mountComponent(props: { isOpen?: boolean; title?: string; commandType?: string | null; weekOf?: string } = {}) {
  return mount(CommandModal, {
    props: {
      isOpen: props.isOpen ?? true,
      title: props.title ?? '// DAILY STANDUP',
      commandType: props.commandType as any ?? null,
      weekOf: props.weekOf ?? '2026-04-06',
    },
    attachTo: document.body,
  })
}

function queryBody(selector: string) {
  return document.body.querySelector(selector)
}

describe('CommandModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('CommandModal_RendersTitle_WhenOpen', () => {
    const wrapper = mountComponent({ title: '// WEEKLY ROUNDUP' })

    expect(queryBody('[data-testid="command-modal-title"]')?.textContent).toBe('// WEEKLY ROUNDUP')

    wrapper.unmount()
  })

  it('CommandModal_ShowsLoading_WhenGenerating', async () => {
    clientPost.mockReturnValue(new Promise(() => {})) // never resolves
    const wrapper = mountComponent({ commandType: 'standup' })
    await nextTick()

    expect(queryBody('[data-testid="command-modal-loading"]')?.textContent).toContain('Generating')

    wrapper.unmount()
  })

  it('CommandModal_DoesNotRender_WhenClosed', () => {
    const wrapper = mountComponent({ isOpen: false })

    expect(queryBody('[data-testid="command-modal-overlay"]')).toBeNull()

    wrapper.unmount()
  })

  it('CommandModal_EmitsClose_WhenEscapePressed', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()

    wrapper.unmount()
  })

  it('CommandModal_EmitsClose_WhenEPressed', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()

    wrapper.unmount()
  })

  it('CommandModal_EmitsSave_WhenSPressed', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))
    await nextTick()

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('close')).toBeTruthy()

    wrapper.unmount()
  })

  it('CommandModal_CopiesText_WhenCopyClicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = mountComponent()

    const copyBtn = queryBody('[data-testid="cmd-copy"]') as HTMLElement
    copyBtn.click()
    await nextTick()

    expect(writeText).toHaveBeenCalled()
    expect(queryBody('[data-testid="copy-label"]')?.textContent).toContain('opied!')

    wrapper.unmount()
  })

  it('CommandModal_EmitsClose_WhenExitClicked', async () => {
    const wrapper = mountComponent()

    const exitBtn = queryBody('[data-testid="cmd-exit"]') as HTMLElement
    exitBtn.click()
    await nextTick()

    expect(wrapper.emitted('close')).toBeTruthy()

    wrapper.unmount()
  })

  it('CommandModal_ShowsSections_WhenGenerated', async () => {
    clientPost.mockResolvedValue({
      markdown: '### Did you complete your One Thing yesterday?\nCrushed it.\n\n### What is your One Thing today?\nInsights work.',
    })

    const wrapper = mountComponent({ commandType: 'standup' })
    await nextTick()
    await nextTick()

    expect(queryBody('[data-testid="command-modal-content"]')).not.toBeNull()
    const content = queryBody('[data-testid="command-modal-content"]')?.textContent ?? ''
    expect(content).toContain('Crushed it')
    expect(content).toContain('Insights work')

    wrapper.unmount()
  })

  it('CommandModal_ShowsError_WhenApiFails', async () => {
    clientPost.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountComponent({ commandType: 'standup' })
    await nextTick()
    await nextTick()

    expect(queryBody('[data-testid="command-modal-error"]')?.textContent).toContain('Network Error')

    wrapper.unmount()
  })
})
