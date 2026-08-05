import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "mat-time.example.com";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  let origin = "https://mat-time.example.com";

  try {
    origin = new URL(`${protocol}://${host}`).origin;
  } catch {
    // The fallback only affects link previews when a host header is malformed.
  }

  return {
    title: "Mat Time | Jiu-Jitsu Training Tracker",
    description: "A private, simple log for Brazilian Jiu-Jitsu training hours.",
    openGraph: {
      title: "Mat Time",
      description: "Small sessions add up.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1728, height: 912, alt: "Mat Time — Small sessions add up." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Mat Time",
      description: "Small sessions add up.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
