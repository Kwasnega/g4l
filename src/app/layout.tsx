import type {Metadata} from 'next';
import './globals.css';
import {ThemeProvider} from '@/components/theme-provider';
import {Header} from '@/components/header';
import {Footer} from '@/components/footer';
import {Toaster} from '@/components/ui/toaster';
import {BackToTopButton} from '@/components/back-to-top-button';
import {AiAssistant} from '@/components/ai-assistant';
import { cn } from '@/lib/utils';
import { CartProvider } from '@/hooks/use-cart';
import { WishlistProvider } from '@/hooks/use-wishlist';
import { AuthProvider } from '@/hooks/use-auth';
import { LandingScreen } from '@/components/landing-screen';
import { LandingProvider } from '@/hooks/use-landing';

export const metadata: Metadata = {
  title: 'G4L Streetwear | Your Brand Slogan Here',
  description: 'Ghana-made luxury streetwear by GREATNESS4L.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Explicit Favicon Link - ADD THIS LINE */}
        <link rel="icon" href="/favicon.ico" sizes="any" /> 
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased", process.env.NODE_ENV === "development" ? "debug-screens" : undefined)}>
        <LandingProvider>
          <LandingScreen />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <WishlistProvider>
                <CartProvider>
                  <div className="flex min-h-screen flex-col">
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                  </div>
                  <BackToTopButton />
                  <AiAssistant />
                  <Toaster />
                </CartProvider>
              </WishlistProvider>
            </AuthProvider>
          </ThemeProvider>
        </LandingProvider>
      </body>
    </html>
  );
}
