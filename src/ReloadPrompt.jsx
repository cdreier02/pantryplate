import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/* "New version available — Reload" toast. With registerType: 'prompt', the new
   service worker waits until the user opts in here, so a refresh never interrupts
   someone mid-recipe. Renders nothing until an update is actually ready. */
export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div role="status" aria-live="polite" style={styles.wrap}>
      <span style={styles.text}>A new version of PantryPlate is available.</span>
      <div style={styles.btns}>
        <button style={styles.reload} onClick={() => updateServiceWorker(true)}>
          Reload
        </button>
        <button style={styles.dismiss} onClick={() => setNeedRefresh(false)}>
          Later
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    left: "50%",
    bottom: 20,
    transform: "translateX(-50%)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#16241B",
    color: "#EAF3E2",
    border: "1px solid #2C4636",
    borderRadius: 14,
    padding: "12px 14px 12px 18px",
    boxShadow: "0 16px 40px -16px rgba(0,0,0,.55)",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    maxWidth: "calc(100vw - 32px)",
  },
  text: { lineHeight: 1.3 },
  btns: { display: "flex", gap: 8, flex: "0 0 auto" },
  reload: {
    background: "#84B26A",
    color: "#16241B",
    border: "none",
    borderRadius: 9,
    padding: "8px 14px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  dismiss: {
    background: "transparent",
    color: "#9FB6A4",
    border: "none",
    borderRadius: 9,
    padding: "8px 10px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
};
