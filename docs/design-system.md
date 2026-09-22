# QjuMe design system

Extracted from the design canvas (`QjuMe Design System.dc.html`). Values are
quoted as the canvas wrote them — the `oklch()` colours are not conversions from
hex, so don't "tidy" them into hex and lose the gamut.

Implemented in `src/index.css`. This file is the source of truth for what the
design said; the stylesheet is the source of truth for what the app does.

## Colour

| Token | Value | Use |
|---|---|---|
| Ink | `#3D3B47` | Primary dark surface — splash, discovery panel, monitor |
| Orange accent | `oklch(0.62 0.19 38)` | **Large or decorative only (≥24px)** — fails contrast below that |
| Orange text/CTA | `oklch(0.5 0.17 42)` | Buttons, wait numbers, links — 4.5:1 safe |
| Orange on dark | `oklch(0.68 0.19 38)` | Eyebrows and labels on ink |
| Cream | `oklch(0.94 0.03 55)` | *Canvas only — see "Adapted" below* |
| Cream line | `oklch(0.88 0.02 55)` | Borders on cream |
| Cream tint | `oklch(0.94 0.015 55)` | Icon tiles, badges |
| Muted | `oklch(0.5 0.02 255 / 0.65)` | Secondary text on white |
| On dark, muted | `oklch(0.72 0.01 255)` | Body text on ink |
| On dark, faint | `oklch(0.6 0.02 255)` | Ghost links on ink |
| Dark inset | `rgba(255,255,255,0.08)` | Panels inside an ink surface |

The two oranges are not interchangeable. That is the single easiest thing to get
wrong in this system.

## Type

- **Sora** — display and body. Weights 400, 600, 700, 800.
- **DM Mono** — labels, timestamps, ticket numbers, figures. Weights 400, 500.

| Role | Spec |
|---|---|
| Eyebrow | DM Mono, 11px, 700, `letter-spacing: .12em`, orange |
| Splash wordmark | `clamp(34px, 6vw, 58px)`, 800, `-0.02em`, line-height 1.02 |
| Screen headline | `clamp(30px, 4.4vw, 46px)`, line-height 1.05, `-0.02em`; **first line 400, payoff 800** |
| Body | 14.5–15px, line-height 1.6, muted |
| Stat | `clamp(30px, 4vw, 40px)`, 800, `-0.01em` |
| Stat label | 11px, 600, `.06em`, uppercase, opacity .7 |

## Radius

| Value | Use |
|---|---|
| 32px | Screen cards |
| 18px | List rows |
| 14px | Tiles inside a dark panel |
| 12px | Sub-panels, icon tiles, inputs |
| 100px | Pills — every button, chip and badge |

## Components

- **Primary button** — `14px 28px`, pill, no border, orange CTA, white, 700, 14.5px. On the splash: `15px 40px`, 15.5px.
- **Secondary** — `12.5px 24px`, pill, `1.5px` border, transparent, 600, 13.5px. Border is white on ink.
- **Ghost link** — 13px, `oklch(0.6 0.02 255)`, 500, trailing `→`.
- **Chip** — `7px 14px`, pill, 12.5px, 600. Unselected: `1.5px` white border. Selected: white fill, ink text.
- **Badge** — 10px, 600, `2px 8px`, pill, cream-tint on ink text. "Closing soon" is orange fill, white text.
- **List row** — white, radius 18px, `15px 18px`; 38px icon tile (radius 12px, cream tint); name 700/14.5px; secondary line 12.5px muted; right column wait 800/15px orange plus mono figures 11.5px.
- **Logo** — a circle containing two dots on a diagonal: outlined (waiting) top-left, filled (called) bottom-right. Orange on the splash, white at 70% in a screen header.

## Screens

**Splash** — full-bleed ink. Logo 44px, wordmark, lede (max-width 380px), the
queue illustration, primary button, ghost link. The illustration is three
outlined figures and one orange "next" figure on a dashed line.

**Customer discovery** — ink panel, radius 32px. Header with logo and a mono
"N nearby". Eyebrow `[ CUSTOMER MODE ]`. Two-weight headline. White rows.
*In the app the logo moved out of this header into the shell's (see
"Adapted"), so the count sits on the eyebrow row instead.*

**Shop / in-shop monitor** — same ink panel and palette as discovery, because
the monitor is customer-facing too. Eyebrow `[ LIVE ]`, two-weight headline,
a progress line of circles, stat pair, "Now serving" tiles, "Up next" rows,
`Call next →` primary and a secondary.

*The monitor also carries a join panel the canvas did not draw: an inset beside
the live list holding a white card with the QR code, under a "Scan to join"
eyebrow. White behind the code is not decoration — a QR read off ink is a coin
flip across a room. It takes a fixed column (300px, growing to `26vw` past
1100px) rather than a fraction: past the size a camera needs, more pixels buy
nothing, while the names beside it can always use the room. Below 860px the two
stack, the list first.*

## Adapted

**Ink fills the viewport; the cream page is gone.** The canvas draws ink panels
floating on a cream page with a 32px radius. In the app the panels are the
page: edge to edge, full height, no radius, one gutter set on `.app`. Cream
survives only as `--cream-tint`, the icon-tile and badge fill inside white
rows. Every component that was a light panel on cream is now an inset
(`rgba(255,255,255,0.08)`) on ink.

**The list fills the window.** The canvas draws one column. The app uses the
whole width — a `minmax(320px, 1fr)` grid past 760px, which is two columns on a
tablet and five on a 1920px display. Prose still caps itself; the page does not.

**A row's shape follows its container, not the viewport.** The canvas's row
assumes width a narrow card does not have, and a card in a three-column grid is
narrower than one in a single-column list. So the figures sit on their own line
under the name by default, aligned to the text rather than the icon, and go
beside it only between 461px and 759px — the range where the list is a single
wide column.

**The mark is an app header, on every screen but the splash.** The canvas puts
the logo inside each screen's own header. In the app the shell renders it once,
as a link home beside the wordmark, so a route added later gets a way back
without anyone remembering to add one. The splash skips it: it is the landing
page, and it carries the mark at full size already.

## Not implemented

- **Filters as a bottom sheet.** The canvas replaces the inline filter controls
  with a "Filters" button opening a sheet (search, distance slider, category),
  plus a chip row for status. The app now hides them behind a button as the
  canvas intended, but reveals them in place rather than in a sheet, and the
  status control is still a select rather than a chip row.
- **Shop admin screens** (queue list, settings, billing, serving) were not drawn.
  They inherit the tokens and components but have no artboard to match.
