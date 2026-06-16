import React from "react";
import { createRoot } from "react-dom/client";
import PantryPlate from "./PantryPlate.jsx";
import ReloadPrompt from "./ReloadPrompt.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PantryPlate />
    <ReloadPrompt />
  </React.StrictMode>
);
