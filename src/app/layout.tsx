import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomadwealth.app",
  ),
  title: {
    default: "NomadWealth",
    template: "%s · NomadWealth",
  },
  description: "Self-hosted net-worth & investment cockpit.",
  applicationName: "NomadWealth",
  // Private app pages are noindex by default; marketing routes opt back in.
  robots: { index: false, follow: false },
  // Icons resolved from src/app/icon.png, src/app/apple-icon.png and
  // public/favicon.ico via the App Router file conventions.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. Default
            is dark; the `.light` class is added only when the user opted in. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-base text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
