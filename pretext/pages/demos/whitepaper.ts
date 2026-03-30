/*
  Whitepaper page for "Confidential Data Rails" — laid out with Pretext.

  All body text (abstract, introduction) is measured and line-broken by Pretext's
  layoutNextLine(), so we can later drop in image obstacles and have text reflow
  around them live. Header elements (title, authors, etc.) are statically placed.
*/
import {
  prepareWithSegments,
  layoutNextLine,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from '../../src/layout.ts'

// ─── Content ───────────────────────────────────────────────────────────────────

const TITLE = 'Confidential Data Rails'
const SUBTITLE = 'Secure, Confidential, Programmable Transfer of Data'
const VERSION = 'Version 0.11 - November 2025'

const AUTHORS = [
  { name: 'Ramtin M. Seraj', email: 'ramtin.seraj@piplabs.xyz' },
  { name: 'Wenxing Duan', email: 'wenxing.duan@piplabs.xyz' },
  { name: 'Hansol Lee', email: 'hansol.lee@piplabs.xyz' },
  { name: 'Steven Wang', email: 'steven.wang@piplabs.xyz' },
  { name: 'Jongwon Park', email: 'jongwon@piplabs.xyz' },
  { name: 'Hao (Leo) Chen', email: 'leo@piplabs.xyz' },
]

const ABSTRACT_TEXT = `We introduce Confidential Data Rails (CDR), a secure and programmable on-chain storage and transfer protocol for private data. This novel core functionality of Story allows users to securely upload confidential data to the network and define on-chain access conditions. The data then becomes automatically accessible to other users who meet those conditions. The CDR protocol is powered by a decentralized collection of trusted execution environments (TEEs) that operate off-chain and are managed and synchronized by a smart contract on Story. Built on the same secure foundation of Story, this architecture ensures complete data confidentiality while offering flexibility through programmable access control and decentralized infrastructure. IP Vault is one of the first applications of this powerful protocol. It allows IP owners to securely attach confidential data to their registered on-chain IP assets, data that becomes automatically accessible to license holders without further IP owner involvement. IP Vault combined with Story\u2019s existing powerful infrastructure for IP, streamlines the entire journey of IP assets, from registration and licensing to monetization and automatic confidential data delivery. This integrated ecosystem makes IP assets truly programmable and creates an open, composable marketplace for IP data assets (AI datasets, API keys, \u2026) with privacy preserved throughout the lifecycle.`

const INTRO_P1 = `Earlier this year, Story[1] was launched as a scalable layer 1 blockchain designed to help creators register, manage and monetize their intellectual property (IP), such as art, music, data and AI models, as programmable assets on the chain.`

const INTRO_P2 = `Story uses a novel multi-core architecture where a main EVM-compatible core automatically triggers a collection of specialized cores for enhanced performance. For instance, the IP Core, the first specialized core on Story, handles IP registration, licensing, and tracking derivative works through large and complex IP webs with thousands of connections. It`

// ─── Typography ────────────────────────────────────────────────────────────────

const BODY_FONT = '16px "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
const BODY_LINE_HEIGHT = 23
const PARAGRAPH_INDENT = 28
const MAX_CONTENT_WIDTH = 540
const MIN_MARGIN = 48

// ─── Obstacle state (for later image wrapping) ────────────────────────────────

type Obstacle = { x: number; y: number; width: number; height: number }
const obstacles: Obstacle[] = []

// Expose globally so obstacles can be added from the console for testing:
//   addObstacle({ x: 340, y: 600, width: 200, height: 160 })
;(window as any).addObstacle = (obs: Obstacle) => {
  obstacles.push(obs)
  render()
}
;(window as any).clearObstacles = () => {
  obstacles.length = 0
  render()
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type PositionedLine = { x: number; y: number; text: string; width: number }

// ─── DOM ───────────────────────────────────────────────────────────────────────

const stage = document.getElementById('stage')!
const linePool: HTMLElement[] = []
let poolCursor = 0

function acquire(tag: string, className: string): HTMLElement {
  let el: HTMLElement
  if (poolCursor < linePool.length) {
    el = linePool[poolCursor]
    if (el.tagName.toLowerCase() !== tag) {
      const replacement = document.createElement(tag)
      el.replaceWith(replacement)
      linePool[poolCursor] = replacement
      el = replacement
    }
  } else {
    el = document.createElement(tag)
    linePool.push(el)
    stage.appendChild(el)
  }
  poolCursor++
  el.className = className
  el.style.cssText = ''
  el.style.display = ''
  return el
}

function hideUnused(): void {
  for (let i = poolCursor; i < linePool.length; i++) {
    linePool[i].style.display = 'none'
  }
}

function placeEl(el: HTMLElement, x: number, y: number, width: number): HTMLElement {
  el.style.position = 'absolute'
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  el.style.width = `${width}px`
  return el
}

// ─── Obstacle-aware line layout ────────────────────────────────────────────────

function getSlot(
  baseX: number,
  y: number,
  lineHeight: number,
  fullWidth: number,
): { x: number; width: number } {
  let left = baseX
  let right = baseX + fullWidth

  for (const obs of obstacles) {
    const bandTop = y
    const bandBottom = y + lineHeight
    // skip if obstacle doesn't overlap this line band
    if (bandBottom <= obs.y || bandTop >= obs.y + obs.height) continue

    if (obs.x <= left) {
      // obstacle covers the left edge — push text right
      left = Math.max(left, obs.x + obs.width + 12)
    } else if (obs.x + obs.width >= right) {
      // obstacle covers the right edge — shrink text
      right = Math.min(right, obs.x - 12)
    } else {
      // obstacle in the middle — take the wider side
      const leftGap = obs.x - 12 - left
      const rightGap = right - (obs.x + obs.width + 12)
      if (leftGap >= rightGap) {
        right = obs.x - 12
      } else {
        left = obs.x + obs.width + 12
      }
    }
  }

  return { x: left, width: Math.max(right - left, 60) }
}

function layoutParagraph(
  prepared: PreparedTextWithSegments,
  baseX: number,
  startY: number,
  fullWidth: number,
  lineHeight: number,
  indent: number,
): { lines: PositionedLine[]; endY: number } {
  const lines: PositionedLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = startY
  let isFirst = true

  while (true) {
    const { x, width } = getSlot(baseX, y, lineHeight, fullWidth)
    const lineIndent = isFirst ? indent : 0
    const effectiveWidth = width - lineIndent
    if (effectiveWidth < 40) {
      // slot too narrow (obstacle), skip this line band
      y += lineHeight
      continue
    }
    const line = layoutNextLine(prepared, cursor, effectiveWidth)
    if (line === null) break
    lines.push({ x: x + lineIndent, y, text: line.text, width: line.width })
    cursor = line.end
    y += lineHeight
    isFirst = false
  }

  return { lines, endY: y }
}

// ─── Prepare text (one-time, after fonts load) ─────────────────────────────────

await document.fonts.ready

const preparedAbstract = prepareWithSegments(ABSTRACT_TEXT, BODY_FONT)
const preparedIntro1 = prepareWithSegments(INTRO_P1, BODY_FONT)
const preparedIntro2 = prepareWithSegments(INTRO_P2, BODY_FONT)

// ─── Render ────────────────────────────────────────────────────────────────────

function render(): void {
  poolCursor = 0

  const stageWidth = stage.clientWidth
  const contentWidth = Math.min(MAX_CONTENT_WIDTH, stageWidth - MIN_MARGIN * 2)
  const marginLeft = Math.round((stageWidth - contentWidth) / 2)

  let y = 52

  // ── Title (italic, centered) ──
  const titleEl = acquire('div', 'wp-title')
  titleEl.textContent = TITLE
  placeEl(titleEl, marginLeft, y, contentWidth)
  y += 42

  // ── Subtitle (centered) ──
  const subtitleEl = acquire('div', 'wp-subtitle')
  subtitleEl.textContent = SUBTITLE
  placeEl(subtitleEl, marginLeft, y, contentWidth)
  y += 42

  // ── Version (centered) ──
  const versionEl = acquire('div', 'wp-version')
  versionEl.textContent = VERSION
  placeEl(versionEl, marginLeft, y, contentWidth)
  y += 48

  // ── Authors (3 columns × 2 rows) ──
  const colWidth = Math.floor(contentWidth / 3)
  for (let i = 0; i < AUTHORS.length; i++) {
    const col = i % 3
    const row = Math.floor(i / 3)
    const ax = marginLeft + col * colWidth
    const ay = y + row * 44

    const nameEl = acquire('div', 'wp-author-name')
    nameEl.textContent = AUTHORS[i].name
    placeEl(nameEl, ax, ay, colWidth)

    const emailEl = acquire('div', 'wp-author-email')
    emailEl.textContent = AUTHORS[i].email
    placeEl(emailEl, ax, ay + 22, colWidth)
  }
  y += 2 * 44 + 16

  // ── Abstract header (bold, centered) ──
  const abstractHeader = acquire('div', 'wp-abstract-header')
  abstractHeader.textContent = 'Abstract'
  placeEl(abstractHeader, marginLeft, y, contentWidth)
  y += 30

  // ── Abstract body (Pretext-powered) ──
  const absResult = layoutParagraph(
    preparedAbstract, marginLeft, y, contentWidth, BODY_LINE_HEIGHT, PARAGRAPH_INDENT,
  )
  for (const line of absResult.lines) {
    const el = acquire('span', 'wp-body-line')
    el.textContent = line.text
    el.style.position = 'absolute'
    el.style.left = `${line.x}px`
    el.style.top = `${line.y}px`
  }
  y = absResult.endY + 32

  // ── Section 1: Introduction ──
  const secNumEl = acquire('span', 'wp-section-number')
  secNumEl.textContent = '1'
  secNumEl.style.position = 'absolute'
  secNumEl.style.left = `${marginLeft}px`
  secNumEl.style.top = `${y}px`

  const secTitleEl = acquire('span', 'wp-section-title')
  secTitleEl.textContent = 'Introduction'
  secTitleEl.style.position = 'absolute'
  secTitleEl.style.left = `${marginLeft + 36}px`
  secTitleEl.style.top = `${y}px`
  y += 38

  // ── Intro paragraph 1 (no indent — first after heading) ──
  const intro1Result = layoutParagraph(
    preparedIntro1, marginLeft, y, contentWidth, BODY_LINE_HEIGHT, 0,
  )
  for (const line of intro1Result.lines) {
    const el = acquire('span', 'wp-body-line')
    el.textContent = line.text
    el.style.position = 'absolute'
    el.style.left = `${line.x}px`
    el.style.top = `${line.y}px`
  }
  y = intro1Result.endY

  // ── Intro paragraph 2 (indented) ──
  const intro2Result = layoutParagraph(
    preparedIntro2, marginLeft, y, contentWidth, BODY_LINE_HEIGHT, PARAGRAPH_INDENT,
  )
  for (const line of intro2Result.lines) {
    const el = acquire('span', 'wp-body-line')
    el.textContent = line.text
    el.style.position = 'absolute'
    el.style.left = `${line.x}px`
    el.style.top = `${line.y}px`
  }
  y = intro2Result.endY + 40

  // ── Page number ──
  const pageNumEl = acquire('div', 'wp-page-number')
  pageNumEl.textContent = '1'
  placeEl(pageNumEl, marginLeft, y, contentWidth)
  y += 40

  // ── Finalize ──
  stage.style.height = `${y}px`
  hideUnused()
}

// ─── Init & events ─────────────────────────────────────────────────────────────

render()

let scheduled = false
window.addEventListener('resize', () => {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    render()
  })
})
