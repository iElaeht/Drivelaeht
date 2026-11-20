"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TokenModal } from "@/components/auth/TokenModal";

type PendingResolution = "resume_existing" | "replace_with_new";

interface RegisterFieldErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface RegisterApiPayload {
  error?: string;
  field?: "username" | "email" | "password" | "confirmPassword";
  lockedUntil?: string;
  requiresTwoFactor?: boolean;
  pendingConflict?: boolean;
  pendingAction?: "choose_resolution";
  action?: "created" | "resumed" | PendingResolution;
  email?: string;
  user?: {
    email?: string;
  };
  details?: {
    username?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
}

interface FieldFeedbackProps {
  message: string;
  durationMs: number;
  onDismiss: () => void;
}

function FieldFeedback({ message, durationMs, onDismiss }: FieldFeedbackProps) {
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

  return (
    <div
      role="alert"
      className={`pt-1.5 space-y-1 transition-all duration-300 ease-out ${
        exiting ? "opacity-0 -translate-y-0.5" : "opacity-100 translate-y-0"
      }`}
    >
      <p className="text-xs text-rose-300 flex items-center gap-1.5">
        <span aria-hidden="true">•</span>
        <span>{message}</span>
      </p>

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

const FEEDBACK_DURATION_MS = 8000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,24}$/;
const POPULAR_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
] as const;

const USERNAME_ERROR_MESSAGE =
  "Usuario no válido (3 a 24 caracteres: letras, números, punto, guion o guion bajo)";
const USERNAME_MISMATCH_PENDING_MESSAGE =
  "Este correo ya tiene un registro pendiente con otro nombre de usuario.";
const EMAIL_ERROR_MESSAGE = "Correo no Valido, Vuelva a intentarlo";
const EMAIL_EXISTS_MESSAGE =
  "Este correo electrónico ya está asociado a una cuenta. Inicia sesión para continuar.";
const USERNAME_EXISTS_MESSAGE = "El usuario ya existe";
const PASSWORD_RULES_MESSAGE =
  "La contraseña no cumple con los requisitos obligatorios";
const CONFIRM_MISMATCH_MESSAGE = "Las contraseñas no coinciden, vuelva a intentarlo";
const GENERIC_ERROR_MESSAGE =
  "No se pudo completar el registro, inténtalo de nuevo";

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

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [pendingResolutionPrompt, setPendingResolutionPrompt] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const rules = evaluatePasswordRules(password, confirmPassword);
  const emailHelpers = getEmailDomainHelpers(email);

  const showPasswordRules =
    passwordFocused || (password.length > 0 && !rules.allRequiredMet);
  const showConfirmRule =
    confirmFocused || (confirmPassword.length > 0 && !rules.matchesConfirm);

  const hasAllFieldsFilled =
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;

  const isSubmitDisabled = submitting || !hasAllFieldsFilled;

