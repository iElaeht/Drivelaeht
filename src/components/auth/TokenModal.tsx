"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

interface TokenModalProps {
  email: string;
  initialLockedUntil?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface NoticeState {
  type: "error" | "success";
  message: string;
  attemptsText?: string | null;
}

const NOTICE_DURATION_MS = 8000;
const RESEND_COOLDOWN_SECONDS = 30;

function formatWaitTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins > 0) {
    return `${mins} ${mins === 1 ? "min" : "mins"} ${secs} ${secs === 1 ? "segundo" : "segundos"}`;
  }
  return `${secs} ${secs === 1 ? "segundo" : "segundos"}`;
}

function ModalTimedNotice({
  notice,
  durationMs,
  onDismiss,
}: {
  notice: NoticeState;
  durationMs: number;
  onDismiss: () => void;
}) {
  const [exiting, setExiting] = useState(false);
  const [progressActive, setProgressActive] = useState(false);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setProgressActive(true);
      });
    });

    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, durationMs - 300);

    const dismissTimer = window.setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(exitTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [notice, durationMs, onDismiss]);

  const isError = notice.type === "error";

  return (
    <div
      role="alert"
      className={`space-y-1.5 transition-all duration-300 ease-out ${
        exiting ? "opacity-0 -translate-y-0.5" : "opacity-100 translate-y-0"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p
          className={`flex items-center gap-1.5 font-medium ${
            isError ? "text-rose-300" : "text-emerald-300"
          }`}
        >
          <span aria-hidden="true">{isError ? "•" : "✓"}</span>
          <span>{notice.message}</span>
        </p>
        {notice.attemptsText && (
          <span className="text-amber-300/90 font-medium">
            {notice.attemptsText}
          </span>
        )}
      </div>

      <div
        className={`h-[2px] w-full overflow-hidden rounded-full ${
          isError ? "bg-rose-400/15" : "bg-emerald-400/15"
        }`}
      >
        <div
          style={{
            width: progressActive ? "0%" : "100%",
            transitionDuration: `${durationMs}ms`,
          }}
          className={`h-full rounded-full transition-[width] ease-linear ${
            isError ? "bg-rose-400/80" : "bg-emerald-400/80"
          }`}
        />
      </div>
    </div>
  );
}

export function TokenModal({
  email,
  initialLockedUntil = null,
  onSuccess,
  onCancel,
}: TokenModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [noticeTick, setNoticeTick] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<string | null>(
    initialLockedUntil ?? null
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [cancelling, setCancelling] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const lockSecondsLeft = lockedUntil
    ? Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - nowMs) / 1000))
    : 0;
  const isLocked = lockSecondsLeft > 0;
  const code = digits.join("");

  useEffect(() => {
    setNowMs(Date.now());
    setLockedUntil(initialLockedUntil ?? null);
    setDigits(["", "", "", "", "", ""]);
    setNotice(null);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }, [initialLockedUntil, email]);

  useEffect(() => {
    if (!isLocked) {
      inputRefs.current[0]?.focus();
    }
  }, [isLocked]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!lockedUntil) {
      return;
    }

    const interval = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (new Date(lockedUntil).getTime() <= current) {
        window.clearInterval(interval);
        setLockedUntil(null);
        setNotice(null);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  function showNotice(next: NoticeState) {
    setNotice(next);
    setNoticeTick((prev) => prev + 1);
  }

  function handleDigitChange(index: number, rawValue: string) {
    if (isLocked) return;
    const clean = rawValue.replace(/\D/g, "");
    if (!clean) {
      setDigits((prev) => {
        const copy = [...prev];
        copy[index] = "";
        return copy;
      });
      return;
    }

    const chars = clean.slice(0, 6 - index).split("");
    setDigits((prev) => {
      const copy = [...prev];
      chars.forEach((ch, offset) => {
        copy[index + offset] = ch;
      });
      return copy;
    });

    const nextIndex = Math.min(5, index + chars.length);
    inputRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (isLocked) return;

    if (event.key === "Backspace") {
      if (digits[index]) {
        setDigits((prev) => {
          const copy = [...prev];
          copy[index] = "";
          return copy;
        });
      } else if (index > 0) {
        setDigits((prev) => {
          const copy = [...prev];
          copy[index - 1] = "";
          return copy;
        });
        inputRefs.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    if (isLocked) return;
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;

    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, idx) => {
      next[idx] = ch;
    });
    setDigits(next);

    const focusIndex = Math.min(5, pasted.length);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    if (isLocked || code.length !== 6 || verifying || resending || cancelling) {
      return;
    }

    setNotice(null);
    setVerifying(true);

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        remainingAttempts?: number;
        lockedUntil?: string;
      };

      if (!response.ok) {
        setVerifying(false);

        if (response.status === 429 || data?.lockedUntil) {
          const targetLock =
            data?.lockedUntil ||
            new Date(Date.now() + 10 * 60 * 1000).toISOString();
          setNowMs(Date.now());
          setLockedUntil(targetLock);
          setNotice(null);
          return;
        }

        const isExpired =
          typeof data?.error === "string" &&
          data.error.toLowerCase().includes("expired");

        const attemptsText =
          typeof data?.remainingAttempts === "number" &&
          data.remainingAttempts > 0
            ? `Te quedan ${data.remainingAttempts} ${
                data.remainingAttempts === 1 ? "intento" : "intentos"
              }`
            : null;

        showNotice({
          type: "error",
          message: isExpired
            ? "El código expiró. Solicita uno nuevo."
            : "Código inválido",
          attemptsText: isExpired ? null : attemptsText,
        });
        return;
      }

      onSuccess();
    } catch {
      setVerifying(false);
      showNotice({
        type: "error",
        message: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
      });
    }
  }

  async function handleResend() {
    if (
      isLocked ||
      resendCooldown > 0 ||
      resending ||
      verifying ||
      cancelling
    ) {
      return;
    }

    setResending(true);

    try {
      const response = await fetch("/api/auth/resend-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        lockedUntil?: string;
      };

      setResending(false);

      if (response.status === 429 || data?.lockedUntil) {
        const targetLock =
          data?.lockedUntil ||
          new Date(Date.now() + 10 * 60 * 1000).toISOString();
        setNowMs(Date.now());
        setLockedUntil(targetLock);
        setNotice(null);
        return;
      }

      if (!response.ok) {
        showNotice({
          type: "error",
          message: "No se pudo reenviar el código",
        });
        return;
      }

      setDigits(["", "", "", "", "", ""]);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
      showNotice({
        type: "success",
        message: "Código reenviado",
      });
    } catch {
      setResending(false);
      showNotice({
        type: "error",
        message: "No pudimos conectar con el servidor al reenviar.",
      });
    }
  }

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);

    try {
      await fetch("/api/auth/cancel-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setCancelling(false);
      setDigits(["", "", "", "", "", ""]);
      setNotice(null);
      setLockedUntil(null);
      onCancel();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-edge/80 bg-surface/85 backdrop-blur-xl p-6 shadow-2xl space-y-5 animate-fade-in-up">
        <div className="space-y-1.5 text-center">
          <h2
            id="verify-modal-title"
            className="text-xl font-bold tracking-tight text-ink"
          >
            Verifica tu correo
          </h2>
          <p className="text-xs text-muted">
            Ingresa el código de 6 dígitos enviado a{" "}
            <span className="font-semibold text-ink">{email}</span>
          </p>
        </div>

        {isLocked && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-200 text-center"
          >
            <p className="font-semibold">
              Intentos Superados, Espera{" "}
              <span className="font-mono font-bold text-rose-100">
                {formatWaitTime(lockSecondsLeft)}
              </span>
            </p>
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="space-y-2.5">
            <div className="grid grid-cols-6 gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  disabled={isLocked || verifying || cancelling}
                  value={digit}
                  aria-label={`Dígito ${index + 1}`}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`h-12 w-full rounded-xl border bg-app/80 text-center font-mono text-lg font-bold text-ink focus:outline-none transition-colors disabled:opacity-50 ${
                    notice?.type === "error"
                      ? "border-rose-400 focus:border-rose-400"
                      : "border-edge focus:border-accent"
                  }`}
                />
              ))}
            </div>

            {!isLocked && notice && (
              <ModalTimedNotice
                key={`modal-notice-${noticeTick}`}
                notice={notice}
                durationMs={NOTICE_DURATION_MS}
                onDismiss={() => setNotice(null)}
              />
            )}
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={
                isLocked ||
                code.length !== 6 ||
                verifying ||
                resending ||
                cancelling
              }
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? "Verificando..." : "Confirmar Código"}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  isLocked ||
                  resendCooldown > 0 ||
                  resending ||
                  verifying ||
                  cancelling
                }
                onClick={handleResend}
                className="w-full rounded-xl border border-edge bg-app/75 px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent/45 hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending
                  ? "Reenviando..."
                  : resendCooldown > 0
                    ? `Reenviar (${resendCooldown}s)`
                    : "Reenviar Código"}
              </button>

              <button
                type="button"
                disabled={cancelling || verifying}
                onClick={handleCancel}
                className="w-full rounded-xl border border-edge bg-app/75 px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-rose-400/45 hover:text-rose-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? "Cancelando..." : "Cancelar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}