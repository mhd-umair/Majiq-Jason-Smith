import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdFractionalFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function compactNumber(value: number): { num: number; suffix: string } {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return { num: value / 1_000_000_000, suffix: "B" };
  if (abs >= 1_000_000) return { num: value / 1_000_000, suffix: "M" };
  if (abs >= 1_000) return { num: value / 1_000, suffix: "K" };
  return { num: value, suffix: "" };
}

function formatCompactValue(value: number, prefix: string): string {
  const { num, suffix } = compactNumber(value);
  if (suffix === "") {
    return `${prefix}${Math.round(num)}`;
  }
  return `${prefix}${num.toFixed(1)}${suffix}`;
}

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatCurrency(value: number | null | undefined, opts?: { fractional?: boolean }) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return opts?.fractional ? usdFractionalFormatter.format(value) : usdFormatter.format(value);
}

export function formatCompactCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return formatCompactValue(Math.abs(value), `${sign}$`);
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return numberFormatter.format(value);
}

export function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return formatCompactValue(Math.abs(value), sign);
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatDelta(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "■";
  const sign = value > 0 ? "+" : "";
  return `${arrow} ${sign}${value.toFixed(1)}%`;
}
