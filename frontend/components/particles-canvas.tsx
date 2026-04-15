'use client';

import { useEffect, useRef } from 'react';

export function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.4 + Math.random() * 1.1,
      alpha: 0.12 + Math.random() * 0.28,
      vx: (Math.random() - 0.5) * 0.15,
      vy: 0.06 + Math.random() * 0.12
    }));

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    window.addEventListener('resize', resize);
    let frame = 0;
    let animationFrame: number;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      stars.forEach(star => {
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y > height) star.y = 0;

        context.beginPath();
        context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(148, 163, 184, ${star.alpha})`;
        context.fill();
      });

      context.save();
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      context.lineWidth = 1.5;
      context.beginPath();
      const centerX = width * 0.3;
      const centerY = height * 0.25;
      const pulse = 6 + Math.sin(frame * 0.01) * 4;
      context.arc(centerX, centerY, 110 + pulse, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      frame += 1;
      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
