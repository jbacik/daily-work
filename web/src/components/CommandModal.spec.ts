import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CommandModal from './CommandModal.vue'

function mountComponent(props: { isOpen?: boolean; title?: string } = {}) {
  return mount(CommandModal, {
    props: {
      isOpen: props.isOpen ?? true,
      title: props.title ?? '// DAILY STANDUP',
    },
    attachTo: document.body,
  })
}

function queryBody(selector: string) {
  return document.body.querySelector(selector)
}

describe('CommandModal', () => {
  it('CommandModal_RendersTitle_WhenOpen', () => {
    const wrapper = mountComponent({ title: '// WEEKLY ROUNDUP' })

    expect(queryBody('[data-testid="command-modal-title"]')?.textContent).toBe('// WEEKLY ROUNDUP')

    wrapper.unmount()
  })

  it('CommandModal_ShowsPlaceholder_WhenOpen', () => {
    const wrapper = mountComponent()

    expect(queryBody('[data-testid="command-modal-content"]')?.textContent).toContain('Generating')

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
    expect(queryBody('[data-testid="copy-label"]')?.textContent).toBe('opied!')

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
})
