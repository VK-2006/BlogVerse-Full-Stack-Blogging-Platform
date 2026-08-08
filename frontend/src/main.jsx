import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./app-redesign.css";
import "./ui-polish-v23.css";
import "./ui-polish-v24.css";
import "./ui-polish-v25.css";
import "./ui-polish-v25-2.css";
import "./ui-polish-v26.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("BlogVerse root element was not found.");
}

window.addEventListener("unhandledrejection", (event) => {
  console.error("BlogVerse unhandled promise rejection:", event.reason);
});

window.addEventListener("error", (event) => {
  console.error("BlogVerse global error:", event.error || event.message);
});

createRoot(rootElement).render(
  <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
