"use client";

import type { CSSProperties } from "react";

export type ReadinessRingProps = {
  value: number | null;
  progress?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  centerLabel?: string;
  className?: string;
  trackColor?: string;
  progressColor?: string;
};

export function ReadinessRing({
  value,
  progress = value ?? 0,
  size = 140,
  strokeWidth = 10,
  label,
  centerLabel,
  className,
  trackColor = "var(--color-graphite-700)",
  progressColor = "var(--color-pink-500)",
}: ReadinessRingProps) {
  const safeProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className={className}
      style={{
        "--ring-circumference": circumference,
        "--ring-offset": circumference * (1 - safeProgress / 100),
      } as CSSProperties}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={progressColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - safeProgress / 100)}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={value === null ? size * 0.14 : size * 0.24}
        fontWeight={700}
        fill="currentColor"
      >
        {centerLabel ?? (value === null ? "Дані" : `${value}%`)}
      </text>
    </svg>
  );
}
