"use client";

import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  // Clamp score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, score));

  // Determine size properties
  let diameter = 48;
  let strokeWidth = 4;
  let textSizeClass = "text-xs font-bold";

  if (size === "sm") {
    diameter = 32;
    strokeWidth = 3;
    textSizeClass = "text-[10px] font-bold";
  } else if (size === "lg") {
    diameter = 64;
    strokeWidth = 6;
    textSizeClass = "text-base font-extrabold";
  }

  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Determine color coding
  let colorClass = "text-red-600 stroke-red-500";
  if (normalizedScore >= 80) {
    colorClass = "text-green-600 stroke-green-500";
  } else if (normalizedScore >= 60) {
    colorClass = "text-yellow-600 stroke-yellow-500";
  } else if (normalizedScore >= 40) {
    colorClass = "text-orange-500 stroke-orange-500";
  }

  return (
    <div
      className="relative flex items-center justify-center select-none shrink-0"
      style={{ width: diameter, height: diameter }}
    >
      <svg
        width={diameter}
        height={diameter}
        className="-rotate-90 transform"
      >
        {/* Track circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted fill-transparent"
        />
        {/* Progress circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn("fill-transparent transition-all duration-500 ease-out", colorClass.split(" ")[1])}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {/* Score Text */}
      <span className={cn("absolute text-center", colorClass.split(" ")[0], textSizeClass)}>
        {normalizedScore}
      </span>
    </div>
  );
}
