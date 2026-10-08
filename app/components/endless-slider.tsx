"use client";

import Image from "next/image";
import gsap from "gsap";
import Lenis from "lenis";
import { useCallback, useEffect, useRef, useState } from "react";
import { slides } from "../lib/slides";

/**
 * Layout config. Every card is placed from its signed offset `o` (in slides)
 * from the active card, so all the "fan" tuning lives here.
 */
const CONFIG = {
  /** Slots kept on each side of the active card (the rest is hidden spare). */
  left: 2,
  /** Horizontal shift per step, as a fraction of the card width. */
  stepX: 0.115,
  /** Tilt per step, in degrees (positive offsets lean counter-clockwise). */
  stepRotate: 6.2,
  /** Vertical drift per step, as a fraction of the card height. */
  stepY: 0.0,
  /** Extra tilt that accumulates along the path - this is what bends the
   *  queue into a curve instead of a straight diagonal. */
  curveRotate: 0.55,
  /** Size lost per step. */
  stepScale: 0.062,
  /** Blur (px) added per step. */
  stepBlur: 0.55,
  /** Brightness lost per step, and the floor it can never go under. */
  stepDim: 0.07,
  minBrightness: 0.42,
  /** Drag distance (in card widths) that moves one slide. */
  drag: 1 / 0.34,
};

/** Lenis tuning. */
const SCROLL = {
  /** Scroll pixels that equal one slide. */
  pxPerSlide: 340,
  /** Smoothing of wheel input (smaller = floatier). */
  lerp: 0.055,
  /** Wheel pixels that advance one slide. The glide uses `lerp` the whole way. */
  wheelPerSlide: 90,
};

const COUNT = slides.length;
/** Offsets live in [MIN, MIN + COUNT). Slides wrap from one end to the other. */
const MIN = -(CONFIG.left + 1);

/**
 * Lenis needs a real scrollable area to smooth. We give it a tall invisible
 * one and keep the scroll position parked near the middle. One "lap" is a full
 * trip around all the slides, so shifting by whole laps is invisible.
 */
const LAP = COUNT * SCROLL.pxPerSlide;
const LAPS_EACH_SIDE = 12;
const MID = LAPS_EACH_SIDE * LAP;

const wrap = (value: number, n: number) => ((value % n) + n) % n;
const pad = (n: number) => String(n).padStart(2, "0");
/** Soft ease with no fast kick at the start or the end. */
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** Fast start, used by the arrow buttons and arrow keys. */
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Signed offset of card `index` from the playhead, wrapped into the window. */
const offsetOf = (index: number, position: number) =>
  wrap(index - position - MIN, COUNT) + MIN;

type Pose = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  blur: number;
  brightness: number;
  opacity: number;
};

/**
 * Curve path: each step along the queue pushes the card further out, tilts it
 * a little more than the one before (the tilt itself grows, so the path bends
 * like a snake), and shrinks / blurs / dims it.
 */
function getPose(o: number, W: number, H: number, baseX: number): Pose {
  const d = Math.abs(o);
  const sign = o < 0 ? -1 : 1;

  const rotate = -sign * (d * CONFIG.stepRotate + d * d * CONFIG.curveRotate);
  const x = baseX + o * CONFIG.stepX * W;
  const y = o * CONFIG.stepY * H + sign * d * d * 0.004 * H;
  const scale = Math.max(0.18, 1 - d * CONFIG.stepScale);

  // Only the slides passing through the hidden slots fade, so the jump from
  // one end of the queue to the other is never visible.
  const MAX = MIN + COUNT;
  let opacity = 1;
  if (o < MIN + 1) opacity = o - MIN;
  else if (o > MAX - 1) opacity = MAX - o;

  return {
    x,
    y,
    rotate,
    scale,
    blur: d * CONFIG.stepBlur,
    brightness: Math.max(CONFIG.minBrightness, 1 - d * CONFIG.stepDim),
    opacity: Math.min(1, Math.max(0, opacity)),
  };
}

/**
 * Stacking: cards coming in stay above cards leaving for the whole move, so
 * the next image slides over the current one. There is no halfway restack,
 * which is what made the hand-off jump.
 */
function getZ(o: number, dir: number) {
  const coming = o * dir >= 0;
  return (coming ? 2000 : 1000) - Math.round(Math.abs(o) * 20);
}

