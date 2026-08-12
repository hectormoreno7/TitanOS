import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import UpdatePrompt from "./components/UpdatePrompt.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <UpdatePrompt />
    </AuthProvider>
  </StrictMode>
);
