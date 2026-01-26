"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

type SakuraLogoProps = {
  className?: string;
  title?: string;
};

/**
 * Sakura blossom SVG (pink-white) with transparent background.
 * - สีชมพูอมขาวแบบซากุระ
 * - ไม่มีพื้นหลัง
 */
export function SakuraLogo({ className, title = "Sakura" }: SakuraLogoProps) {
  const gid = useId().replace(/:/g, "");
  const gradPetal = `sakuraPetal-${gid}`;
  const gradCenter = `sakuraCenter-${gid}`;
  const glow = `sakuraGlow-${gid}`;

  return (
    <svg
      className={cn("inline-block", className)}
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={gradPetal} cx="35%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#fff7fb" stopOpacity="1" />
          <stop offset="45%" stopColor="#ffd6e6" stopOpacity="1" />
          <stop offset="75%" stopColor="#ff9fca" stopOpacity="1" />
          <stop offset="100%" stopColor="#ff6fb0" stopOpacity="1" />
        </radialGradient>

        <radialGradient id={gradCenter} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fff8cc" stopOpacity="1" />
          <stop offset="55%" stopColor="#ffd27a" stopOpacity="1" />
          <stop offset="100%" stopColor="#ff9b2f" stopOpacity="1" />
        </radialGradient>

        <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 0.75 0 0 0
              0 0.85 1 0 0
              0 0 0 0.55 0"
            result="pinkGlow"
          />
          <feMerge>
            <feMergeNode in="pinkGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer petals (5 petals) */}
      <g filter={`url(#${glow})`}>
        {/* Petal 1 */}
        <path
          d="M64 14
             C52 16,44 28,44 40
             C44 52,54 60,64 56
             C74 60,84 52,84 40
             C84 28,76 16,64 14Z"
          fill={`url(#${gradPetal})`}
        />
        {/* Petal 2 */}
        <path
          d="M104 36
             C96 26,82 24,72 30
             C62 36,60 48,68 54
             C72 64,86 66,96 58
             C106 50,112 44,104 36Z"
          fill={`url(#${gradPetal})`}
          transform="rotate(72 64 64)"
        />
        {/* Petal 3 */}
        <path
          d="M104 36
             C96 26,82 24,72 30
             C62 36,60 48,68 54
             C72 64,86 66,96 58
             C106 50,112 44,104 36Z"
          fill={`url(#${gradPetal})`}
          transform="rotate(144 64 64)"
        />
        {/* Petal 4 */}
        <path
          d="M104 36
             C96 26,82 24,72 30
             C62 36,60 48,68 54
             C72 64,86 66,96 58
             C106 50,112 44,104 36Z"
          fill={`url(#${gradPetal})`}
          transform="rotate(216 64 64)"
        />
        {/* Petal 5 */}
        <path
          d="M104 36
             C96 26,82 24,72 30
             C62 36,60 48,68 54
             C72 64,86 66,96 58
             C106 50,112 44,104 36Z"
          fill={`url(#${gradPetal})`}
          transform="rotate(288 64 64)"
        />

        {/* Petal highlights */}
        <path
          d="M64 19
             C55 21,49 30,49 39
             C49 48,56 54,64 51
             C72 54,79 48,79 39
             C79 30,73 21,64 19Z"
          fill="#ffffff"
          opacity="0.28"
        />
      </g>

      {/* Center */}
      <circle cx="64" cy="64" r="13" fill={`url(#${gradCenter})`} />
      <circle cx="64" cy="64" r="6.5" fill="#fff4c7" opacity="0.9" />

      {/* Small dots (stamens) */}
      <g fill="#ffb24a" opacity="0.95">
        <circle cx="64" cy="45.5" r="1.8" />
        <circle cx="77" cy="52" r="1.8" />
        <circle cx="81" cy="65" r="1.8" />
        <circle cx="73.5" cy="77.5" r="1.8" />
        <circle cx="58" cy="82" r="1.8" />
        <circle cx="47" cy="71" r="1.8" />
        <circle cx="46.5" cy="57" r="1.8" />
        <circle cx="54.5" cy="48" r="1.8" />
      </g>
    </svg>
  );
}
