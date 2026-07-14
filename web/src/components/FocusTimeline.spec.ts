import { mount } from '@vue/test-utils'
import FocusTimeline from './FocusTimeline.vue'
import type { ForecastFocusBlock } from '@/types'

const WINDOW = '08:00-17:00 ET'

function mountComponent(blocks: ForecastFocusBlock[], recommendedLunch: string | null = null) {
  return mount(FocusTimeline, {
    props: { blocks, recommendedLunch, workdayWindow: WINDOW },
  })
}

describe('FocusTimeline', () => {
  it('FocusTimeline_RendersEighteenCells_WhenWindowIsEightToFive', () => {
    // Arrange / Act
    const wrapper = mountComponent([])

    // Assert
    expect(wrapper.findAll('[data-testid="timeline-cell"]')).toHaveLength(18)
  })

  it('FocusTimeline_MarksFocusSegments_WhenBlocksProvided', () => {
    // Arrange / Act — 08:30-10:00 spans three full half-hour cells
    const wrapper = mountComponent([
      { startTime: '08:30 ET', endTime: '10:00 ET', duration: '90 min' },
    ])

    // Assert
    const focusSegments = wrapper.findAll('[data-kind="focus"]')
    expect(focusSegments).toHaveLength(3)
    focusSegments.forEach(seg => {
      expect(seg.attributes('style')).toContain('width: 100%')
    })
  })

  it('FocusTimeline_MarksLunchSegments_WhenLunchProvided', () => {
    // Arrange / Act
    const wrapper = mountComponent([], '11:30-12:00 ET')

    // Assert
    const lunchSegments = wrapper.findAll('[data-kind="lunch"]')
    expect(lunchSegments).toHaveLength(1)
    expect(lunchSegments[0]!.attributes('style')).toContain('width: 100%')
  })

  it('FocusTimeline_RendersPartialSegment_WhenBlockEndsMidCell', () => {
    // Arrange / Act — a 40-min block: full first cell + 10 min (33%) of the second
    const wrapper = mountComponent([
      { startTime: '08:30 ET', endTime: '09:10 ET', duration: '40 min' },
    ])

    // Assert
    const focusSegments = wrapper.findAll('[data-kind="focus"]')
    expect(focusSegments).toHaveLength(2)
    const partialWidth = parseFloat(
      focusSegments[1]!.attributes('style')!.match(/width:\s*([\d.]+)%/)![1]!,
    )
    expect(partialWidth).toBeCloseTo(33.33, 1)
  })
})
