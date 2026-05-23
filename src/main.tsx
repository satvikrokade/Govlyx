(window as any).global = window;
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onRegistered(r) {
    console.log("Service Worker successfully registered:", r);
  },
  onRegisterError(error) {
    console.error("Service Worker registration failed:", error);
  }
});

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./api/queryClient";

ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);