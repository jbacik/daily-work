import { mount } from '@vue/test-utils'
import SolidBar from './SolidBar.vue'

describe('SolidBar', () => {
  it('SolidBar_SetsFillWidth_WhenValueProvided', () => {
    // Arrange / Act
    const wrapper = mount(SolidBar, {
      props: { label: 'focus', value: 4.5, max: 9 },
    })

    // Assert
    const fill = wrapper.get('[data-testid="solid-bar-fill"]')
    expect(fill.attributes('style')).toContain('width: 50%')
  })

  it('SolidBar_RendersTargetPipe_WhenTargetProvided', () => {
    // Arrange / Act
    const wrapper = mount(SolidBar, {
      props: { label: 'meet', value: 3.5, target: 2.5, max: 10 },
    })

    // Assert
    const pipe = wrapper.get('[data-testid="solid-bar-target"]')
    expect(pipe.attributes('style')).toContain('left: 25%')
  })

  it('SolidBar_OmitsTargetPipe_WhenTargetAbsent', () => {
    // Arrange / Act
    const wrapper = mount(SolidBar, {
      props: { label: 'meet', value: 3.5, max: 10 },
    })

    // Assert
    expect(wrapper.find('[data-testid="solid-bar-target"]').exists()).toBe(false)
  })
})
