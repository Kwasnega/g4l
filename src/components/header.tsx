
import Link from 'next/link';
import { HeaderActions } from './header-actions';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Mobile Layout: Logo on far left, actions on far right */}
        <div className="md:hidden flex items-center justify-between w-full">
          <Link href="/" className="font-headline text-2xl font-bold tracking-wider">
            G4L
          </Link>
          <HeaderActions />
        </div>

        {/* Desktop Layout: Logo on left, actions on right */}
        <div className="hidden md:flex items-center justify-between w-full">
          <Link href="/" className="font-headline text-3xl font-bold tracking-wider">
            G4L
          </Link>
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
