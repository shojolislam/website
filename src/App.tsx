import { useState } from "react";
import PolkaDotImage from "./PolkaDotImage";
import Header from "./Header";
import { colors, fonts } from "./tokens";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const theme = darkMode ? colors.dark : colors.light;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.bg,
        color: theme.text,
        transition: "background-color 0.3s ease, color 0.3s ease",
        overflow: "hidden",
      }}
    >
      <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode((d) => !d)} />

      {/* Dots — fills all space between header and footer */}
      <div style={{ flex: 1, minHeight: 0, padding: "0 20px" }}>
        <PolkaDotImage
          src="https://cdn.prod.website-files.com/6582177184b4d980780aff40/67c5a6faa2e4c193a9a2e484_img-hero.svg"
          dotColor={darkMode ? "#e5e5e5" : "#0a0a0a"}
          darkMode={darkMode}
          gap={11}
          baseRadius={1.5}
          maxRadius={5.5}
          brushRadius={130}
        />
      </div>

      {/* Footer */}
      <footer
        style={{
          flexShrink: 0,
          padding: "16px 20px 32px",
        }}
      >
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: "clamp(18px, 4vw, 26px)",
            fontWeight: 700,
            lineHeight: 1.2,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          New website coming soon
        </h1>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            fontWeight: 400,
            color: theme.textSubtle,
            transition: "color 0.3s ease",
            display: "block",
            marginTop: 8,
          }}
        >
          Wanna chat? Shoot me an email{" "}
          <a
            href="mailto:me@shojol.com"
            style={{
              color: theme.text,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            me@shojol.com
          </a>
        </span>
      </footer>
    </div>
  );
}
