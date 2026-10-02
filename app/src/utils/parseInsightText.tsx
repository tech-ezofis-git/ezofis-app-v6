import React from 'react'

/**
 * Parses inline HTML tags commonly returned in AI insights (such as <mark>, <b>, <strong>, <i>, <em>, <code>)
 * into formatted React nodes, ensuring <mark> renders as a styled highlight element instead of plain escaped text.
 */
export function parseInsightText(text: React.ReactNode): React.ReactNode {
  if (typeof text !== 'string') return text
  if (!text.includes('<')) return text

  const regex =
    /<mark>(.*?)<\/mark>|<b>(.*?)<\/b>|<strong>(.*?)<\/strong>|<i>(.*?)<\/i>|<em>(.*?)<\/em>|<code>(.*?)<\/code>/gi
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[1] !== undefined) {
      parts.push(
        <mark
          className='bg-yellow-3 text-yellow-11 rounded px-1 py-0.5 font-medium'
          key={match.index}
        >
          {match[1]}
        </mark>,
      )
    } else if (match[2] !== undefined || match[3] !== undefined) {
      const boldText = match[2] ?? match[3]
      parts.push(
        <strong className='font-semibold text-text-primary' key={match.index}>
          {boldText}
        </strong>,
      )
    } else if (match[4] !== undefined || match[5] !== undefined) {
      const italicText = match[4] ?? match[5]
      parts.push(
        <em className='italic' key={match.index}>
          {italicText}
        </em>,
      )
    } else if (match[6] !== undefined) {
      parts.push(
        <code
          className='rounded bg-surface-secondary px-1 py-0.5 font-mono text-xs'
          key={match.index}
        >
          {match[6]}
        </code>,
      )
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>
}
