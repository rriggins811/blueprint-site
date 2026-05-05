"use client";

export function SaveIndicator({
  status,
}: {
  status: "loading" | "ready" | "saving" | "saved";
}) {
  if (status === "loading") {
    return <span className="text-xs text-neutral-400">Loading…</span>;
  }
  if (status === "saving") {
    return <span className="text-xs text-neutral-500">Saving…</span>;
  }
  if (status === "saved") {
    return <span className="text-xs text-emerald-700">Saved</span>;
  }
  return null;
}

export function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
