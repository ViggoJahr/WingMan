import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Training Hub",
  description: "Personal training data hub",
};

// Browser chrome cannot read CSS variables, so these are the sRGB equivalents
// of --background in each mode. Keep them in step with globals.css.
export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090e07" },
    { media: "(prefers-color-scheme: light)", color: "#f7faf5" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required: next-themes sets the theme class
    // on <html> in a pre-hydration script, so the server markup won't match.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
