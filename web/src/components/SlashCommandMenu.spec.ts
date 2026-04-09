import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SlashCommandMenu from './SlashCommandMenu.vue'

function mountComponent() {
  return mount(SlashCommandMenu, { attachTo: document.body })
}

function isPanelOpen(wrapper: ReturnType<typeof mount>) {
  const panel = wrapper.find('[data-testid="slash-menu-panel"]').element.parentElement!
  return panel.classList.contains('opacity-100')
}

describe('SlashCommandMenu', () => {
  it('SlashCommandMenu_TogglesOpen_WhenSlashPressed', async () => {
    const wrapper = mountComponent()

    expect(isPanelOpen(wrapper)).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await nextTick()

    expect(isPanelOpen(wrapper)).toBe(true)

    wrapper.unmount()
  })

  it('SlashCommandMenu_StaysClosed_WhenSlashPressedInInput', async () => {
    const container = document.createElement('div')
    const input = document.createElement('input')
    container.appendChild(input)
    document.body.appendChild(container)

    const wrapper = mountComponent()
    input.focus()

    // Dispatch from the input so e.target is the input element (bubbles to window)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))
    await nextTick()

    expect(isPanelOpen(wrapper)).toBe(false)

    wrapper.unmount()
    document.body.removeChild(container)
  })

  it('SlashCommandMenu_Closes_WhenEscapePressed', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await nextTick()
    expect(isPanelOpen(wrapper)).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(isPanelOpen(wrapper)).toBe(false)

    wrapper.unmount()
  })

  it('SlashCommandMenu_Closes_WhenSlashPressedAgain', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await nextTick()
    expect(isPanelOpen(wrapper)).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await nextTick()
    expect(isPanelOpen(wrapper)).toBe(false)

    wrapper.unmount()
  })

  it('SlashCommandMenu_EmitsCommand_WhenStandupClicked', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await nextTick()

    await wrapper.find('[data-testid="cmd-standup"]').trigger('click')

    expect(wrapper.emitted('command')).toBeTruthy()
    expect(wrapper.emitted('command')![0]).toEqual(['standup'])

    wrapper.unmount()
  })

  it('SlashCommandMenu_EmitsCommand_WhenWeeklyClicked', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await nextTick()

    await wrapper.find('[data-testid="cmd-weekly"]').trigger('click')

    expect(wrapper.emitted('command')).toBeTruthy()
    expect(wrapper.emitted('command')![0]).toEqual(['weekly'])

    wrapper.unmount()
  })

  it('SlashCommandMenu_EmitsCommand_AndCloses_WhenEvaluateMyWeekClicked', async () => {
    const wrapper = mountComponent()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await nextTick()
    expect(isPanelOpen(wrapper)).toBe(true)

    await wrapper.find('[data-testid="cmd-evaluate-my-week"]').trigger('click')

    expect(wrapper.emitted('command')).toBeTruthy()
    expect(wrapper.emitted('command')![0]).toEqual(['evaluate-my-week'])
    expect(isPanelOpen(wrapper)).toBe(false)

    wrapper.unmount()
  })
})
