import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
// import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./i18n";
import "./styles/main.scss";

console.log("🌐 API_URL:", import.meta.env.VITE_API_URL);
console.log("🔌 SOCKET_URL:", import.meta.env.VITE_SOCKET_URL);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);