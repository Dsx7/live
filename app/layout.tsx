import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'StreamVault — 29K+ Live TV Channels',
  description: 'Watch 29,000+ live TV channels. Sports, News, Entertainment, Movies and more — all in one place.',
  keywords: 'live tv, streaming, sports, news, entertainment, online tv',
  themeColor: '#0a0e1a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
