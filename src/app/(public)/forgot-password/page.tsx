"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RecoveryStep = "request" | "verify" | "reset" | "completed";
type RequestMode = "email" | "username";

interface FieldFeedbackProps {
  message: string;
  durationMs: number;
  onDismiss: () => void;
  tone?: "error" | "success" | "info";
  actionHref?: string;
  actionLabel?: string;
}

interface ForgotPasswordApiResponse {
  message?: string;
  error?: string;
  mode?: RequestMode;
  email?: string;
  username?: string;
  verified?: boolean;
  lockedUntil?: string;
  remainingAttempts?: number;
  field?: string;
  details?: Record<string, string[] | undefined>;
}

const STEP_PAGE_TITLES: Record<RecoveryStep, string> = {
  request: "Recuperar Acceso | Drivelaeht",
  verify: "Verificar Código de Recuperación | Drivelaeht",
  reset: "Nuevas Credenciales | Drivelaeht",
  completed: "Acceso Restablecido | Drivelaeht",
};

function FieldFeedback({
  message,
  durationMs,
  onDismiss,
  tone = "error",
  actionHref,
  actionLabel,
}: FieldFeedbackProps) {
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
  }, [message, durationMs, onDismiss]);

  const textClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "info"
        ? "text-accent-secondary"
        : "text-rose-300";

  const trackClass =
    tone === "success"
      ? "bg-emerald-400/15"
      : tone === "info"
        ? "bg-accent/15"
        : "bg-rose-400/15";

  const barClass =
    tone === "success"
      ? "bg-emerald-400/75"
      : tone === "info"
        ? "bg-accent/75"
        : "bg-rose-400/75";

  return (
    <div
      role="alert"
      className={`pt-1.5 space-y-1.5 transition-all duration-300 ease-out ${
        exiting ? "opacity-0 -translate-y-0.5" : "opacity-100 translate-y-0"
      }`}
    >
      <p className={`text-xs ${textClass} flex items-start gap-1.5 leading-relaxed`}>
        <span aria-hidden="true">•</span>
        <span>{message}</span>
      </p>

      {actionHref && actionLabel && (
        <div className="pl-3">
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            <span>{actionLabel}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      <div className={`h-[2px] w-full overflow-hidden rounded-full ${trackClass}`}>
        <div
          style={{
            width: progressActive ? "0%" : "100%",
            transitionDuration: `${durationMs}ms`,
          }}
          className={`h-full rounded-full ${barClass} transition-[width] ease-linear`}
        />
      </div>
    </div>
  );
}

const FEEDBACK_DURATION_MS = 8000;
const RESEND_COOLDOWN_SECONDS = 30;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,24}$/;
const POPULAR_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
] as const;
const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "soporte@drivelaeht.com";

function evaluatePasswordRules(password: string, confirmPassword: string) {
  const greaterThanEight = password.length > 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const matchesConfirm =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const allRequiredMet = greaterThanEight && hasUppercase && hasNumber;

  return {
    greaterThanEight,
    hasUppercase,
    hasNumber,
    hasSpecial,
    matchesConfirm,
    allRequiredMet,
  };
}

function domainDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const temp = dp[i];
      dp[i] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = temp;
    }
  }
  return dp[a.length];
}

function collapseRepeatedChars(value: string): string {
  return value.replace(/(.)\1+/g, "$1");
}

