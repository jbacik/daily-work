import { mount } from '@vue/test-utils'
import DailyReflection from './DailyReflection.vue'

describe('DailyReflection', () => {
  it('DailyReflection_RendersThreeTextareas_WithPlaceholders', () => {
    const wrapper = mount(DailyReflection)

    expect(wrapper.find('[data-testid="reflect-wins"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reflect-whines"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reflect-value-adds"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="reflect-wins"]').attributes('placeholder')).toContain('landed')
    expect(wrapper.get('[data-testid="reflect-whines"]').attributes('placeholder')).toContain('blocked')
  })

  it('DailyReflection_ShowsOptionalHint_WithoutCharGuidance', () => {
    const wrapper = mount(DailyReflection)

    const header = wrapper.get('[data-testid="daily-reflection"]').text()
    expect(header).toContain('(optional)')
    // Decision 17: no char counter / guidance
    expect(header).not.toContain('chars')
  })

  it('DailyReflection_EmitsReflections_WhenWinsTyped', async () => {
    const wrapper = mount(DailyReflection)

    await wrapper.get('[data-testid="reflect-wins"]').setValue('Shipped the feature')

    const emitted = wrapper.emitted('update:reflections')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1]).toEqual([{ wins: 'Shipped the feature', whines: '', valueAdds: '' }])
  })

  it('DailyReflection_PrefillsTextareas_WhenInitialProvided', () => {
    const wrapper = mount(DailyReflection, {
      props: { initial: { wins: 'Saved win', whines: 'Saved whine', valueAdds: '' } },
    })

    expect((wrapper.get('[data-testid="reflect-wins"]').element as HTMLTextAreaElement).value).toBe('Saved win')
    expect((wrapper.get('[data-testid="reflect-whines"]').element as HTMLTextAreaElement).value).toBe('Saved whine')
    expect((wrapper.get('[data-testid="reflect-value-adds"]').element as HTMLTextAreaElement).value).toBe('')
  })

  it('DailyReflection_EmitsAllThreeFields_WhenAllFilled', async () => {
    const wrapper = mount(DailyReflection)

    await wrapper.get('[data-testid="reflect-wins"]').setValue('W')
    await wrapper.get('[data-testid="reflect-whines"]').setValue('X')
    await wrapper.get('[data-testid="reflect-value-adds"]').setValue('Y')

    const emitted = wrapper.emitted('update:reflections')!
    expect(emitted[emitted.length - 1]).toEqual([{ wins: 'W', whines: 'X', valueAdds: 'Y' }])
  })
})
