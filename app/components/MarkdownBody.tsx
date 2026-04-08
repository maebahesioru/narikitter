'use client'

import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

/** GFM（表・取り消し線・タスクリスト等）→ remark-breaks（単一改行を <br> に） */
const remarkPlugins = [remarkGfm, remarkBreaks]

/**
 * HTML の p 内にブロックが入るとブラウザが DOM を壊し React が removeChild で失敗することがあるため、段落を div で出す
 */
const components: Components = {
  p: ({ children }) => <div className="markdown-p">{children}</div>,
  table: ({ children }) => (
    <div className="md-table-wrap">
      <table className="md-table">{children}</table>
    </div>
  ),
  blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
  hr: () => <hr className="md-hr" />,
  a: ({ href, children }) => {
    const external = href?.startsWith('http://') || href?.startsWith('https://')
    return (
      <a
        href={href}
        className="md-link"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    )
  },
  img: ({ src, alt }) => (
    <img src={src ?? ''} alt={alt ?? ''} className="md-img" loading="lazy" />
  ),
}

export function MarkdownBody({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`markdown-body ${className ?? ''}`.trim()}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
