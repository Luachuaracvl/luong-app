"use client";

import { useEffect } from "react";

/** Co layout chat theo visualViewport khi bàn phím mobile mở. */
export function useMobileChatViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");
    const root = document.documentElement;

    const apply = () => {
      if (!mq.matches) {
        root.style.removeProperty("--chat-vh");
        document.body.classList.remove("chat-keyboard-open");
        return;
      }

      const vv = window.visualViewport;
      const fallback = `calc(100dvh - var(--bottom-nav-height))`;
      if (!vv) {
        root.style.setProperty("--chat-vh", fallback);
        return;
      }

      root.style.setProperty("--chat-vh", `${Math.round(vv.height)}px`);
      const keyboardOpen = vv.height < window.innerHeight * 0.82;
      document.body.classList.toggle("chat-keyboard-open", keyboardOpen);
    };

    apply();
    mq.addEventListener("change", apply);
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);

    return () => {
      mq.removeEventListener("change", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      root.style.removeProperty("--chat-vh");
      document.body.classList.remove("chat-keyboard-open");
    };
  }, [enabled]);
}
