"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FieldErrors {
  email?: string;
  password?: string;
}

interface LoginErrorPayload {
  error?: string;
  field?: string;
  remainingAttempts?: number;
  lockedUntil?: string;
  requiresTwoFactor?: boolean;
  details?: {
    email?: string[];
    password?: string[];
  };
}

interface FieldFeedbackProps {
  message: string;
  attemptsText?: string | null;
  durationMs: number;
  onDismiss: () => void;
}

function FieldFeedback({
  message,
  attemptsText,
  durationMs,
  onDismiss,
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
  }, [message, attemptsText, durationMs, onDismiss]);

  return (
    <div
      role="alert"
      className={`pt-1.5 space-y-1 transition-all duration-300 ease-out ${
        exiting ? "opacity-0 -translate-y-0.5" : "opacity-100 translate-y-0"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-rose-300 flex items-center gap-1.5">
          <span aria-hidden="true">•</span>
          <span>{message}</span>
        </p>
        {attemptsText && (
          <span className="text-amber-300/90 font-medium">{attemptsText}</span>
        )}
      </div>

      <div className="h-[2px] w-full overflow-hidden rounded-full bg-rose-400/15">
        <div
          style={{
            width: progressActive ? "0%" : "100%",
            transitionDuration: `${durationMs}ms`,
          }}
          className="h-full rounded-full bg-rose-400/75 transition-[width] ease-linear"
        />
      </div>
    </div>
  );
}

const OAUTH_PROVIDERS = [
  {
    id: "discord",
    name: "Discord",
    icon: (
      <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
      </svg>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    icon: (
      <svg className="h-4 w-4 text-ink" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
        />
      </svg>
    ),
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.54-1.14 2.85-2.4 3.72v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.26Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
        />
      </svg>
    ),
  },
  {
    id: "microsoft",
    name: "Microsoft (Outlook)",
    icon: (
      <svg className="h-4 w-4 text-accent-secondary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="2" y="2" width="9" height="9" rx="1" />
        <rect x="13" y="2" width="9" height="9" rx="1" />
        <rect x="2" y="13" width="9" height="9" rx="1" />
        <rect x="13" y="13" width="9" height="9" rx="1" />
      </svg>
    ),
  },
];

const FEEDBACK_DURATION_MS = 8000;
const EMAIL_ERROR_MESSAGE = "Ingresa un correo electrónico válido.";
const PASSWORD_ERROR_MESSAGE =
  "La contraseña ingresada no es válida. Inténtalo de nuevo.";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POPULAR_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
] as const;

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

function formatWaitTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins > 0) {
    return `${mins} ${mins === 1 ? "minuto" : "minutos"} ${secs} ${secs === 1 ? "segundo" : "segundos"}`;
  }
  return `${secs} ${secs === 1 ? "segundo" : "segundos"}`;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorField, setErrorField] = useState<"email" | "password" | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  const emailHelpers = getEmailDomainHelpers(email);
  const lockSecondsLeft = lockedUntil
    ? Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - nowMs) / 1000))
    : 0;
  const isLocked = lockSecondsLeft > 0;
  const hasBothFieldsFilled = email.trim().length > 0 && password.trim().length > 0;
  const isSubmitDisabled = submitting || isLocked || !hasBothFieldsFilled;

  useEffect(() => {
    document.title = "Login | Drivelaeht Oficial Web";

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
    if (!lockedUntil) {
      return;
    }

    const interval = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (new Date(lockedUntil).getTime() <= current) {
        setLockedUntil(null);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  function setFieldError(field: "email" | "password", message: string) {
    setErrorField(field);
    setErrors({ [field]: message });
    setErrorTick((prev) => prev + 1);
  }

  function clearErrors() {
    setErrors({});
    setErrorField(null);
  }

  function validateClientFields(rawEmail: string, rawPassword: string): FieldErrors {
    const trimmedEmail = rawEmail.trim();
    const emailInvalid = !trimmedEmail || !EMAIL_REGEX.test(trimmedEmail);
    const passwordInvalid = !rawPassword || rawPassword.length < 6;

    if (emailInvalid) {
      return { email: EMAIL_ERROR_MESSAGE };
    }
    if (emailHelpers.typoSuggestion) {
      return {
        email: `¿Quisiste decir ${emailHelpers.typoSuggestion}? Verifica tu correo antes de continuar.`,
      };
    }
    if (passwordInvalid) {
      return { password: PASSWORD_ERROR_MESSAGE };
    }

    return {};
  }

  function mapServerFailure(status: number, data: LoginErrorPayload): FieldErrors {
    if (status === 429 || data?.lockedUntil) {
      const targetLock =
        data?.lockedUntil || new Date(Date.now() + 10 * 60 * 1000).toISOString();
      setNowMs(Date.now());
      setLockedUntil(targetLock);
      setRemainingAttempts(0);
      return {};
    }

    if (typeof data?.remainingAttempts === "number") {
      setRemainingAttempts(data.remainingAttempts);
    }

    const hasEmailDetail = Boolean(data?.details?.email?.length);
    const hasPasswordDetail = Boolean(data?.details?.password?.length);
    const serverField = typeof data?.field === "string" ? data.field.toLowerCase() : "";

    if (serverField === "email" || hasEmailDetail) {
      setErrorField("email");
      return { email: EMAIL_ERROR_MESSAGE };
    }

    if (serverField === "password" || hasPasswordDetail) {
      setErrorField("password");
      return { password: PASSWORD_ERROR_MESSAGE };
    }

    const emailValid = EMAIL_REGEX.test(email.trim());
    if (!emailValid) {
      setErrorField("email");
      return { email: EMAIL_ERROR_MESSAGE };
    }

    setErrorField("password");
    return { password: PASSWORD_ERROR_MESSAGE };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitDisabled) return;

    const clientErrors = validateClientFields(email, password);
    if (clientErrors.email) {
      setFieldError("email", clientErrors.email);
      return;
    }
    if (clientErrors.password) {
      setFieldError("password", clientErrors.password);
      return;
    }

    clearErrors();
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as LoginErrorPayload;

      if (!response.ok) {
        setErrors(mapServerFailure(response.status, data));
        setSubmitting(false);
        return;
      }

      setRemainingAttempts(null);
      setLockedUntil(null);

      if (data?.requiresTwoFactor) {
        router.push("/login/2fa");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setFieldError("password", PASSWORD_ERROR_MESSAGE);
      setSubmitting(false);
    }
  }

  const attemptsText =
    !isLocked && remainingAttempts !== null && remainingAttempts > 0
      ? `Te ${remainingAttempts === 1 ? "queda" : "quedan"} ${remainingAttempts} ${remainingAttempts === 1 ? "intento" : "intentos"}`
      : null;

  return (
    <div
      data-theme="catppuccin"
      className="dark min-h-screen bg-app text-ink flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 transition-colors duration-200"
    >
      <div className="w-full max-w-md rounded-2xl border border-edge bg-surface p-5 sm:p-8 shadow-xl space-y-6 animate-fade-in-up">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-secondary transition-colors hover:text-ink"
            >
              <span aria-hidden="true">←</span>
              <span>Volver a Inicio</span>
            </Link>
          </div>

          <div className="text-center space-y-1.5 pt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Iniciar Sesión
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Accede a tu espacio privado en Drivelaeht desde este dispositivo.
            </p>
          </div>
        </div>

        {isLocked && (
          <div
            role="alert"
            className="rounded-xl border border-rose-400/50 bg-rose-500/15 px-4 py-3 text-xs sm:text-sm text-rose-200"
          >
            <p className="font-semibold">
              Has alcanzado el límite de intentos. Vuelve a intentarlo en{" "}
              <span className="font-mono font-bold text-rose-100">
                {formatWaitTime(lockSecondsLeft)}
              </span>
              .
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-medium text-ink"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              disabled={isLocked}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              placeholder="correo@ejemplo.com"
              aria-invalid={Boolean(errors.email)}
              className={`w-full rounded-xl border bg-app px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors disabled:opacity-60 ${
                errors.email
                  ? "border-rose-400 focus:border-rose-400"
                  : "border-edge focus:border-accent"
              }`}
            />

            {!isLocked && emailHelpers.typoSuggestion && (
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
                    setEmail(emailHelpers.typoSuggestion!);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  className="shrink-0 font-semibold text-accent hover:underline"
                >
                  Corregir
                </button>
              </div>
            )}

            {!isLocked &&
              !emailHelpers.typoSuggestion &&
              emailHelpers.domainSuggestions.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {emailHelpers.domainSuggestions.map((domain) => {
                    const candidate = `${emailHelpers.localPart}@${domain}`;
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => {
                          setEmail(candidate);
                          if (errors.email) {
                            setErrors((prev) => ({ ...prev, email: undefined }));
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

            {errors.email && (
              <FieldFeedback
                key={`email-${errorTick}`}
                message={errors.email}
                attemptsText={errorField === "email" ? attemptsText : null}
                durationMs={FEEDBACK_DURATION_MS}
                onDismiss={() => setErrors((prev) => ({ ...prev, email: undefined }))}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-ink"
              >
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-accent-secondary hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isLocked}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                className={`w-full rounded-xl border bg-app py-2.5 pl-3.5 pr-10 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors disabled:opacity-60 ${
                  errors.password
                    ? "border-rose-400 focus:border-rose-400"
                    : "border-edge focus:border-accent"
                }`}
              />

              <button
                type="button"
                disabled={isLocked}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition-colors hover:text-ink disabled:opacity-50"
              >
                {showPassword ? (
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

            {errors.password && (
              <FieldFeedback
                key={`password-${errorTick}`}
                message={errors.password}
                attemptsText={errorField === "password" ? attemptsText : null}
                durationMs={FEEDBACK_DURATION_MS}
                onDismiss={() => setErrors((prev) => ({ ...prev, password: undefined }))}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Verificando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-edge" />
          <span className="font-mono text-xs font-semibold text-muted">
            O
          </span>
          <span className="h-px flex-1 bg-edge" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {OAUTH_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              aria-label={`Continuar con ${provider.name}`}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-edge bg-app px-3.5 py-2.5 text-xs font-medium text-ink transition-colors hover:border-accent/45 hover:bg-surface-hover"
            >
              {provider.icon}
              <span className="truncate">{provider.name}</span>
            </button>
          ))}
        </div>

        <div className="pt-1 border-t border-edge/80 text-center text-xs text-muted">
          <p>
            ¿No tienes cuenta?{" "}
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