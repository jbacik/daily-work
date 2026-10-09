import { answerElementToMarkdown, readEditedSections } from '@/utils/standupMarkdown'

function el(html: string): HTMLElement {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

describe('answerElementToMarkdown', () => {
  it('AnswerElementToMarkdown_RestoresBold_WhenStrongTagsPresent', () => {
    // Arrange
    const answer = el('Shipped <strong>Feature X</strong> today')

    // Act
    const markdown = answerElementToMarkdown(answer)

    // Assert
    expect(markdown).toBe('Shipped **Feature X** today')
  })

  it('AnswerElementToMarkdown_PreservesLineBreaks_WhenBrowserInsertsDivsAndBrs', () => {
    // Arrange
    const answer = el('First line<br>Second line<div>Third line</div>')

    // Act
    const markdown = answerElementToMarkdown(answer)

    // Assert
    expect(markdown).toBe('First line\nSecond line\nThird line')
  })
})

describe('readEditedSections', () => {
  it('ReadEditedSections_ReturnsEditedAnswers_WhenDomWasChanged', () => {
    // Arrange
    const root = el('<div data-section-answer="0">Edited <b>answer</b></div>')
    const sections = [{ question: 'Q1', answer: 'Original answer' }]

    // Act
    const result = readEditedSections(root, sections)

    // Assert
    expect(result).toEqual([{ question: 'Q1', answer: 'Edited **answer**' }])
  })

  it('ReadEditedSections_KeepsOriginalAnswer_WhenAnswerElementMissing', () => {
    // Arrange
    const root = el('')
    const sections = [{ question: 'Q1', answer: 'Original answer' }]

    // Act
    const result = readEditedSections(root, sections)

    // Assert
    expect(result).toEqual(sections)
  })
})