  useEffect(() => {
    document.title = "Register | Drivelaeht Oficial Web";

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

  function applyErrors(next: RegisterFieldErrors, globalError: string | null = null) {
    setErrors(next);
    setBannerError(globalError);
    setErrorTick((prev) => prev + 1);
  }

  function clearFieldError(field: keyof RegisterFieldErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    if (field === "username" || field === "email") {
      setPendingResolutionPrompt(false);
    }
    if (bannerError) {
      setBannerError(null);
    }
  }

  function validateForm(): RegisterFieldErrors {
    const nextErrors: RegisterFieldErrors = {};
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !USERNAME_REGEX.test(trimmedUsername)) {
      nextErrors.username = USERNAME_ERROR_MESSAGE;
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = EMAIL_ERROR_MESSAGE;
    } else if (emailHelpers.typoSuggestion) {
      nextErrors.email = `¿Quisiste decir ${emailHelpers.typoSuggestion}? Verifica el dominio de tu correo.`;
    }

    if (!rules.allRequiredMet) {
      nextErrors.password = PASSWORD_RULES_MESSAGE;
    }

    if (!rules.matchesConfirm) {
      nextErrors.confirmPassword = CONFIRM_MISMATCH_MESSAGE;
    }

    return nextErrors;
  }

  function mapServerFailure(
    status: number,
    data: RegisterApiPayload
  ): {
    fieldErrors: RegisterFieldErrors;
    globalError: string | null;
    isPendingConflict: boolean;
  } {
    if (status >= 500) {
      return {
        fieldErrors: {},
        globalError: GENERIC_ERROR_MESSAGE,
        isPendingConflict: false,
      };
    }

    const rawServerError = typeof data?.error === "string" ? data.error : "";
    const rawError = rawServerError.toLowerCase();
    const isPendingConflict =
      data?.pendingConflict === true ||
      data?.pendingAction === "choose_resolution" ||
      rawError.includes("pendiente con otro nombre");

    const isUsernameMismatch =
      isPendingConflict ||
      rawError.includes("coincide") ||
      rawError.includes("pendiente") ||
      rawError.includes("match");

    if (data?.field === "username" || data?.details?.username?.length) {
      return {
        fieldErrors: {
          username: isUsernameMismatch
            ? USERNAME_MISMATCH_PENDING_MESSAGE
            : status === 409
              ? USERNAME_EXISTS_MESSAGE
              : USERNAME_ERROR_MESSAGE,
        },
        globalError: null,
        isPendingConflict,
      };
    }

    if (data?.field === "email" || data?.details?.email?.length) {
      const isExistingEmail =
        rawError.includes("ya se encuentra en uso") ||
        rawError.includes("already") ||
        rawError.includes("registered");

      const emailMessage = isExistingEmail
        ? EMAIL_EXISTS_MESSAGE
        : rawServerError && !rawError.includes("invalid registration")
          ? rawServerError
          : EMAIL_ERROR_MESSAGE;

      return {
        fieldErrors: {
          email: emailMessage,
        },
        globalError: null,
        isPendingConflict: false,
      };
    }

    if (data?.field === "password" || data?.details?.password?.length) {
      return {
        fieldErrors: { password: PASSWORD_RULES_MESSAGE },
        globalError: null,
        isPendingConflict: false,
      };
    }

    if (
      data?.field === "confirmPassword" ||
      data?.details?.confirmPassword?.length
    ) {
      return {
        fieldErrors: { confirmPassword: CONFIRM_MISMATCH_MESSAGE },
        globalError: null,
        isPendingConflict: false,
      };
    }

    if (rawError.includes("username") || rawError.includes("usuario")) {
      return {
        fieldErrors: {
          username: isUsernameMismatch
            ? USERNAME_MISMATCH_PENDING_MESSAGE
            : status === 409 ||
                rawError.includes("exist") ||
                rawError.includes("uso")
              ? USERNAME_EXISTS_MESSAGE
              : USERNAME_ERROR_MESSAGE,
        },
        globalError: null,
        isPendingConflict,
      };
    }

    if (rawError.includes("email") || rawError.includes("correo")) {
      return {
        fieldErrors: {
          email:
            rawError.includes("already") ||
            rawError.includes("exist") ||
            rawError.includes("registered") ||
            rawError.includes("en uso")
              ? EMAIL_EXISTS_MESSAGE
              : rawServerError || EMAIL_ERROR_MESSAGE,
        },
        globalError: null,
        isPendingConflict: false,
      };
    }

    if (rawError.includes("match") || rawError.includes("confirm")) {
      return {
        fieldErrors: { confirmPassword: CONFIRM_MISMATCH_MESSAGE },
        globalError: null,
        isPendingConflict: false,
      };
    }

    if (rawError.includes("password") || rawError.includes("contraseña")) {
      return {
        fieldErrors: { password: PASSWORD_RULES_MESSAGE },
        globalError: null,
        isPendingConflict: false,
      };
    }

    return {
      fieldErrors: {},
      globalError: GENERIC_ERROR_MESSAGE,
      isPendingConflict: false,
    };
  }

  async function sendRegistrationRequest(pendingResolution?: PendingResolution) {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      applyErrors(validationErrors, null);
      return;
    }

    setErrors({});
    setBannerError(null);
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: normalizedEmail,
          password,
          confirmPassword,
          ...(pendingResolution ? { pendingResolution } : {}),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as RegisterApiPayload;

      if (!response.ok) {
        if (response.status === 429 && data?.lockedUntil) {
          setPendingResolutionPrompt(false);
          setSubmitting(false);
          setLockedUntil(data.lockedUntil);
          setVerificationEmail(normalizedEmail);
          return;
        }

        const mapped = mapServerFailure(response.status, data);
        setPendingResolutionPrompt(mapped.isPendingConflict);
        applyErrors(mapped.fieldErrors, mapped.globalError);
        setSubmitting(false);
        return;
      }

      setPendingResolutionPrompt(false);
      setSubmitting(false);
      setLockedUntil(null);
      setVerificationEmail(data?.email || data?.user?.email || normalizedEmail);
    } catch {
      applyErrors({}, GENERIC_ERROR_MESSAGE);
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitDisabled) return;
    await sendRegistrationRequest();
  }

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
              Crear Cuenta
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Registra tu espacio privado en Drivelaeht con credenciales seguras.
            </p>
          </div>
        </div>

        {bannerError && (
          <FieldFeedback
            key={`banner-${errorTick}`}
            message={bannerError}
            durationMs={FEEDBACK_DURATION_MS}
            onDismiss={() => setBannerError(null)}
          />
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block text-xs font-medium text-ink"
            >
              Nombre de usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearFieldError("username");
              }}
              placeholder="Username"
              aria-invalid={Boolean(errors.username)}
              className={`w-full rounded-xl border bg-app px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors ${
                errors.username
                  ? "border-rose-400 focus:border-rose-400"
                  : "border-edge focus:border-accent"
              }`}
            />
            {errors.username && (
              <FieldFeedback
                key={`username-${errorTick}`}
                message={errors.username}
                durationMs={FEEDBACK_DURATION_MS}
                onDismiss={() => clearFieldError("username")}
              />
            )}

            {pendingResolutionPrompt && (
              <div className="mt-2 rounded-xl border border-edge bg-app/80 p-3 space-y-2.5 text-xs">
                <p className="text-muted leading-relaxed">
                  ¿Olvidaste el usuario que usaste antes o deseas reemplazar el
                  registro pendiente de este correo? Te enviaremos un código a tu
                  correo para verificarlo.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => sendRegistrationRequest("resume_existing")}
                    className="flex-1 rounded-lg border border-edge bg-surface px-3 py-2 font-medium text-ink transition-colors hover:border-accent disabled:opacity-50"
                  >
                    Continuar con usuario anterior
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => sendRegistrationRequest("replace_with_new")}
                    className="flex-1 rounded-lg bg-accent px-3 py-2 font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    Usar este nuevo usuario
                  </button>
                </div>
              </div>
            )}
          </div>

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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              placeholder="correo@ejemplo.com"
              aria-invalid={Boolean(errors.email)}
              className={`w-full rounded-xl border bg-app px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors ${
                errors.email
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
                    setEmail(emailHelpers.typoSuggestion!);
                    clearFieldError("email");
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
                          setEmail(candidate);
                          clearFieldError("email");
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
                durationMs={FEEDBACK_DURATION_MS}
                onDismiss={() => clearFieldError("email")}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-ink"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                placeholder="•••••••••"
                aria-invalid={Boolean(errors.password)}
                className={`w-full rounded-xl border bg-app py-2.5 pl-3.5 pr-10 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors ${
                  errors.password
                    ? "border-rose-400 focus:border-rose-400"
                    : "border-edge focus:border-accent"
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition-colors hover:text-ink"
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
                durationMs={FEEDBACK_DURATION_MS}
                onDismiss={() => clearFieldError("password")}
              />
            )}

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
                      rules.greaterThanEight ? "text-emerald-300" : "text-muted"
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
                    <span aria-hidden="true">{rules.hasNumber ? "✓" : "•"}</span>
                    <span>Incluir números</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 transition-colors ${
                      rules.hasSpecial ? "text-emerald-300" : "text-muted"
                    }`}
                  >
                    <span aria-hidden="true">{rules.hasSpecial ? "✓" : "•"}</span>
                    <span>Incluir carácter (Opcional)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium text-ink"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearFieldError("confirmPassword");
                }}
                placeholder="•••••••••"
                aria-invalid={Boolean(errors.confirmPassword)}
                className={`w-full rounded-xl border bg-app py-2.5 pl-3.5 pr-10 text-sm text-ink placeholder:text-muted/60 focus:outline-none transition-colors ${
                  errors.confirmPassword
                    ? "border-rose-400 focus:border-rose-400"
                    : "border-edge focus:border-accent"
                }`}
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? "Ocultar confirmación de contraseña"
                    : "Mostrar confirmación de contraseña"
                }
                aria-pressed={showConfirmPassword}
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

            {errors.confirmPassword && (
              <FieldFeedback
                key={`confirm-${errorTick}`}
                message={errors.confirmPassword}
                durationMs={FEEDBACK_DURATION_MS}
                onDismiss={() => clearFieldError("confirmPassword")}
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

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creando cuenta..." : "Crear Cuenta"}
          </button>
        </form>

        <div className="pt-1 border-t border-edge/80 text-center text-xs text-muted">
          <p>
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent hover:underline"
            >
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>

      {verificationEmail && (
        <TokenModal
          email={verificationEmail}
          initialLockedUntil={lockedUntil}
          onSuccess={() => {
            setLockedUntil(null);
            setVerificationEmail(null);
            router.push("/dashboard");
            router.refresh();
          }}
          onCancel={() => {
            setLockedUntil(null);
            setVerificationEmail(null);
          }}
        />
      )}
    </div>
  );
}