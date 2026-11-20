import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { BottomUp } from "@/components/shared/BottomUp";

export const metadata: Metadata = {
  title: "DriveElaeht | Oficial Web",
};

const HERO_HIGHLIGHTS = [
  {
    label: "Aislamiento por cuenta",
    value: "Directorio físico + UUID",
    icon: (
      <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    ),
  },
  {
    label: "Protección de acceso",
    value: "2FA 6 dígitos + HttpOnly",
    icon: (
      <svg className="h-4 w-4 text-accent-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Control multidispositivo",
    value: "Sesiones activas 14 días",
    icon: (
      <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="14" height="10" x="2" y="4" rx="2" />
        <path d="M12 14v4M8 18h8" />
        <rect width="6" height="10" x="16" y="10" rx="1.5" />
      </svg>
    ),
  },
];

const SYSTEM_PILLARS = [
  {
    title: "Almacenamiento aislado",
    tag: "FS + PostgreSQL",
    description:
      "Cada cuenta cuenta con su propio directorio físico en servidor, nombres con prefijo UUID, control de cuota en tiempo real y papelera recuperable.",
    details: ["Rutas aisladas por usuario", "Metadatos indexados en PostgreSQL"],
    icon: (
      <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14a9 3 0 0 0 18 0V5" />
        <path d="M3 12a9 3 0 0 0 18 0" />
      </svg>
    ),
  },
  {
    title: "Seguridad y sesiones",
    tag: "2FA + HttpOnly",
    description:
      "Activación por código de 6 dígitos, cookies seguras de 14 días y auditoría de dispositivos conectados con revocación individual desde /settings.",
    details: ["Verificación de sesión en servidor", "Cierre remoto de dispositivos"],
    icon: (
      <svg className="h-5 w-5 text-accent-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="18" height="11" x="3" y="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: "Portapapeles y contactos",
    tag: "Sync privado",
    description:
      "Guarda fragmentos de texto, comandos o notas entre tus dispositivos y administra tu libreta de contactos para compartir archivos con control.",
    details: ["Historial rápido por cuenta", "Directorio privado de contactos"],
    icon: (
      <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="8" height="4" x="8" y="2" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    title: "Enlaces compartidos",
    tag: "Tokens /share",
    description:
      "Genera enlaces públicos puntuales con token único y revócalos en cualquier momento sin exponer la estructura interna de tus carpetas privadas.",
    details: ["Tokens únicos por recurso", "Revocación instantánea"],
    icon: (
      <svg className="h-5 w-5 text-accent-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

const WORKSPACE_CAPABILITIES = [
  {
    title: "Explorador por vistas",
    description:
      "Alterna entre Todos tus archivos, Destacados para acceso inmediato y Papelera para restaurar o eliminar definitivamente.",
    icon: (
      <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    title: "Jerarquía de carpetas",
    description:
      "Crea subcarpetas anidadas, mueve elementos y descarga archivos individuales con validación estricta de propiedad.",
    icon: (
      <svg className="h-4 w-4 text-accent-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 10v6M9 13h6" />
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    ),
  },
  {
    title: "Medidor de almacenamiento",
    description:
      "Visualiza el espacio ocupado frente a tu límite asignado antes y después de cada carga de archivos.",
    icon: (
      <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    ),
  },
  {
    title: "Portapapeles entre equipos",
    description:
      "Copia y pega fragmentos desde tu PC o móvil sin depender de servicios externos ni chats personales.",
    icon: (
      <svg className="h-4 w-4 text-accent-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="14" height="14" x="8" y="8" rx="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    ),
  },
  {
    title: "Auditoría de sesiones",
    description:
      "Consulta navegador, sistema operativo y fecha de actividad de cada sesión iniciada y cierra accesos antiguos.",
    icon: (
      <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    title: "Paletas adaptables",
    description:
      "Cambia en cualquier momento entre Light, Dark, Capuccino, Rosé Pine y Catppuccin con persistencia automática.",
    icon: (
      <svg className="h-4 w-4 text-accent-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z" />
      </svg>
    ),
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Autenticación con doble factor",
    detail:
      "Accede desde la barra superior, crea tu cuenta o valida tu inicio de sesión con código 2FA de 6 dígitos y cookies HttpOnly.",
    icon: (
      <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" x2="3" y1="12" y2="12" />
      </svg>
    ),
  },
  {
    step: "02",
    title: "Organización en carpetas y archivos",
    detail:
      "Crea carpetas físicas, sube documentos, marca favoritos y gestiona eliminaciones seguras mediante la papelera integrada.",
    icon: (
      <svg className="h-4 w-4 text-accent-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Sincronización y control de sesiones",
    detail:
      "Comparte enlaces con token revocable, sincroniza notas en tu portapapeles y supervisa cada dispositivo conectado.",
    icon: (
      <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const FAQS = [
  {
    q: "¿Cómo se aíslan los archivos de cada usuario?",
    a: "El almacenamiento físico se separa por usuario en el servidor mediante resolución segura de rutas y nombres con UUID, respaldado por metadatos relacionales en PostgreSQL.",
  },
  {
    q: "¿Qué ocurre si elimino un archivo por error?",
    a: "Los elementos eliminados pasan primero a la Papelera de tu cuenta, donde puedes restaurarlos a su ubicación original o purgarlos definitivamente para liberar cuota.",
  },
  {
    q: "¿Puedo administrar las sesiones abiertas en otros equipos?",
    a: "Sí. Cada inicio de sesión genera un registro con expiración de 14 días y limpieza automática de sesiones vencidas, visible y revocable desde /settings.",
  },
  {
    q: "¿Los enlaces compartidos exponen el resto de mis carpetas?",
    a: "No. Cada enlace en /share apunta únicamente al recurso autorizado mediante un token individual que puedes desactivar cuando quieras.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-app text-ink flex flex-col justify-between transition-colors duration-200">
      <Navbar />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 my-12 sm:my-16 space-y-20 sm:space-y-24">
        <section className="space-y-8 animate-fade-in-up">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-accent-soft text-accent border border-accent/30">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span>Almacenamiento privado y defensivo</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.15]">
              Tu espacio personal en la nube, aislado por cuenta y controlado
              desde cualquier dispositivo.
            </h1>

            <p className="text-muted text-sm sm:text-base leading-relaxed max-w-2xl">
              Drivelaeht centraliza tus carpetas, archivos, portapapeles y
              contactos bajo verificación de sesión en servidor, doble factor de
              6 dígitos y almacenamiento físico aislado por usuario. Usa el
              acceso superior cuando estés listo para entrar a tu espacio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {HERO_HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3.5 rounded-2xl border border-edge bg-surface px-4 py-3.5 transition-colors hover:bg-surface-hover/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app border border-edge">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-muted truncate">
                    {item.label}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-ink truncate">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ScrollReveal>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted">
              <span className="uppercase tracking-wider">
                Módulos y arquitectura
              </span>
              <span>Next.js · PostgreSQL · 2FA</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SYSTEM_PILLARS.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-2xl border border-edge bg-surface p-5 sm:p-6 transition-colors hover:bg-surface-hover/60 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app border border-edge">
                          {pillar.icon}
                        </div>
                        <h2 className="text-sm sm:text-base font-semibold">
                          {pillar.title}
                        </h2>
                      </div>
                      <span className="shrink-0 rounded-md bg-accent-secondary-soft border border-accent-secondary/25 px-2 py-0.5 font-mono text-[11px] text-accent-secondary">
                        {pillar.tag}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm leading-relaxed text-muted">
                      {pillar.description}
                    </p>
                  </div>

                  <ul className="flex flex-wrap gap-2 pt-1 border-t border-edge/70">
                    {pillar.details.map((detail) => (
                      <li
                        key={detail}
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted"
                      >
                        <span className="h-1 w-1 rounded-full bg-accent" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delayMs={40}>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted">
              <span className="uppercase tracking-wider">
                Herramientas del espacio privado
              </span>
              <span>Control diario</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WORKSPACE_CAPABILITIES.map((cap) => (
                <article
                  key={cap.title}
                  className="rounded-2xl border border-edge bg-surface p-5 space-y-2.5 transition-colors hover:bg-surface-hover/60"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app border border-edge">
                      {cap.icon}
                    </div>
                    <h3 className="text-sm font-semibold">{cap.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-muted">
                    {cap.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delayMs={60}>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted">
              <span className="uppercase tracking-wider">
                Flujo de operación
              </span>
              <span>3 pasos clave</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {WORKFLOW_STEPS.map((item) => (
                <article
                  key={item.step}
                  className="rounded-2xl border border-edge bg-surface p-5 sm:p-6 space-y-3 transition-colors hover:bg-surface-hover/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-secondary-soft border border-accent-secondary/35 font-mono text-xs font-bold text-accent-secondary">
                      {item.step}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app border border-edge">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-muted">
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delayMs={80}>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted">
              <span className="uppercase tracking-wider">
                Preguntas frecuentes
              </span>
              <span>Seguridad y uso</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQS.map((faq) => (
                <article
                  key={faq.q}
                  className="rounded-2xl border border-edge bg-surface p-5 sm:p-6 space-y-2.5 transition-colors hover:bg-surface-hover/60"
                >
                  <div className="flex items-start gap-2.5">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                    <h3 className="text-sm sm:text-base font-semibold">
                      {faq.q}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-muted pl-6.5">
                    {faq.a}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </ScrollReveal>
      </main>

      <div className="px-4 sm:px-6 pb-8">
        <Footer />
      </div>

      <BottomUp />
    </div>
  );
}