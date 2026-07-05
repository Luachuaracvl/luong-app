"use client";

import { useEffect } from "react";

/** Layout chat mobile: đo thanh nav + footer, chỉ co khi bàn phím mở. */
export function useMobileChatViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");
    const root = document.documentElement;

    const measureChrome = () => {
      const nav = document.querySelector<HTMLElement>(".bottom-nav");
      const footer = document.querySelector<HTMLElement>(".chat-footer");
      if (nav) {
        root.style.setProperty(
          "--bottom-nav-offset",
          `${Math.round(nav.getBoundingClientRect().height)}px`
        );
      }
      if (footer) {
        root.style.setProperty(
          "--chat-footer-offset",
          `${Math.round(footer.getBoundingClientRect().height)}px`
        );
      }
    };

    const apply = () => {
      if (!mq.matches) {
        root.style.removeProperty("--chat-vh");
        root.style.removeProperty("--bottom-nav-offset");
        root.style.removeProperty("--chat-footer-offset");
        document.body.classList.remove("chat-keyboard-open", "chat-layout-active");
        return;
      }

      document.body.classList.add("chat-layout-active");
      requestAnimationFrame(() => {
        requestAnimationFrame(measureChrome);
      });

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
    window.addEventListener("resize", measureChrome);

    const nav = document.querySelector<HTMLElement>(".bottom-nav");
    const footer = document.querySelector<HTMLElement>(".chat-footer");
    const ro = new ResizeObserver(() => {
      measureChrome();
    });
    if (nav) ro.observe(nav);
    if (footer) ro.observe(footer);

    return () => {
      mq.removeEventListener("change", apply);
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", measureChrome);
      ro.disconnect();
      root.style.removeProperty("--chat-vh");
      root.style.removeProperty("--bottom-nav-offset");
      root.style.removeProperty("--chat-footer-offset");
      document.body.classList.remove("chat-keyboard-open", "chat-layout-active");
    };
  }, [enabled]);
}
