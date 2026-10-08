# Endless Slider

An Awwwards-style endless image slider. Cards fan along a curved path, wrap without a seam, and settle with a long, floaty glide.

Built with **Next.js**, **GSAP**, **Lenis**, and Unsplash photography.

---

## Features

- **Endless loop** — the deck wraps in both directions; there is no first or last slide
- **Curved fan** — each card tilts, scales, blurs, and dims based on its offset from the active one
- **Smooth input** — wheel, drag, arrows, and click all drive the same Lenis playhead
- **Duotone stills** — grayscale photos sit on a per-slide colour with multiply blending
- **Keyboard & pointer** — arrow keys, prev/next buttons, click a card to jump to it

## Controls

| Input | Action |
| --- | --- |
| Scroll / trackpad | Glide through the deck |
| Drag | Scrub, then snap to the nearest card |
| Click a card | Animate that slide to the front |
| `←` `→` / `↑` `↓` | Step one card |
| Footer arrows | Same as the arrow keys |

## Tech stack

| | |
| --- | --- |
| [Next.js](https://nextjs.org) 16 | App Router, React 19 |
| [GSAP](https://gsap.com) | `ticker` drives the render loop |
| [Lenis](https://github.com/darkroomengineering/lenis) | Smooth scroll as the slider’s playhead |
| [Tailwind CSS](https://tailwindcss.com) 4 | Overlay UI and layout |
| [Unsplash](https://unsplash.com) | Remote portraits, resized on the CDN |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # serve the build
npm run lint    # eslint
```

## Project structure

```
app/
  components/endless-slider.tsx   # stage, poses, Lenis, input
  lib/slides.ts                   # titles, colours, Unsplash ids
  page.tsx                        # mounts the slider
  layout.tsx
  globals.css
```

The homepage is only the slider. Layout, motion, and input all live in `endless-slider.tsx`. Slide copy and images live in `slides.ts`.

## How it works

Each card is placed from a signed offset `o` from the active slide. Pose (x, rotate, scale, blur, brightness, opacity) is a function of that offset, so the whole fan is one set of numbers in `CONFIG`.

Lenis does not scroll the page. It smooths a hidden scroller; the slider reads that position every GSAP tick and draws the cards. Wheel, drag, and buttons all write to the same playhead, so every input feels like the same motion.

The scroller is parked in a long virtual range. When it drifts too far, the position jumps by whole laps — a lap is one full trip around the deck — so the loop never shows a seam.

## Customize

**Slides** — edit `app/lib/slides.ts`. Each entry needs an Unsplash photo id, a title, a category, and a duotone colour.

```ts
{
  id: "01",
  title: "Midnight Profile",
  category: "Portrait",
  photo: "1507003211169-0a1dd7228f2d",
  alt: "Side profile of a man",
  color: "#1d3cf0",
}
```

**Fan & feel** — tweak `CONFIG` and `SCROLL` at the top of `app/components/endless-slider.tsx`.

| Knob | What it changes |
| --- | --- |
| `stepX` | Horizontal gap between cards |
| `stepRotate` | Tilt per step |
| `curveRotate` | Extra tilt that bends the queue |
| `stepScale` / `stepBlur` / `stepDim` | How fast off-center cards shrink, blur, and darken |
| `lerp` | How floaty the glide is (smaller = slower) |
| `wheelPerSlide` | Wheel distance that advances one card |

## License

Private project. Photography via [Unsplash](https://unsplash.com/license).
