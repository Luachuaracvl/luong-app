"use client";

import { useEffect } from "react";

function measureSafeTop(): number {
  if (typeof document === "undefined") return 0;

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding-top:constant(safe-area-inset-top);padding-top:env(safe-area-inset-top);";
  document.body.appendChild(probe);
  const fromEnv = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);
  if (fromEnv > 0) return Math.round(fromEnv);

  const vv = window.visualViewport;
  if (vv && vv.offsetTop > 0) return Math.round(vv.offsetTop);

  const isAppleMobile =
    /iPhone|iPod|iPad/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (!isAppleMobile) return 0;

  const longEdge = Math.max(window.screen.width, window.screen.height);
  if (longEdge >= 932) return 59;
  if (longEdge >= 852) return 59;
  if (longEdge >= 844) return 47;
  if (longEdge >= 812) return 44;
  return 20;
}

/** Layout chat mobile: safe-area, đo thanh nav + footer, chỉ co khi bàn phím mở. */
export function useMobileChatViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");
    const root = document.documentElement;

    const measureChrome = () => {
      root.style.setProperty("--safe-top-measured", `${measureSafeTop()}px`);

      const nav = document.querySelector<HTMLElement>(".bottom-nav");
      const footer = document.querySelector<HTMLElement>(".chat-footer");
      const header =
        document.querySelector<HTMLElement>(".chat-header") ??
        document.querySelector<HTMLElement>(".chat-sidebar-header");

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
      if (header) {
        root.style.setProperty(
          "--chat-header-offset",
          `${Math.round(header.getBoundingClientRect().height)}px`
        );
      }
    };

    const apply = () => {
      if (!mq.matches) {
        root.style.removeProperty("--chat-vh");
        root.style.removeProperty("--bottom-nav-offset");
        root.style.removeProperty("--chat-footer-offset");
        root.style.removeProperty("--chat-header-offset");
        root.style.removeProperty("--safe-top-measured");
        document.body.classList.remove("chat-keyboard-open", "chat-layout-active");
        return;
      }

      document.body.classList.add("chat-layout-active");
      measureChrome();
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
    window.addEventListener("orientationchange", () => {
      window.setTimeout(measureChrome, 100);
    });

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
      root.style.removeProperty("--chat-header-offset");
      root.style.removeProperty("--safe-top-measured");
      document.body.classList.remove("chat-keyboard-open", "chat-layout-active");
    };
  }, [enabled]);
}
