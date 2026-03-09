import { useState } from "react";
import ElasticSlider from "./ElasticSlider";
import Header from "./Header";
import { colors } from "./tokens";

export default function SliderPage() {
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
      }}
    >
      <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode((d) => !d)} />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 32,
        }}
      >
        <ElasticSlider
          min={0}
          max={100}
          defaultRange={[20, 65]}
          onChange={() => {}}
          onModeToggle={() => setDarkMode((prev) => !prev)}
          darkMode={darkMode}
        />
      </main>
    </div>
  );
}
