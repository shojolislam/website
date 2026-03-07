import { useState, useEffect } from "react";
import ElasticSlider from "./ElasticSlider";
import { colors, fonts } from "./tokens";

function Logo({ dark }: { dark: boolean }) {
  const outerFill = dark ? colors.logo : "white";
  const innerFill = dark ? "white" : colors.logo;
  return (
    <svg
      width="48"
      height="34"
      viewBox="0 0 34 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M33.2691 11.9366H30.6452V4.62638C30.6452 3.61202 30.3748 2.28706 29.3174 1.24735C28.2426 0.190617 26.888 -0.0503637 25.8217 0.00814336L19.9607 0.442237L19.1559 0.533342C18.067 0.533342 16.867 0.859173 15.897 1.72482C15.618 1.97375 15.3788 2.24922 15.1789 2.54417C13.5403 1.05422 11.3078 0.363325 8.77764 0.363325C6.78996 0.363325 4.78951 0.718493 3.20366 1.82698C1.43956 3.06007 0.264648 4.42621 0.264648 6.93375V8.86893V11.9452C0.264648 11.968 0.264648 11.9909 0.264648 12.0137V24.0001H14.7589L20.4803 23.9996L22.5488 20.3497H33.2691V11.9366Z"
        fill={outerFill}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22.1559 15.0844V17.2025H29.8579V15.0844H27.2339V4.62665C27.2339 3.62437 26.7053 3.09486 25.7237 3.15159L22.6656 3.30288V5.42091L24.7987 5.28854V15.0844H22.1559ZM17.2876 5.11838C17.2876 6.0072 17.9294 6.55562 18.8922 6.55562C19.8738 6.55562 20.5345 6.0072 20.5345 5.11838C20.5345 4.24847 19.8738 3.68114 18.8922 3.68114C17.9294 3.68114 17.2876 4.24847 17.2876 5.11838ZM15.6641 20.8524L17.5519 17.6942C17.7973 17.2782 17.8728 16.8999 17.8728 16.4083V9.69485L15.6641 9.82722V7.70919L18.8733 7.5579C19.8549 7.52008 20.3646 8.04959 20.3646 8.95732V16.6352C20.3646 17.1269 20.2891 17.4673 20.0437 17.9211L18.3825 20.8524H15.6641ZM14.7245 13.4772C14.7245 15.652 13.2898 17.2216 9.2501 17.2216C4.51189 17.2216 2.88844 15.217 2.88844 11.9454H5.32362C5.32362 14.4417 6.60727 15.1036 9.30673 15.1036C11.3832 15.1036 12.2893 14.6119 12.2893 13.534C12.2893 12.2932 10.7491 11.8162 8.97079 11.2656C8.77056 11.2036 8.56727 11.1406 8.36286 11.0755C5.62565 10.1867 3.49252 9.44919 3.49252 6.93402C3.49252 4.75925 5.15372 3.51112 8.51388 3.51112C12.5347 3.51112 14.1771 5.72371 14.1771 8.18215H11.7419C11.7419 6.29105 10.3261 5.62916 8.51388 5.62916C6.96594 5.62916 5.92769 5.98847 5.92769 6.99075C5.92769 7.91739 6.5884 8.25779 8.74041 8.9575C8.92411 9.01838 9.11297 9.07967 9.30524 9.14206C11.7408 9.93244 14.7245 10.9007 14.7245 13.4772ZM11.6424 18.9835H2.59326V20.8524H11.6424V18.9835Z"
        fill={innerFill}
      />
    </svg>
  );
}

function LocalTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatted = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Europe/Lisbon",
  });

  return (
    <div style={{ textAlign: "right" }}>
      <span style={{ display: "block" }}>{formatted}</span>
      <span style={{ display: "block", fontSize: 10, opacity: 0.6, marginTop: 2 }}>
        Lisbon, Portugal
      </span>
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(true);

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
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
        }}
      >
        <a href="/" style={{ display: "inline-flex" }}>
          <Logo dark={!darkMode} />
        </a>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 13,
            fontWeight: 500,
            color: theme.textSubtle,
            fontVariantNumeric: "tabular-nums",
            transition: "color 0.3s ease",
          }}
        >
          <LocalTime />
        </span>
      </header>

      {/* Main — slider centered */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <ElasticSlider
          min={0}
          max={100}
          defaultRange={[20, 65]}
          onChange={() => {}}
          darkMode={darkMode}
        />
      </main>

      {/* Footer — dark/light toggle */}
      <footer
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          padding: "20px 24px",
        }}
      >
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            fontWeight: 500,
            color: theme.textSubtle,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            transition: "color 0.3s ease",
          }}
        >
          Light
        </span>

        <button
          onClick={() => setDarkMode((prev) => !prev)}
          style={{
            position: "relative",
            width: 44,
            height: 24,
            borderRadius: 999,
            backgroundColor: theme.surface,
            border: "none",
            cursor: "pointer",
            padding: 2,
            transition: "background-color 0.3s ease",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: theme.toggleThumb,
              transition: "transform 0.3s ease, background-color 0.3s ease",
              transform: darkMode ? "translateX(20px)" : "translateX(0px)",
            }}
          />
        </button>

        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            fontWeight: 500,
            color: theme.textSubtle,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            transition: "color 0.3s ease",
          }}
        >
          Dark
        </span>
      </footer>
    </div>
  );
}

export default App;
