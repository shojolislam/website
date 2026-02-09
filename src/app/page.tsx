export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Giant overflowing name */}
      <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
        <h1
          className="select-none whitespace-nowrap italic leading-[0.85] text-[#1400e6]"
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontWeight: 900,
            fontSize: "clamp(30rem, 45vw, 55rem)",
            letterSpacing: "-0.03em",
            transform: "translateY(25%)",
          }}
        >
          Shojol
        </h1>
      </div>

      {/* Coming Soon - bottom right corner */}
      <div className="absolute bottom-6 right-8 z-10 md:bottom-8 md:right-12">
        <p
          className="text-[11px] uppercase tracking-[0.3em] text-[#1a1a2e]/50 md:text-xs"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
        >
          Coming Soon
        </p>
      </div>
    </main>
  );
}
