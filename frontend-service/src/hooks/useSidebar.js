import { useState, useEffect } from 'react';

export function useSidebar() {
  const [sidebarOpen, setSidebarOpenState] = useState(() => localStorage.getItem("ducky_sidebar") === "true");

  const setSidebarOpen = (val) => {
    const newVal = typeof val === "function" ? val(sidebarOpen) : val;
    setSidebarOpenState(newVal);
    localStorage.setItem("ducky_sidebar", newVal ? "true" : "false");
  };

  useEffect(() => {
    const syncSidebar = () => {
      setSidebarOpenState(localStorage.getItem("ducky_sidebar") === "true");
    };
    window.addEventListener("storage", syncSidebar);
    return () => window.removeEventListener("storage", syncSidebar);
  }, []);

  return [sidebarOpen, setSidebarOpen];
}
