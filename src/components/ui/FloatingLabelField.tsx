"use client";

import type { ReactNode } from "react";

interface FloatingLabelFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FloatingLabelField({
  label,
  children,
  className = "",
}: FloatingLabelFieldProps) {
  return (
    <div className={`relative pt-1 ${className}`}>
      <span className="absolute -top-0 left-3 z-10 bg-white px-1 text-xs font-medium text-gray-500">
        {label}
      </span>
      {children}
    </div>
  );
}

export const floatingInputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20";
