"use client";

import { useEffect } from "react";

/** Chỉ co layout khi bàn phím mobile mở — tránh thu nhỏ vùng chat lúc bình thường. */
export function useMobileChatViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");
    const root = document.documentElement;

    const apply = () => {
      if (!mq.matches) {
        root.style.removeProperty("--chat-vh");
        document.body.classList.remove("chat-keyboard-open", "chat-layout-active");
        return;
      }

      document.body.classList.add("chat-layout-active");

      const vv = window.visualViewport;
      if (!vv) {
        root.style.removeProperty("--chat-vh");
        document.body.classList.remove("chat-keyboard-open");
        return;
      }

      const keyboardOpen = vv.height < window.innerHeight * 0.82;
      document.body.classList.toggle("chat-keyboard-open", keyboardOpen);

      if (keyboardOpen) {
        root.style.setProperty("--chat-vh", `${Math.round(vv.height)}px`);
      } else {
        root.style.removeProperty("--chat-vh");
      }
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
      document.body.classList.remove("chat-keyboard-open", "chat-layout-active");
    };
  }, [enabled]);
}
