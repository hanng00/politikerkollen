import { AuthProvider } from "@/components/providers/AuthProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://politikerkollen.se",
  ),
  title: {
    default: "Politikerkollen",
    template: "%s | Politikerkollen",
  },
  description:
    "Röstningar, anföranden och dokument från riksdagen. Strukturerat och sökbart.",
  keywords: ["riksdagen", "politiker", "röstningar", "anföranden", "motioner", "Sverige"],
  openGraph: {
    title: "Politikerkollen",
    description:
      "Röstningar, anföranden och dokument från riksdagen. Strukturerat och sökbart.",
    type: "website",
    siteName: "Politikerkollen",
    locale: "sv_SE",
  },
  twitter: {
    card: "summary",
    title: "Politikerkollen",
    description:
      "Röstningar, anföranden och dokument från riksdagen. Strukturerat och sökbart.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={cn(inter.variable, sourceSerif.variable)}>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "antialiased dark",
        )}
      >
        <PostHogProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
