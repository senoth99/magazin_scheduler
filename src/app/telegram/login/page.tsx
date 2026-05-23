"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { AuthScreenShell } from "@/components/AuthScreenShell";
import { TelegramBrowserLogin } from "@/components/TelegramBrowserLogin";
import type { AccessDeniedPayload } from "@/lib/accessDenied";
import { isAccessDeniedResponse } from "@/lib/accessDenied";
import {
  isLikelyTelegramMiniAppContext,
  prepareTelegramWebApp,
  readTelegramInitData
} from "@/lib/telegramMiniAppClient";

const POLL_MS = 50;
/** ~4 с в обычном браузере, ~15 с в Mini App (медленный WebView / поздний initData). */
const POLL_MAX_BROWSER = 80;
const POLL_MAX_MINI_APP = 300;

const BUILD_REF = process.env.NEXT_PUBLIC_BUILD_REF?.trim();
const SHOW_DEV_LOGIN =
  process.env.NEXT_PUBLIC_TELEGRAM_AUTH_DEV === "true" && process.env.NODE_ENV !== "production";

type LoginMode = "detecting" | "mini_app" | "browser" | "mini_app_no_data" | "error";

export default function TelegramLoginPage() {
  const [mode, setMode] = useState<LoginMode>("detecting");
  const [error, setError] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const inMiniApp = isLikelyTelegramMiniAppContext();
      const pollMax = inMiniApp ? POLL_MAX_MINI_APP : POLL_MAX_BROWSER;

      for (let i = 0; i < pollMax && !cancelled; i++) {
        prepareTelegramWebApp();
        const initData = readTelegramInitData();
        if (initData) {
          if (doneRef.current) return;
          doneRef.current = true;
          setMode("mini_app");
          try {
            const res = await fetch("/api/telegram/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ initData })
            });
            const data = (await res.json()) as AccessDeniedPayload & {
              error?: string;
              onboardingRequired?: boolean;
            };
            if (isAccessDeniedResponse(res.status, data)) {
              window.location.replace("/access-denied");
              return;
            }
            if (!res.ok) throw new Error(data.error ?? "Авторизация не удалась");
            const onboarding = Boolean(data.onboardingRequired);
            window.location.replace(onboarding ? "/welcome" : "/schedule");
            return;
          } catch (e) {
            doneRef.current = false;
            setError(e instanceof Error ? e.message : "Ошибка авторизации");
            setMode("error");
            return;
          }
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }

      if (!cancelled && !doneRef.current) {
        setMode(inMiniApp ? "mini_app_no_data" : "browser");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const title = "Shop Scheduler";
  const inMiniApp = isLikelyTelegramMiniAppContext();

  const description =
    mode === "detecting" || mode === "mini_app"
      ? "Подключение к Telegram…"
      : mode === "browser"
        ? "Откройте бота в Telegram — мы подтвердим вход в этом браузере."
        : mode === "mini_app_no_data"
          ? "Не удалось получить данные входа из Telegram."
          : mode === "error"
            ? "Не удалось войти."
            : undefined;

  const showBrowserLogin = mode === "browser";
  const botLabel = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || "бота";

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <AuthScreenShell title={title} description={description}>
        {mode === "detecting" || mode === "mini_app" ? (
          <LoadingDots label="Входим по вашему аккаунту Telegram…" />
        ) : null}

        {mode === "mini_app_no_data" ? (
          <div className="space-y-3 pt-2 text-sm text-muted">
            <p>
              Вы открыли приложение через Telegram, но данные для входа не пришли. Так бывает после сбоя сети или если
              страница открылась не из меню бота.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Полностью закройте это окно (крестик вверху).</li>
              <li>
                Откройте бота <strong className="text-foreground">@{botLabel}</strong> и снова нажмите кнопку запуска
                приложения в меню.
              </li>
            </ol>
            <button type="button" className="btn-primary w-full" onClick={() => window.location.reload()}>
              Попробовать снова
            </button>
          </div>
        ) : null}

        {showBrowserLogin ? <TelegramBrowserLogin showDevLogin={SHOW_DEV_LOGIN} /> : null}

        {mode === "error" && inMiniApp ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-foreground/85">{error}</p>
            <button type="button" className="btn-primary w-full" onClick={() => window.location.reload()}>
              Попробовать снова
            </button>
          </div>
        ) : null}

        {mode === "error" && !inMiniApp ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-foreground/85">{error}</p>
            <TelegramBrowserLogin showDevLogin={SHOW_DEV_LOGIN} />
          </div>
        ) : null}

        {BUILD_REF ? (
          <p className="pt-2 text-center font-mono text-[10px] leading-tight text-muted/45" title="Метка сборки на сервере">
            build {BUILD_REF}
          </p>
        ) : null}
      </AuthScreenShell>
    </>
  );
}

function LoadingDots({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="flex items-center justify-center gap-1.5 pt-2">
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
      </div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
