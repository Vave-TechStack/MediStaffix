import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MediStaffix — Connecting Healthcare Talent with Hospitals",
    template: "%s · MediStaffix",
  },
  description:
    "MediStaffix is an integrated healthcare staffing platform combining CRM, recruitment, HRM, payroll, doctor deployment, hospital operations and analytics in one workspace.",
  applicationName: "MediStaffix",
  authors: [{ name: "MediStaffix" }],
  keywords: ["healthcare staffing", "hospital staffing", "recruitment", "payroll", "deployment", "HRM", "CRM"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#123047",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('msx-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-app antialiased">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
