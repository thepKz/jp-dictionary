"use client";

export default function ThemeToggle() {
  return (
    <button
      className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      onClick={() => {
        if (typeof document === 'undefined') return;
        const el = document.documentElement;
        const next = el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        el.setAttribute('data-theme', next);
      }}
    >
      Đổi giao diện
    </button>
  );
}


