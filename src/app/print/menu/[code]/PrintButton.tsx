"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-full bg-sea px-6 font-bold text-on-sea hover:bg-sea-strong"
    >
      Print
    </button>
  );
}
