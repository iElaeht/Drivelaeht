import type { Metadata } from "next";
import "./globals.css";
import { ScrollActivity } from "@/components/shared/ScrollActivity";

export const metadata: Metadata = {
  title: "Drivelaeht",
  description: "Almacenamiento privado y defensivo en la nube",
};

const themeInitScript = `
  (function () {
    try {
      var valid = ['light', 'dark', 'capuccino', 'rose-pine', 'catppuccin'];
      var saved = localStorage.getItem('drivelaeht-theme');
      var theme = valid.indexOf(saved) !== -1 ? saved : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.toggle('dark', theme !== 'light');
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-app text-ink antialiased transition-colors duration-200">
        <ScrollActivity />
        {children}
      </body>
    </html>
  );
}