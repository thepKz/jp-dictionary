export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Từ điển tính từ kinh tế - Nhật</h1>
        <ThemeToggle />
      </header>
      <section className="mt-8">
        <ClientSearchBox />
      </section>
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 p-4 shadow-sm dark:border-zinc-800">
          <h2 className="text-xl font-semibold">経済的（けいざいてき）</h2>
          <p className="opacity-80">Thuộc về kinh tế</p>
        </article>
      </section>
    </main>
  );
}

import ClientSearchBox from "./_components/SearchBox";
import ThemeToggle from "./_components/ThemeToggle";
