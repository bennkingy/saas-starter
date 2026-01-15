"use client";

import { useEffect, useRef } from 'react';

type HeroParallaxImageProps = {
  src: string;
  alt: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(from: number, to: number, factor: number) {
  return from + (to - from) * factor;
}

export function HeroParallaxImage({ src, alt }: HeroParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0, rx: 0, ry: 0 });
  const currentRef = useRef({ x: 0, y: 0, rx: 0, ry: 0 });

  useEffect(() => {
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const applyTransform = () => {
      if (!cardRef.current) return;

      if (reduceMotionQuery.matches) {
        cardRef.current.style.transform = '';
        return;
      }

      const current = currentRef.current;
      const target = targetRef.current;

      const nextX = lerp(current.x, target.x, 0.12);
      const nextY = lerp(current.y, target.y, 0.12);
      const nextRx = lerp(current.rx, target.rx, 0.12);
      const nextRy = lerp(current.ry, target.ry, 0.12);

      currentRef.current = { x: nextX, y: nextY, rx: nextRx, ry: nextRy };

      cardRef.current.style.transform = `perspective(900px) translate3d(${nextX.toFixed(
        2
      )}px, ${nextY.toFixed(2)}px, 0) rotateX(${nextRx.toFixed(2)}deg) rotateY(${nextRy.toFixed(
        2
      )}deg)`;
    };

    const tick = () => {
      applyTransform();
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const normalizedX = clamp((event.clientX - centerX) / (rect.width / 2), -1, 1);
    const normalizedY = clamp((event.clientY - centerY) / (rect.height / 2), -1, 1);

    targetRef.current = {
      x: normalizedX * 14,
      y: normalizedY * 10,
      rx: normalizedY * -4,
      ry: normalizedX * 4,
    };
  };

  const handlePointerLeave = () => {
    targetRef.current = { x: 0, y: 0, rx: 0, ry: 0 };
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg"
    >
      <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-primary/10 blur-3xl" />

      <div className="absolute inset-0 -z-10 overflow-hidden rounded-[2.5rem]">
        <img
          src={src}
          alt=""
          className="h-full w-full scale-110 object-cover blur-2xl opacity-60"
          draggable={false}
        />
      </div>

      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-[2.5rem] border border-gray-200/70 bg-white/50 shadow-lg backdrop-blur-md transition-transform duration-150 ease-out will-change-[transform]"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-white/10 to-transparent" />
        <img
          src={src}
          alt={alt}
          className="relative h-full w-full object-cover"
          draggable={false}
        />
      </div>
    </div>
  );
}

