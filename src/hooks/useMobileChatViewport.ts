"use client";

import { useEffect } from "react";

/** Cập nhật --chat-vh theo visualViewport (bàn phím mobile đẩy layout, không zoom). */
export function useMobileChatViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");
    const root = document.documentElement;

    const apply = () => {
      if (!mq.matches) {
        root.style.removeProperty("--chat-vh");
        root.style.removeProperty("--chat-vt");
        document.body.classList.remove("chat-keyboard-open");
        return;
      }

      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty(
          "--chat-vh",
          `calc(100dvh - var(--bottom-nav-height))`
        );
        return;
      }

      root.style.setProperty("--chat-vh", `${Math.round(vv.height)}px`);
      root.style.setProperty("--chat-vt", `${Math.round(vv.offsetTop)}px`);
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
      root.style.removeProperty("--chat-vt");
      document.body.classList.remove("chat-keyboard-open");
    };
  }, [enabled]);
}
