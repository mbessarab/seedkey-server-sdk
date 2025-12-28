import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SeedKey Next.js Example',
  description: 'Example of SeedKey authentication with Next.js App Router',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

