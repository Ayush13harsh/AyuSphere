import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AyuSphere - Emergency Health System',
  description: 'Real-time emergency health alert system with SOS, hospital finder, and emergency contacts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="bg-glow"></div>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
