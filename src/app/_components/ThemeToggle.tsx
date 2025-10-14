"use client";

export default function ThemeToggle() {
  return (
    <button
      className="btn-secondary hover-lift px-4 py-2 text-sm font-light"
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


