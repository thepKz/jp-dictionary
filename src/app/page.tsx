export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-light tracking-tight">
              Từ điển tính từ kinh tế Nhật
            </h1>
            <div className="flex items-center gap-3">
              <SettingsMenu />
              <HeaderFeedbackButton />
            </div>
          </div>
        </header>

        {/* Search Section */}
        <section className="mb-16">
          <ClientSearchBox />
        </section>

      </main>
    </div>
  );
}

import ClientSearchBox from "./_components/SearchBox";
import ThemeToggle from "./_components/ThemeToggle";
import SettingsMenu from "./_components/SettingsMenu";
import HeaderFeedbackButton from "./_components/HeaderFeedbackButton";
