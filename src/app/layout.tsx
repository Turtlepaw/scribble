import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/nav/navbar";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { ProfileProvider } from "@/lib/useProfile";
import { Toaster } from "sonner";
import { BoardsProvider } from "@/lib/hooks/useBoards";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Scribbleboard",
  description: "Simple scrapboard client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <ProfileProvider>
              <BoardsProvider>
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-1 py-6">{children}</main>
                </div>
              </BoardsProvider>
            </ProfileProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