function getEmailDomainHelpers(rawEmail: string) {
  const trimmed = rawEmail.trim().toLowerCase();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) {
    return {
      localPart: "",
      typoSuggestion: null as string | null,
      domainSuggestions: [] as string[],
    };
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (
    POPULAR_EMAIL_DOMAINS.includes(
      domainPart as (typeof POPULAR_EMAIL_DOMAINS)[number]
    )
  ) {
    return {
      localPart,
      typoSuggestion: null,
      domainSuggestions: [],
    };
  }

  const prefixedProvider = POPULAR_EMAIL_DOMAINS.find((provider) =>
    domainPart.startsWith(provider)
  );
  if (prefixedProvider) {
    return {
      localPart,
      typoSuggestion: `${localPart}@${prefixedProvider}`,
      domainSuggestions: [],
    };
  }

  const collapsedDomain = collapseRepeatedChars(domainPart);
  let bestProvider: string | null = null;
  let bestScore = Infinity;

  if (domainPart.length >= 4) {
    for (const provider of POPULAR_EMAIL_DOMAINS) {
      const maxDist = provider.length >= 9 ? 2 : 1;
      const dist = Math.min(
        domainDistance(domainPart, provider),
        domainDistance(collapsedDomain, collapseRepeatedChars(provider))
      );
      if (dist <= maxDist && dist < bestScore) {
        bestScore = dist;
        bestProvider = provider;
      }
    }
  }

  if (bestProvider) {
    return {
      localPart,
      typoSuggestion: `${localPart}@${bestProvider}`,
      domainSuggestions: [],
    };
  }

  const domainSuggestions = POPULAR_EMAIL_DOMAINS.filter(
    (domain) => domain.startsWith(domainPart) && domain !== domainPart
  );

  return {
    localPart,
    typoSuggestion: null,
    domainSuggestions,
  };
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<RecoveryStep>("request");
  const [requestMode, setRequestMode] = useState<RequestMode>("email");

  const [emailInput, setEmailInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [codeDigits, setCodeDigits] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [verifiedCode, setVerifiedCode] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [revokeAllSessions, setRevokeAllSessions] = useState(true);

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [fieldAction, setFieldAction] = useState<{
    href: string;
    label: string;
  } | null>(null);
  const [secondaryFieldError, setSecondaryFieldError] = useState<string | null>(
    null
  );
  const [statusNotice, setStatusNotice] = useState<{
    message: string;
    tone: "error" | "success" | "info";
  } | null>(null);
  const [feedbackTick, setFeedbackTick] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );

  const emailHelpers = getEmailDomainHelpers(emailInput);
  const rules = evaluatePasswordRules(newPassword, confirmPassword);
  const showPasswordRules =
    passwordFocused || (newPassword.length > 0 && !rules.allRequiredMet);
  const showConfirmRule =
    confirmFocused || (confirmPassword.length > 0 && !rules.matchesConfirm);

  const codeValue = codeDigits.join("");
  const isLocked = lockSecondsRemaining > 0;

  useEffect(() => {
    document.title = STEP_PAGE_TITLES[step];
  }, [step]);

  useEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.getAttribute("data-theme");
    const savedTheme = localStorage.getItem("drivelaeht-theme");

    root.setAttribute("data-theme", "catppuccin");
    root.classList.add("dark");

    return () => {
      const restore = savedTheme || previousTheme || "dark";
      root.setAttribute("data-theme", restore);
      root.classList.toggle("dark", restore !== "light");
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!lockedUntil) {
      setLockSecondsRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const target = new Date(lockedUntil).getTime();
      const diff = Math.ceil((target - Date.now()) / 1000);
      if (diff <= 0) {
        setLockedUntil(null);
        setLockSecondsRemaining(0);
        setRemainingAttempts(null);
      } else {
        setLockSecondsRemaining(diff);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  useEffect(() => {
    if (step === "verify") {
      const timer = window.setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [step]);

  function triggerFieldError(
    message: string,
    action?: { href: string; label: string }
  ) {
    setFieldError(message);
    setFieldAction(action ?? null);
    setFeedbackTick((prev) => prev + 1);
  }

  function triggerSecondaryError(message: string) {
    setSecondaryFieldError(message);
    setFeedbackTick((prev) => prev + 1);
  }

  function triggerNotice(
    message: string,
    tone: "error" | "success" | "info" = "info"
  ) {
    setStatusNotice({ message, tone });
    setFeedbackTick((prev) => prev + 1);
  }

  function clearFeedback() {
    setFieldError(null);
    setFieldAction(null);
    setSecondaryFieldError(null);
    setStatusNotice(null);
  }

  async function handleRequestSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    clearFeedback();

    if (requestMode === "email") {
      const normalizedEmail = emailInput.trim().toLowerCase();
      if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
        triggerFieldError("Ingresa un correo electrónico válido.");
        return;
      }

      if (emailHelpers.typoSuggestion) {
        triggerFieldError(
          `¿Quisiste decir ${emailHelpers.typoSuggestion}? Revisa tu correo antes de continuar.`
        );
        return;
      }

      setSubmitting(true);
      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "email",
            email: normalizedEmail,
          }),
        });

        const data = (await response
          .json()
          .catch(() => ({}))) as ForgotPasswordApiResponse;

        if (!response.ok) {
          if (response.status === 429 && data.lockedUntil) {
            setVerifiedEmail(normalizedEmail);
            setLockedUntil(data.lockedUntil);
            setStep("verify");
            setSubmitting(false);
            return;
          }

          triggerFieldError(
            data.error ||
              "Esta cuenta aún no tiene un correo verificado. Completa o crea tu registro para solicitar la recuperación.",
            {
              href: "/register",
              label: "Completar o crear registro",
            }
          );
          setSubmitting(false);
          return;
        }

        setVerifiedEmail(data.email || normalizedEmail);
        setCodeDigits(["", "", "", "", "", ""]);
        setRemainingAttempts(null);
        setLockedUntil(null);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setSubmitting(false);
        setStep("verify");
        triggerNotice(
          "Te enviamos un código de 6 dígitos a tu correo verificado.",
          "info"
        );
      } catch {
        triggerFieldError(
          "No pudimos conectar con el servidor. Inténtalo de nuevo."
        );
        setSubmitting(false);
      }
      return;
    }

    const normalizedUsername = usernameInput.trim();
    if (!normalizedUsername || !USERNAME_REGEX.test(normalizedUsername)) {
      triggerFieldError(
        "Usuario no válido (3 a 24 caracteres: letras, números, punto, guion o guion bajo)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "username",
          username: normalizedUsername,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as ForgotPasswordApiResponse;

      if (!response.ok) {
        triggerFieldError(
          data.error || "No pudimos enviar el recordatorio en este momento."
        );
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      triggerNotice(
        data.message ||
          "Si el usuario existe y tiene correo verificado, enviamos un recordatorio.",
        "success"
      );
    } catch {
      triggerFieldError(
        "No pudimos conectar con el servidor. Inténtalo de nuevo."
      );
      setSubmitting(false);
    }
  }

  function handleDigitChange(index: number, rawValue: string) {
    if (isLocked) return;
    const cleanDigit = rawValue.replace(/\D/g, "").slice(-1);

    setCodeDigits((prev) => {
      const updated = [...prev];
      updated[index] = cleanDigit;
      return updated;
    });

    if (fieldError) {
      setFieldError(null);
      setFieldAction(null);
    }

    if (cleanDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (isLocked) return;

    if (event.key === "Backspace") {
      if (codeDigits[index]) {
        setCodeDigits((prev) => {
          const updated = [...prev];
          updated[index] = "";
          return updated;
        });
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setCodeDigits((prev) => {
          const updated = [...prev];
          updated[index - 1] = "";
          return updated;
        });
      }
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
      event.preventDefault();
    }
  }

  function handleCodePaste(event: ClipboardEvent<HTMLInputElement>) {
    if (isLocked) return;
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;
    event.preventDefault();

    const nextDigits = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, idx) => {
      nextDigits[idx] = char;
    });
    setCodeDigits(nextDigits);

    if (fieldError) {
      setFieldError(null);
      setFieldAction(null);
    }

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleVerifyCode(event: FormEvent) {
    event.preventDefault();
    if (submitting || isLocked) return;
    clearFeedback();

    if (codeValue.length !== 6) {
      triggerFieldError("Ingresa los 6 dígitos del código enviado a tu correo.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifiedEmail,
          code: codeValue,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as ForgotPasswordApiResponse;

      if (!response.ok) {
        if (response.status === 429 && data.lockedUntil) {
          setLockedUntil(data.lockedUntil);
          setCodeDigits(["", "", "", "", "", ""]);
          setSubmitting(false);
          return;
        }

        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }

        triggerFieldError(
          typeof data.remainingAttempts === "number"
            ? `Código incorrecto. Te ${
                data.remainingAttempts === 1 ? "queda" : "quedan"
              } ${data.remainingAttempts} ${
                data.remainingAttempts === 1 ? "intento" : "intentos"
              }.`
            : "El código ingresado no es válido o ya venció."
        );
        setSubmitting(false);
        return;
      }

      const resolvedUsername = data.username || "";
      setVerifiedCode(codeValue);
      setCurrentUsername(resolvedUsername);
      setNewUsername(resolvedUsername);
      setRemainingAttempts(null);
      setSubmitting(false);
      setStep("reset");
    } catch {
      triggerFieldError("No se pudo verificar el código. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (resending || resendCooldown > 0 || isLocked || !verifiedEmail) return;
    clearFeedback();
    setResending(true);

    try {
      const response = await fetch("/api/auth/forgot-password/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifiedEmail,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as ForgotPasswordApiResponse;

      if (!response.ok) {
        if (response.status === 429 && data.lockedUntil) {
          setLockedUntil(data.lockedUntil);
          setResending(false);
          return;
        }

        triggerFieldError(
          data.error || "No se pudo reenviar el código de verificación."
        );
        setResending(false);
        return;
      }

      setCodeDigits(["", "", "", "", "", ""]);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResending(false);
      triggerNotice(
        "Te enviamos un nuevo código de 6 dígitos a tu correo.",
        "success"
      );
      inputRefs.current[0]?.focus();
    } catch {
      triggerFieldError("No pudimos conectar con el servidor al reenviar.");
      setResending(false);
    }
  }

  async function handleResetSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    clearFeedback();

    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername || !USERNAME_REGEX.test(trimmedUsername)) {
      triggerFieldError(
        "Usuario no válido (3 a 24 caracteres: letras, números, punto, guion o guion bajo)."
      );
      return;
    }

    if (!rules.allRequiredMet) {
      triggerSecondaryError(
        "La contraseña no cumple con los requisitos obligatorios."
      );
      return;
    }

    if (!rules.matchesConfirm) {
      triggerSecondaryError("Las contraseñas no coinciden, vuelva a intentarlo.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifiedEmail,
          code: verifiedCode,
          newPassword,
          confirmPassword,
          ...(trimmedUsername !== currentUsername
            ? { newUsername: trimmedUsername }
            : {}),
          revokeAllSessions,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as ForgotPasswordApiResponse;

      if (!response.ok) {
        if (response.status === 429 && data.lockedUntil) {
          setLockedUntil(data.lockedUntil);
          setStep("verify");
          setSubmitting(false);
          return;
        }

        if (response.status === 409 || data.field === "username") {
          triggerFieldError(
            data.error ||
              "Este nombre de usuario ya está en uso. Elige otro para continuar."
          );
          setSubmitting(false);
          return;
        }

        triggerNotice(
          data.error ||
            "No se pudo completar el cambio. Verifica que el código siga vigente.",
          "error"
        );
        setSubmitting(false);
        return;
      }

      setCurrentUsername(data.username || trimmedUsername);
      setSubmitting(false);
      setStep("completed");
    } catch {
      triggerNotice("No pudimos conectar con el servidor al guardar.", "error");
      setSubmitting(false);
    }
  }

  return (
    <div
      data-theme="catppuccin"
      className="dark min-h-screen bg-app text-ink flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 transition-colors duration-200"
    >
      <div className="w-full max-w-md rounded-2xl border border-edge bg-surface p-5 sm:p-8 shadow-xl space-y-6 animate-fade-in-up">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {step === "request" || step === "completed" ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-secondary transition-colors hover:text-ink"
              >
                <span aria-hidden="true">←</span>
                <span>Volver a Iniciar Sesión</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  setStep(step === "reset" ? "verify" : "request");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-secondary transition-colors hover:text-ink"
              >
                <span aria-hidden="true">←</span>
                <span>Paso anterior</span>
              </button>
            )}

            <span className="text-[11px] font-medium text-muted">
              {step === "request" && "Paso 1 de 3"}
              {step === "verify" && "Paso 2 de 3"}
              {step === "reset" && "Paso 3 de 3"}
              {step === "completed" && "Completado"}
            </span>
          </div>

          <div className="text-center space-y-1.5 pt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              {step === "request" && "Recuperar Acceso"}
              {step === "verify" && "Verificar Código"}
              {step === "reset" && "Nuevas Credenciales"}
              {step === "completed" && "Acceso Restablecido"}
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              {step === "request" &&
                "Elige cómo deseas recuperar el acceso a tu espacio en Drivelaeht."}
              {step === "verify" &&
                `Ingresa el código de 6 dígitos enviado a ${verifiedEmail}.`}
              {step === "reset" &&
                "Actualiza tu contraseña y verifica tu nombre de usuario asociado."}
              {step === "completed" &&
                "Tus credenciales fueron actualizadas correctamente."}
            </p>
          </div>
        </div>

        {statusNotice && (
          <FieldFeedback
            key={`notice-${feedbackTick}`}
            message={statusNotice.message}
            durationMs={FEEDBACK_DURATION_MS}
            tone={statusNotice.tone}
            onDismiss={() => setStatusNotice(null)}
          />
        )}

        {step === "request" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-edge bg-app p-1">
              <button
                type="button"
                onClick={() => {
                  setRequestMode("email");
                  clearFeedback();
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  requestMode === "email"
                    ? "bg-accent text-accent-fg shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                Tengo mi correo
              </button>
              <button
                type="button"
                onClick={() => {
                  setRequestMode("username");
                  clearFeedback();
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  requestMode === "username"
                    ? "bg-accent text-accent-fg shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                Olvidé mi correo
              </button>
            </div>

            <form
              onSubmit={handleRequestSubmit}
              noValidate
              className="space-y-4"
            >
              {requestMode === "email" ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="recovery-email"
                    className="block text-xs font-medium text-ink"
                  >
                    Correo electrónico registrado
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (fieldError) {
                        setFieldError(null);
                        setFieldAction(null);
                      }
                    }}
                    placeholder="correo@ejemplo.com"
                    aria-invalid={Boolean(fieldError)}
                    className={`w-full rounded-xl border bg-app px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors ${
                      fieldError
                        ? "border-rose-400 focus:border-rose-400"
                        : "border-edge focus:border-accent"
                    }`}
                  />

                  {emailHelpers.typoSuggestion && (
                    <div className="pt-1 flex items-center justify-between gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                      <span>
                        ¿Quisiste decir{" "}
                        <strong className="font-semibold text-ink">
                          {emailHelpers.typoSuggestion}
                        </strong>
                        ?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailInput(emailHelpers.typoSuggestion!);
                          if (fieldError) {
                            setFieldError(null);
                            setFieldAction(null);
                          }
                        }}
                        className="shrink-0 font-semibold text-accent hover:underline"
                      >
                        Corregir
                      </button>
                    </div>
                  )}

                  {!emailHelpers.typoSuggestion &&
                    emailHelpers.domainSuggestions.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {emailHelpers.domainSuggestions.map((domain) => {
                          const candidate = `${emailHelpers.localPart}@${domain}`;
                          return (
                            <button
                              key={domain}
                              type="button"
                              onClick={() => {
                                setEmailInput(candidate);
                                if (fieldError) {
                                  setFieldError(null);
                                  setFieldAction(null);
                                }
                              }}
                              className="rounded-lg border border-edge bg-app/80 px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-accent hover:text-ink"
                            >
                              {candidate}
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {fieldError && (
                    <FieldFeedback
                      key={`email-err-${feedbackTick}`}
                      message={fieldError}
                      durationMs={FEEDBACK_DURATION_MS}
                      actionHref={fieldAction?.href}
                      actionLabel={fieldAction?.label}
                      onDismiss={() => {
                        setFieldError(null);
                        setFieldAction(null);
                      }}
                    />
                  )}
                  <p className="text-[11px] text-muted pt-0.5">
                    Te enviaremos un código de 6 dígitos si tu correo está
                    verificado.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label
                    htmlFor="recovery-username"
                    className="block text-xs font-medium text-ink"
                  >
                    Nombre de usuario
                  </label>
                  <input
                    id="recovery-username"
                    type="text"
                    autoComplete="username"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      if (fieldError) {
                        setFieldError(null);
                        setFieldAction(null);
                      }
                    }}
                    placeholder="Tu usuario registrado"
                    aria-invalid={Boolean(fieldError)}
                    className={`w-full rounded-xl border bg-app px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors ${
                      fieldError
                        ? "border-rose-400 focus:border-rose-400"
                        : "border-edge focus:border-accent"
                    }`}
                  />
                  {fieldError && (
                    <FieldFeedback
                      key={`user-err-${feedbackTick}`}
                      message={fieldError}
                      durationMs={FEEDBACK_DURATION_MS}
                      actionHref={fieldAction?.href}
                      actionLabel={fieldAction?.label}
                      onDismiss={() => {
                        setFieldError(null);
                        setFieldAction(null);
                      }}
                    />
                  )}
                  <p className="text-[11px] text-muted pt-0.5">
                    Por seguridad, enviaremos un recordatorio con tus datos al
                    correo verificado vinculado a este usuario.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  (requestMode === "email"
                    ? !emailInput.trim()
                    : !usernameInput.trim())
                }
                className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Procesando..."
                  : requestMode === "email"
                    ? "Enviar código de 6 dígitos"
                    : "Enviar recordatorio al correo"}
              </button>
            </form>

            <div className="rounded-xl border border-edge/80 bg-app/60 p-3.5 space-y-1.5 text-xs">
              <p className="font-medium text-ink">
                ¿Ya no tienes acceso a tu correo electrónico?
              </p>
              <p className="text-muted leading-relaxed">
                Por seguridad no es posible cambiar el correo sin verificarlo.
                Contáctanos para validar tu identidad manualmente:{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Soporte%20de%20Recuperaci%C3%B3n%20-%20Drivelaeht`}
                  className="font-semibold text-accent hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerifyCode} noValidate className="space-y-5">
            {isLocked ? (
              <div className="rounded-xl border border-rose-400/50 bg-rose-500/10 p-4 text-center space-y-1.5">
                <p className="text-xs font-semibold text-rose-300">
                  Verificación bloqueada temporalmente
                </p>
                <p className="text-xs text-muted">
                  Superaste el límite de intentos. Podrás volver a intentarlo en{" "}
                  <span className="font-mono font-semibold text-ink">
                    {formatCountdown(lockSecondsRemaining)}
                  </span>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-ink text-center">
                  Código de seguridad (6 dígitos)
                </label>

                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={digit}
                      disabled={submitting || isLocked}
                      onChange={(e) =>
                        handleDigitChange(index, e.target.value)
                      }
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      onPaste={handleCodePaste}
                      aria-label={`Dígito ${index + 1} del código`}
                      className={`h-12 sm:h-13 w-full rounded-xl border bg-app text-center font-mono text-lg sm:text-xl font-bold text-ink focus:outline-none transition-colors ${
                        fieldError
                          ? "border-rose-400 focus:border-rose-400"
                          : digit
                            ? "border-accent"
                            : "border-edge focus:border-accent"
                      }`}
                    />
                  ))}
                </div>

                {fieldError && (
                  <FieldFeedback
                    key={`code-err-${feedbackTick}`}
                    message={fieldError}
                    durationMs={FEEDBACK_DURATION_MS}
                    onDismiss={() => setFieldError(null)}
                  />
                )}

                {remainingAttempts !== null && !fieldError && (
                  <p className="text-center text-xs text-rose-300">
                    Intentos restantes: {remainingAttempts}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isLocked || codeValue.length !== 6}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Verificando código..." : "Verificar y continuar"}
            </button>

            <div className="flex items-center justify-between pt-1 border-t border-edge/80 text-xs">
              <span className="text-muted">¿No recibiste el correo?</span>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending || resendCooldown > 0 || isLocked}
                className="font-semibold text-accent hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
              >
                {resending
                  ? "Reenviando..."
                  : resendCooldown > 0
                    ? `Reenviar en ${resendCooldown}s`
                    : "Reenviar código"}
              </button>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="reset-username"
                  className="block text-xs font-medium text-ink"
                >
                  Nombre de usuario asociado
                </label>
                <span className="text-[11px] text-muted">Editable</span>
              </div>
              <input
                id="reset-username"
                type="text"
                autoComplete="username"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  if (fieldError) {
                    setFieldError(null);
                    setFieldAction(null);
                  }
                }}
                aria-invalid={Boolean(fieldError)}
                className={`w-full rounded-xl border bg-app px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors ${
                  fieldError
                    ? "border-rose-400 focus:border-rose-400"
                    : "border-edge focus:border-accent"
                }`}
              />
              {fieldError && (
                <FieldFeedback
                  key={`reset-user-${feedbackTick}`}
                  message={fieldError}
                  durationMs={FEEDBACK_DURATION_MS}
                  onDismiss={() => setFieldError(null)}
                />
              )}
              <p className="text-[11px] text-muted">
                Si habías olvidado cómo estaba escrito, aquí puedes verlo o
                actualizarlo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="block text-xs font-medium text-ink"
              >
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (secondaryFieldError) setSecondaryFieldError(null);
                  }}
                  placeholder="•••••••••"
                  className="w-full rounded-xl border border-edge bg-app py-2.5 pl-3.5 pr-10 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none transition-colors"
                />

                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition-colors hover:text-ink"
                >
                  {showNewPassword ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" x2="23" y1="1" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <div
                className={`grid transition-all duration-300 ease-out ${
                  showPasswordRules
                    ? "grid-rows-[1fr] opacity-100 pt-1"
                    : "grid-rows-[0fr] opacity-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="rounded-xl border border-edge/80 bg-app/70 px-3.5 py-2.5 space-y-1 text-xs">
                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        rules.greaterThanEight
                          ? "text-emerald-300"
                          : "text-muted"
                      }`}
                    >
                      <span aria-hidden="true">
                        {rules.greaterThanEight ? "✓" : "•"}
                      </span>
                      <span>Contraseña mayor de 8 dígitos</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        rules.hasUppercase ? "text-emerald-300" : "text-muted"
                      }`}
                    >
                      <span aria-hidden="true">
                        {rules.hasUppercase ? "✓" : "•"}
                      </span>
                      <span>Incluir una mayúscula</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        rules.hasNumber ? "text-emerald-300" : "text-muted"
                      }`}
                    >
                      <span aria-hidden="true">
                        {rules.hasNumber ? "✓" : "•"}
                      </span>
                      <span>Incluir números</span>
                    </div>

                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        rules.hasSpecial ? "text-emerald-300" : "text-muted"
                      }`}
                    >
                      <span aria-hidden="true">
                        {rules.hasSpecial ? "✓" : "•"}
                      </span>
                      <span>Incluir carácter (Opcional)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-new-password"
                className="block text-xs font-medium text-ink"
              >
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (secondaryFieldError) setSecondaryFieldError(null);
                  }}
                  placeholder="•••••••••"
                  className="w-full rounded-xl border border-edge bg-app py-2.5 pl-3.5 pr-10 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none transition-colors"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar confirmación"
                      : "Mostrar confirmación"
                  }
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition-colors hover:text-ink"
                >
                  {showConfirmPassword ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" x2="23" y1="1" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {secondaryFieldError && (
                <FieldFeedback
                  key={`pass-err-${feedbackTick}`}
                  message={secondaryFieldError}
                  durationMs={FEEDBACK_DURATION_MS}
                  onDismiss={() => setSecondaryFieldError(null)}
                />
              )}

              <div
                className={`grid transition-all duration-300 ease-out ${
                  showConfirmRule
                    ? "grid-rows-[1fr] opacity-100 pt-1"
                    : "grid-rows-[0fr] opacity-0 pointer-events-none"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="rounded-xl border border-edge/80 bg-app/70 px-3.5 py-2 text-xs">
                    <div
                      className={`flex items-center gap-2 transition-colors ${
                        rules.matchesConfirm ? "text-emerald-300" : "text-muted"
                      }`}
                    >
                      <span aria-hidden="true">
                        {rules.matchesConfirm ? "✓" : "•"}
                      </span>
                      <span>Deben coincidir</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-edge/80 bg-app/60 px-3.5 py-2.5 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={revokeAllSessions}
                onChange={(e) => setRevokeAllSessions(e.target.checked)}
                className="h-4 w-4 rounded border-edge accent-accent"
              />
              <span>
                Cerrar sesión en todos los dispositivos activos por seguridad
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !newPassword || !confirmPassword}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Guardando cambios..." : "Actualizar credenciales"}
            </button>
          </form>
        )}

        {step === "completed" && (
          <div className="space-y-5 text-center">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-1.5 text-xs">
              <p className="font-semibold text-emerald-300">
                Cuenta lista para iniciar sesión
              </p>
              <p className="text-muted">
                Usuario:{" "}
                <span className="font-semibold text-ink">{currentUsername}</span>
              </p>
              <p className="text-muted">
                Correo:{" "}
                <span className="font-semibold text-ink">{verifiedEmail}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        )}

        <div className="pt-1 border-t border-edge/80 text-center text-xs text-muted">
          <p>
            ¿Aún no tienes una cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold text-accent hover:underline"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}