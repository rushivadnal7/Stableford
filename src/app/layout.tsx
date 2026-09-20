import type { ReactNode } from 'react';

export const metadata = {
  title: 'Stableford',
  description: 'Golf scores, monthly prize draws and charity giving.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
