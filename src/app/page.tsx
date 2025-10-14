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
            <ThemeToggle />
          </div>
          <p className="text-muted-foreground text-lg font-light max-w-2xl mx-auto">
            Khám phá và học tập các tính từ kinh tế tiếng Nhật
          </p>
        </header>

        {/* Search Section */}
        <section className="mb-16">
          <ClientSearchBox />
        </section>

        {/* Sample Entry */}
        <section className="max-w-2xl mx-auto">
          <h2 className="text-xl font-light text-center mb-8 text-muted-foreground">Ví dụ</h2>
          <div className="card p-8 hover-lift">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-3xl font-light mb-2">経済的</h3>
                <div className="text-lg text-muted-foreground mb-1">けいざいてき</div>
                <div className="text-sm text-muted-foreground">keizaiteki</div>
              </div>
              <span className="badge badge-secondary">Phổ biến</span>
            </div>
            <div className="space-y-4">
              <div className="border-l border-border pl-4">
                <div className="text-sm text-muted-foreground mb-1">Na-adjective</div>
                <div className="text-base">Thuộc về kinh tế, mang tính kinh tế</div>
              </div>
              <div className="border-l border-border pl-4">
                <div className="text-sm text-muted-foreground mb-1">Na-adjective</div>
                <div className="text-base">Tiết kiệm, hiệu quả về mặt kinh tế</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

import ClientSearchBox from "./_components/SearchBox";
import ThemeToggle from "./_components/ThemeToggle";
