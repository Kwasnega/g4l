
import Link from 'next/link';
import { HeaderActions } from './header-actions';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
           <div className="md:hidden">
              <HeaderActions />
           </div>
           <Link href="/" className="font-headline text-2xl md:text-3xl font-bold tracking-wider">
             G4L
           </Link>
        </div>
        <div className="hidden md:block">
            <HeaderActions />
        </div>
      </div>
    </header>
  );
}
