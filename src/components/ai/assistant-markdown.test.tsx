import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AssistantMarkdown } from './assistant-markdown'

const render = (text: string, streaming = false) =>
  renderToStaticMarkup(<AssistantMarkdown text={text} streaming={streaming} />)

describe('AssistantMarkdown', () => {
  it('renders message formatting and GFM tables as semantic elements', () => {
    const html = render(
      '**重点**\n\n- 第一步\n- 第二步\n\n> 引用\n\n```js\nconst x = 1\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |',
    )
    for (const tag of ['strong', 'ul', 'li', 'blockquote', 'pre', 'code', 'table']) {
      expect(html).toContain(`<${tag}`)
    }
    expect(html).not.toContain('<p><div')
  })

  it('keeps model HTML inert, filters dangerous links, and does not fetch images', () => {
    const html = render(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[bad](javascript:alert%281%29)\n\n![图片](https://example.com/tracker.png)\n\n[good](https://example.com)',
    )
    expect(html).not.toMatch(/<(script|img|iframe)\b/)
    expect(html).not.toMatch(/href="javascript:/)
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('图片')
  })

  it('parses accumulated chunks and shows unfinished syntax after streaming stops', () => {
    const chunks = ['正文\n\n**', '重要', '**']
    let text = ''
    for (const chunk of chunks) {
      text += chunk
      expect(() => render(text, true)).not.toThrow()
    }
    expect(render(text, true)).toContain('<strong>重要</strong>')
    expect(render('正文\n\n**未完成', false)).toContain('未完成')
    expect(render('正文\n\n**未完成', true)).not.toContain('**')
    expect(render('正文\n\n**未完成', false)).toContain('**未完成')
  })
})
