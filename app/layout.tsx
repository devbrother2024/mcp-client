import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { MCPProvider } from '@/contexts/mcp-context';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI 채팅 - MCP Client',
  description: 'AI 채팅 애플리케이션 with MCP Client',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        style={{
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        <MCPProvider>{children}</MCPProvider>
      </body>
    </html>
  );
}
