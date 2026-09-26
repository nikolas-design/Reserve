"use client";

import { useEffect } from "react";

// Inside an iframe: tell the parent page our height so the frame never scrolls.
export function EmbedResize() {
  useEffect(() => {
    if (window.parent === window) return;
    const send = () => window.parent.postMessage({ type: "reserve:height", height: document.documentElement.scrollHeight }, "*");
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);
  return null;
}
