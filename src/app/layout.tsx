import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { getAuthSession } from '@/lib/auth';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'JobJet - B2B Lead Discovery & Intelligence',
  description: 'AI-powered B2B lead discovery, company intelligence, and automated outreach pipeline.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthSession();
  const user = session?.user;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
