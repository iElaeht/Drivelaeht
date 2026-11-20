import dns from "node:dns/promises";

const OFFICIAL_PROVIDERS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "proton.me",
] as const;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "yopmail.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "throwawaymail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "fakeinbox.com",
  "sharklasers.com",
  "maildrop.cc",
  "mohmal.com",
]);

const DNS_TIMEOUT_MS = 3000;

function levenshtein(a: string, b: string): number {
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

export function suggestOfficialEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) return null;

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  if (
    OFFICIAL_PROVIDERS.includes(domain as (typeof OFFICIAL_PROVIDERS)[number])
  ) {
    return null;
  }

  const prefixedProvider = OFFICIAL_PROVIDERS.find((provider) =>
    domain.startsWith(provider)
  );
  if (prefixedProvider) {
    return `${localPart}@${prefixedProvider}`;
  }

  let bestMatch: string | null = null;
  let bestScore = Infinity;

  for (const provider of OFFICIAL_PROVIDERS) {
    const maxAllowedDistance = provider.length >= 9 ? 2 : 1;
    const distance = levenshtein(domain, provider);
    if (distance <= maxAllowedDistance && distance < bestScore) {
      bestScore = distance;
      bestMatch = provider;
    }
  }

  return bestMatch ? `${localPart}@${bestMatch}` : null;
}

async function resolveMxWithTimeout(
  domain: string,
  timeoutMs = DNS_TIMEOUT_MS
): Promise<Awaited<ReturnType<typeof dns.resolveMx>>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("DNS MX timeout"));
    }, timeoutMs);

    dns
      .resolveMx(domain)
      .then((records) => {
        clearTimeout(timer);
        resolve(records);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export interface EmailDomainValidationResult {
  valid: boolean;
  reason?: string;
  suggestedEmail?: string;
}

export async function validateEmailDomain(
  email: string
): Promise<EmailDomainValidationResult> {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return { valid: false, reason: "Correo electrónico no válido." };
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  if (/\s/.test(localPart) || /\s/.test(domain)) {
    return { valid: false, reason: "Correo electrónico no válido." };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Usa un correo habitual para poder enviarte el código de verificación.",
    };
  }

  const suggestedEmail = suggestOfficialEmail(normalized);
  if (suggestedEmail) {
    return {
      valid: false,
      reason: `¿Quisiste decir ${suggestedEmail}?`,
      suggestedEmail,
    };
  }

  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return {
      valid: false,
      reason: "El dominio del correo electrónico no es válido.",
    };
  }

  try {
    const mxRecords = await resolveMxWithTimeout(domain);
    const hasValidMx =
      Array.isArray(mxRecords) &&
      mxRecords.some((record) => Boolean(record.exchange?.trim()));

    if (!hasValidMx) {
      return {
        valid: false,
        reason: "Este correo no puede recibir mensajes. Revisa que esté bien escrito.",
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      reason: "No pudimos verificar este correo. Revisa que esté bien escrito.",
    };
  }
}