export function EndlessSlider() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lenisRef = useRef<Lenis | null>(null);
  const [active, setActive] = useState(0);

  // Animation state lives in a ref: it changes every frame and must not
  // trigger React renders.
  const state = useRef({
    position: MID / SCROLL.pxPerSlide, // drawn playhead, in slides
    lastScroll: -1,
    goal: MID, // where the slider is heading, in scroll px
    dir: 1, // last scroll direction
    width: 0,
    height: 0,
    stageWidth: 0,
    lastActive: 0,
    dragging: false,
    dragStartX: 0,
    dragStartScroll: 0,
    dragDistance: 0,
    wheelAccum: 0,
  });

  const render = useCallback(() => {
    const s = state.current;
    if (!s.width) return;
    // Active card rests on the left, leaving the queue room to trail right.
    const baseX = s.stageWidth * 0.1 + s.width / 2 - s.stageWidth / 2;

    for (let i = 0; i < COUNT; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const o = offsetOf(i, s.position);
      const p = getPose(o, s.width, s.height, baseX);

      el.style.transform = `translate(-50%, -50%) translate(${p.x.toFixed(
        2,
      )}px, ${p.y.toFixed(2)}px) rotate(${p.rotate.toFixed(
        3,
      )}deg) scale(${p.scale.toFixed(4)})`;
      el.style.filter = `blur(${p.blur.toFixed(2)}px) brightness(${p.brightness.toFixed(3)})`;
      el.style.opacity = p.opacity.toFixed(3);
      el.style.zIndex = String(getZ(o, s.dir));
      el.style.visibility = p.opacity <= 0.001 ? "hidden" : "visible";
    }

    const index = wrap(Math.round(s.position), COUNT);
    if (index !== s.lastActive) {
      s.lastActive = index;
      setActive(index);
    }
  }, []);

  /** Glide the slider to an absolute slide number (through Lenis). */
  const goTo = useCallback(
    (
      slide: number,
      duration = 1.8,
      easing: (t: number) => number = easeInOut,
    ) => {
      const lenis = lenisRef.current;
      if (!lenis) return;
      const s = state.current;
      s.wheelAccum = 0;
      s.goal = slide * SCROLL.pxPerSlide;
      lenis.scrollTo(s.goal, {
        duration,
        easing,
        force: true,
        userData: { slider: true },
      });
    },
    [],
  );

  const step = useCallback(
    (dir: number) => {
      goTo(
        Math.round(state.current.goal / SCROLL.pxPerSlide) + dir,
        0.7,
        easeOutExpo,
      );
    },
    [goTo],
  );

  /**
   * Ease onto the nearest card with the same lerp as the wheel, so settling
   * continues the glide instead of kicking into a new animation.
   */
  const settle = useCallback(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    const slide = Math.round(lenis.scroll / SCROLL.pxPerSlide);
    const target = slide * SCROLL.pxPerSlide;
    if (Math.abs(target - lenis.scroll) < 0.5) return;
    state.current.wheelAccum = 0;
    state.current.goal = target;
    lenis.scrollTo(target, {
      lerp: SCROLL.lerp,
      force: true,
      userData: { slider: true },
    });
  }, []);

  // Measure the cards / stage and keep them up to date.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const card = cardRefs.current[0];
      const s = state.current;
      if (card) {
        s.width = card.offsetWidth;
        s.height = card.offsetHeight;
      }
      s.stageWidth = stage.clientWidth;
      render();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [render]);

  // Lenis: smooths wheel input on a hidden scroller; the slider just reads it.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    const s = state.current;

    const lenis = new Lenis({
      wrapper: scroller,
      content,
      eventsTarget: window,
      smoothWheel: true,
      syncTouch: false, // touch is handled by our own drag below
      lerp: SCROLL.lerp,
      wheelMultiplier: 1,
      autoRaf: false,
      // We move the slider ourselves so Lenis doesn't add a second, raw delta
      // on top (that second correction is what snapped the cards).
      virtualScroll(data) {
        const event = data.event;
        if (event.type !== "wheel") return true;
        if (event.cancelable) event.preventDefault();
        const delta =
          Math.abs(data.deltaY) > Math.abs(data.deltaX) ? data.deltaY : data.deltaX;
        s.wheelAccum += delta;
        const steps = Math.trunc(s.wheelAccum / SCROLL.wheelPerSlide);
        if (steps !== 0) {
          s.wheelAccum -= steps * SCROLL.wheelPerSlide;
          const capped = Math.sign(steps) * Math.min(Math.abs(steps), 3);
          s.dir = Math.sign(capped);
          const slide = Math.round(s.goal / SCROLL.pxPerSlide) + capped;
          s.goal = slide * SCROLL.pxPerSlide;
          lenisRef.current?.scrollTo(s.goal, {
            lerp: SCROLL.lerp,
            force: true,
            userData: { slider: true },
          });
        }
        return false;
      },
    });
    lenisRef.current = lenis;

    // Start already resting on the first image. No intro sweep.
    lenis.scrollTo(MID, {
      immediate: true,
      force: true,
      userData: { slider: true },
    });
    s.goal = MID;
    s.position = MID / SCROLL.pxPerSlide;
    s.lastScroll = MID;

    const tick = (time: number) => {
      lenis.raf(time * 1000);
      const scroll = lenis.scroll;

      if (scroll !== s.lastScroll) {
        const delta = scroll - (s.lastScroll < 0 ? scroll : s.lastScroll);
        // Ignore tiny jitter so the stacking direction doesn't flicker.
        if (Math.abs(delta) > 0.4) s.dir = Math.sign(delta);
        s.lastScroll = scroll;
        s.position = scroll / SCROLL.pxPerSlide;
        render();
      }

      // Keep the scroller parked near the middle. Shifting by whole laps lands
      // on the very same card layout, so the loop never shows a seam.
      const drift = scroll - MID;
      const far = Math.abs(drift) > (LAPS_EACH_SIDE - 3) * LAP;
      const idleDrift = !lenis.isScrolling && Math.abs(drift) > LAP;
      if (far || idleDrift) {
        const shift = Math.round(drift / LAP) * LAP;
        lenis.scrollTo(scroll - shift, {
          immediate: true,
          force: true,
          userData: { slider: true },
        });
        s.goal -= shift;
        s.lastScroll = lenis.scroll;
      }
    };
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(tick);
    render();

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [render, settle]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") step(1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // Pointer drag (mouse + touch). Drives Lenis so it is smoothed as well.
  const onPointerDown = (e: React.PointerEvent) => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    const s = state.current;
    s.dragging = true;
    s.dragStartX = e.clientX;
    s.dragStartScroll = lenis.scroll;
    s.dragDistance = 0;
    s.wheelAccum = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const lenis = lenisRef.current;
    const s = state.current;
    if (!lenis || !s.dragging) return;
    const dx = e.clientX - s.dragStartX;
    s.dragDistance = Math.max(s.dragDistance, Math.abs(dx));
    // Only capture the pointer once this is really a drag, otherwise the
    // click would be redirected to the stage and never reach the card.
    if (s.dragDistance > 6 && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const slidesMoved = (dx / s.width) * CONFIG.drag;
    lenis.scrollTo(s.dragStartScroll - slidesMoved * SCROLL.pxPerSlide, {
      lerp: SCROLL.lerp,
      force: true,
      userData: { slider: true },
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    settle();
  };

  const onCardClick = (index: number) => {
    const s = state.current;
    if (s.dragDistance > 6) return;
    const steps = Math.round(offsetOf(index, s.position));
    if (steps === 0) return;
    goTo(Math.round(s.position) + steps);
  };

  const current = slides[active];

  return (
    <main className="relative h-dvh w-full select-none overflow-hidden bg-black text-white">
      {/* Hidden scroll area that Lenis smooths; the slider reads its position. */}
      <div
        ref={scrollerRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={contentRef} style={{ height: `calc(100dvh + ${MID * 2}px)` }} />
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            data-active={i === active}
            onClick={() => onCardClick(i)}
            className="slide-card absolute left-1/2 top-[46%] aspect-[4/5] w-[min(76vw,64dvh)] will-change-transform md:aspect-[3/2] md:w-[min(58vw,100dvh)]"
            style={{ opacity: 0 }}
          >
            {/* Everything visual lives in here so it can scale on hover without
                fighting the per-frame transform on the outer element. */}
            <div className="slide-card-inner relative h-full w-full bg-[#0a0a0a] p-[5px] pb-[22px]">
              <div
                className="relative h-full w-full overflow-hidden"
                style={{ backgroundColor: slide.color, isolation: "isolate" }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="(min-width: 768px) 58vw, 76vw"
                  loading="eager"
                  // Unsplash's CDN already resizes/compresses (see `w` in the URL).
                  unoptimized
                  draggable={false}
                  className="slide-card-img pointer-events-none object-cover mix-blend-multiply grayscale contrast-[1.35] brightness-110"
                />
              </div>
              <span className="pointer-events-none absolute bottom-[5px] left-[8px] text-[9px] font-medium uppercase leading-none tracking-[0.2em] text-white/60">
                {slide.id} &mdash; {slide.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Overlay UI */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[2000] flex items-start justify-between p-5 text-xs font-medium uppercase tracking-[0.2em] mix-blend-difference md:p-8">
        <span>Endless / Slider</span>
        <span className="hidden text-right md:block">
          Drag &middot; Scroll &middot; Arrow keys
        </span>
      </header>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-[2000] flex items-end justify-between gap-6 p-5 mix-blend-difference md:p-8">
        <div className="overflow-hidden">
          <h1
            key={current.id}
            className="slide-title text-3xl font-semibold uppercase leading-none tracking-tighter md:text-5xl"
          >
            {current.title}
          </h1>
        </div>

        <div className="pointer-events-auto flex items-center gap-4">
          <p className="whitespace-nowrap text-sm font-medium tabular-nums tracking-widest">
            {pad(active + 1)} <span className="opacity-50">/ {pad(COUNT)}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => step(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 text-lg transition-colors hover:bg-white hover:text-black"
            >
              &larr;
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => step(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 text-lg transition-colors hover:bg-white hover:text-black"
            >
              &rarr;
            </button>
          </div>
        </div>
      </footer>

      {/* Progress bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2000] h-[3px] bg-white/10">
        <div
          className="h-full bg-white transition-[width] duration-700 ease-out"
          style={{ width: `${((active + 1) / COUNT) * 100}%` }}
        />
      </div>
    </main>
  );
}
