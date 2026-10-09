// Reads an edited contenteditable answer back into markdown: <strong>/<b> become **bold**,
// and the <br>/<div> line breaks the browser inserts on Enter become newlines.
export function answerElementToMarkdown(el: HTMLElement): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (!(node instanceof HTMLElement)) return ''
    if (node.tagName === 'BR') return '\n'
    const inner = Array.from(node.childNodes).map(walk).join('')
    if (node.tagName === 'STRONG' || node.tagName === 'B') return inner ? `**${inner}**` : ''
    if (node.tagName === 'DIV' || node.tagName === 'P') return `\n${inner}`
    return inner
  }
  return Array.from(el.childNodes).map(walk).join('').replace(/\n{3,}/g, '\n\n').trim()
}

// Returns sections with each answer replaced by what is currently in the editable DOM,
// falling back to the original answer when its element is gone (e.g. the user deleted it).
export function readEditedSections(
  root: HTMLElement | null,
  sections: { question: string; answer: string }[],
): { question: string; answer: string }[] {
  if (!root) return sections
  return sections.map((section, i) => {
    const answerEl = root.querySelector<HTMLElement>(`[data-section-answer="${i}"]`)
    return answerEl ? { question: section.question, answer: answerElementToMarkdown(answerEl) } : section
  })
}
