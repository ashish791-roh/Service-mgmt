import type { Metadata } from 'next';
import '../index.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: 'Service Management System',
  description: 'Service Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
