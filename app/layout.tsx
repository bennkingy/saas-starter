import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { getUser, getTeamForUser } from "@/lib/db/queries";
import { SWRConfig } from "swr";
import {
  getPublicSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/config/site";

export const metadata: Metadata = {
  metadataBase: getPublicSiteUrl() ? new URL(getPublicSiteUrl()!) : undefined,
  title: {
    default: `${SITE_NAME} - Never miss a Jellycat drop again!`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  keywords: [
    "Jellycat",
    "Jellycat alerts",
    "Jellycat new arrivals",
    "Jellycat stock alerts",
    "Jellycat restock alerts",
    "new stock alerts",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userFallback = null;
  let teamFallback = null;

  try {
    userFallback = await getUser();
    teamFallback = await getTeamForUser();
  } catch (error) {
    // During build time or if database is unavailable, these will be null
    // Components will fetch from API routes at runtime
  }

  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50" suppressHydrationWarning>
        <SWRConfig
          value={{
            fallback: {
              "/api/user": userFallback,
              "/api/team": teamFallback,
            },
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
