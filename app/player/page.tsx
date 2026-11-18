export default function PlayerPage() {
  // Skeleton placeholder — replaced by the real player engine in later units.
  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          border: "2px solid #d6ab6a",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 44,
          color: "#d6ab6a",
        }}
      >
        W
      </div>
      <div style={{ letterSpacing: "0.2em", fontWeight: 500 }}>WESTBROOK</div>
    </main>
  );
}
