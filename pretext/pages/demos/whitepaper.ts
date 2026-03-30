/*
  Whitepaper page for "Confidential Data Rails" — laid out with Pretext.

  All body text (abstract, introduction) is measured and line-broken by Pretext's
  layoutNextLine(). Draggable images act as obstacles — text reflows around
  BOTH sides of them live as you drag.
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

// ─── Images ───────────────────────────────────────────────────────────────────

const IMAGE_SRCS = ['ippy.png', 'ippy2.png']
const DISPLAY_WIDTH = 140

// ─── Typography ────────────────────────────────────────────────────────────────

const BODY_FONT = '16px "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'
const BODY_LINE_HEIGHT = 23
const PARAGRAPH_INDENT = 28
const MAX_CONTENT_WIDTH = 540
const MIN_MARGIN = 48
const IMAGE_PADDING = 14
const MIN_SLOT_WIDTH = 40

// ─── Obstacle state ────────────────────────────────────────────────────────────

type Obstacle = { x: number; y: number; width: number; height: number }
const obstacles: Obstacle[] = IMAGE_SRCS.map(() => ({
  x: 0, y: 0, width: DISPLAY_WIDTH, height: DISPLAY_WIDTH,
}))

// ─── Types ─────────────────────────────────────────────────────────────────────

type PositionedLine = { x: number; y: number; text: string; width: number }
type Slot = { x: number; width: number }

// ─── DOM ───────────────────────────────────────────────────────────────────────

const stage = document.getElementById('stage')!
const linePool: HTMLElement[] = []
let poolCursor = 0

// Create draggable images
const blobImgs: HTMLImageElement[] = IMAGE_SRCS.map((src) => {
  const img = document.createElement('img')
  img.src = src
  img.className = 'wp-blob'
  img.draggable = false
  stage.appendChild(img)
  return img
})

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

// ─── Multi-slot line layout (text flows on BOTH sides of ALL obstacles) ────────

function getSlotsForLine(
  baseX: number,
  y: number,
  lineHeight: number,
  fullWidth: number,
): Slot[] {
  const bandTop = y
  const bandBottom = y + lineHeight

  // Start with one full-width slot, then carve out each obstacle
  let slots: Slot[] = [{ x: baseX, width: fullWidth }]

  for (const obs of obstacles) {
    if (
      obs.width <= 0 ||
      bandBottom <= obs.y - IMAGE_PADDING ||
      bandTop >= obs.y + obs.height + IMAGE_PADDING
    ) {
      continue // this obstacle doesn't overlap this line band
    }

    const obsLeft = obs.x - IMAGE_PADDING
    const obsRight = obs.x + obs.width + IMAGE_PADDING

    // Carve this obstacle out of all current slots
    const newSlots: Slot[] = []
    for (const slot of slots) {
      const slotRight = slot.x + slot.width

      // No horizontal overlap
      if (obsRight <= slot.x || obsLeft >= slotRight) {
        newSlots.push(slot)
        continue
      }

      // Left fragment
      const leftWidth = obsLeft - slot.x
      if (leftWidth >= MIN_SLOT_WIDTH) {
        newSlots.push({ x: slot.x, width: leftWidth })
      }

      // Right fragment
      const rightWidth = slotRight - obsRight
      if (rightWidth >= MIN_SLOT_WIDTH) {
        newSlots.push({ x: obsRight, width: rightWidth })
      }
    }
    slots = newSlots
  }

  return slots
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
  let done = false

  while (!done) {
    const slots = getSlotsForLine(baseX, y, lineHeight, fullWidth)

    if (slots.length === 0) {
      y += lineHeight
      continue
    }

    let anyFilled = false

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      const lineIndent = (isFirst && i === 0) ? indent : 0
      const effectiveWidth = slot.width - lineIndent

      if (effectiveWidth < MIN_SLOT_WIDTH) continue

      const line = layoutNextLine(prepared, cursor, effectiveWidth)
      if (line === null) {
        done = true
        break
      }

      lines.push({
        x: slot.x + lineIndent,
        y,
        text: line.text,
        width: line.width,
      })
      cursor = line.end
      anyFilled = true
      isFirst = false
    }

    if (!anyFilled && !done) {
      y += lineHeight
      continue
    }

    y += lineHeight
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

  const titleEl = acquire('div', 'wp-title')
  titleEl.textContent = TITLE
  placeEl(titleEl, marginLeft, y, contentWidth)
  y += 42

  const subtitleEl = acquire('div', 'wp-subtitle')
  subtitleEl.textContent = SUBTITLE
  placeEl(subtitleEl, marginLeft, y, contentWidth)
  y += 42

  const versionEl = acquire('div', 'wp-version')
  versionEl.textContent = VERSION
  placeEl(versionEl, marginLeft, y, contentWidth)
  y += 48

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

  const abstractHeader = acquire('div', 'wp-abstract-header')
  abstractHeader.textContent = 'Abstract'
  placeEl(abstractHeader, marginLeft, y, contentWidth)
  y += 30

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

  const pageNumEl = acquire('div', 'wp-page-number')
  pageNumEl.textContent = '1'
  placeEl(pageNumEl, marginLeft, y, contentWidth)
  y += 40

  // Update all image positions
  for (let i = 0; i < blobImgs.length; i++) {
    const obs = obstacles[i]
    const img = blobImgs[i]
    img.style.left = `${obs.x}px`
    img.style.top = `${obs.y}px`
    img.style.width = `${obs.width}px`
    img.style.height = `${obs.height}px`
  }

  stage.style.height = `${y}px`
  hideUnused()
}

// ─── Dragging ──────────────────────────────────────────────────────────────────

let dragIndex = -1
let dragOffsetX = 0
let dragOffsetY = 0
let renderScheduled = false

function scheduleRender(): void {
  if (renderScheduled) return
  renderScheduled = true
  requestAnimationFrame(() => {
    renderScheduled = false
    render()
  })
}

function setInitialPositions(): void {
  const stageWidth = stage.clientWidth
  const contentWidth = Math.min(MAX_CONTENT_WIDTH, stageWidth - MIN_MARGIN * 2)
  const marginLeft = Math.round((stageWidth - contentWidth) / 2)

  // ippy: right side of abstract
  obstacles[0].x = marginLeft + contentWidth - obstacles[0].width - 20
  obstacles[0].y = 380

  // ippy2: left side, lower down
  if (obstacles.length > 1) {
    obstacles[1].x = marginLeft + 10
    obstacles[1].y = 560
  }
}

// Mouse drag for each image
for (let i = 0; i < blobImgs.length; i++) {
  blobImgs[i].addEventListener('mousedown', (e: MouseEvent) => {
    dragIndex = i
    const stageRect = stage.getBoundingClientRect()
    dragOffsetX = e.clientX - stageRect.left - obstacles[i].x
    dragOffsetY = e.clientY - stageRect.top - obstacles[i].y
    e.preventDefault()
  })

  blobImgs[i].addEventListener('touchstart', (e: TouchEvent) => {
    const touch = e.touches[0]!
    dragIndex = i
    const stageRect = stage.getBoundingClientRect()
    dragOffsetX = touch.clientX - stageRect.left - obstacles[i].x
    dragOffsetY = touch.clientY - stageRect.top - obstacles[i].y
    e.preventDefault()
  }, { passive: false })
}

document.addEventListener('mousemove', (e: MouseEvent) => {
  if (dragIndex < 0) return
  const stageRect = stage.getBoundingClientRect()
  obstacles[dragIndex].x = Math.round(e.clientX - stageRect.left - dragOffsetX)
  obstacles[dragIndex].y = Math.round(e.clientY - stageRect.top - dragOffsetY)
  scheduleRender()
})

document.addEventListener('mouseup', () => {
  dragIndex = -1
})

document.addEventListener('touchmove', (e: TouchEvent) => {
  if (dragIndex < 0) return
  const touch = e.touches[0]!
  const stageRect = stage.getBoundingClientRect()
  obstacles[dragIndex].x = Math.round(touch.clientX - stageRect.left - dragOffsetX)
  obstacles[dragIndex].y = Math.round(touch.clientY - stageRect.top - dragOffsetY)
  scheduleRender()
  e.preventDefault()
}, { passive: false })

document.addEventListener('touchend', () => {
  dragIndex = -1
})

// ─── Init ──────────────────────────────────────────────────────────────────────

let imagesLoaded = 0

function onImageReady(index: number): void {
  const img = blobImgs[index]
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    const aspect = img.naturalHeight / img.naturalWidth
    obstacles[index].width = DISPLAY_WIDTH
    obstacles[index].height = Math.round(DISPLAY_WIDTH * aspect)
  }
  imagesLoaded++
  if (imagesLoaded >= blobImgs.length) {
    setInitialPositions()
    render()
  }
}

for (let i = 0; i < blobImgs.length; i++) {
  const img = blobImgs[i]
  if (img.complete && img.naturalWidth > 0) {
    onImageReady(i)
  } else {
    img.addEventListener('load', () => onImageReady(i))
    img.addEventListener('error', () => {
      obstacles[i].width = 0
      obstacles[i].height = 0
      onImageReady(i)
    })
  }
}

window.addEventListener('resize', scheduleRender)
