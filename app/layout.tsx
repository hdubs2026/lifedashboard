import type { Metadata } from 'next';
import { DM_Mono, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Evergreen Dashboard',
  description: 'Personal OS for Hunter Warren',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`}>
      <body style={{ backgroundColor: '#0a0a0a', color: '#ffffff', fontFamily: 'var(--font-geist), sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
