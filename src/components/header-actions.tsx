
"use client";

import Link from 'next/link';
import { Button } from './ui/button';
import { ShoppingBag, Heart, User, LogOut, Loader2, PackageSearch, Menu, LayoutDashboard } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { AuthDialog } from './auth-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet"
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/use-admin';


export function HeaderActions() {
    const { cartCount } = useCart();
    const { wishlistCount } = useWishlist();
    const { user, isLoading, isFirebaseConfigured } = useAuth();
    const { isAdmin } = useAdmin();
    const [authDialogOpen, setAuthDialogOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
            router.push('/');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Logout Failed', description: 'Could not log you out. Please try again.' });
        }
    };

    const handleLoginClick = () => {
      if (isFirebaseConfigured) {
        setAuthDialogOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Authentication Not Configured',
          description: 'Firebase credentials must be set in the .env file to enable login.',
        });
      }
    };

    const renderAuthButton = () => {
      if (isLoading) {
        return (
          <Button variant="ghost" size="icon" disabled>
            <Loader2 className="h-5 w-5 animate-spin" />
          </Button>
        );
      }
      
      if (user) {
        return (
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="My Account">
                      <User className="h-5 w-5" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <span className="truncate text-sm text-muted-foreground">{user.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push('/account/orders')}>
                      <PackageSearch className="mr-2 h-4 w-4" />
                      <span>My Orders</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onSelect={() => router.push('/admin')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      return (
        <Button variant="ghost" size="icon" onClick={handleLoginClick} aria-label="Login or Sign up">
          <User className="h-5 w-5" />
        </Button>
      );
    }
    
    const MobileNav = () => (
      <Sheet>
        <SheetTrigger asChild>
           <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Navigation Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full max-w-xs">
          <nav className="flex flex-col gap-6 text-lg font-medium mt-8">
            <SheetClose asChild>
              <Link href="/" className="transition-colors hover:text-foreground/80">Home</Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/products" className="font-semibold transition-colors hover:text-foreground/80">Shop</Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/gallery" className="transition-colors hover:text-foreground/80">Gallery</Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/contact" className="transition-colors hover:text-foreground/80">Contact</Link>
            </SheetClose>
          </nav>
        </SheetContent>
      </Sheet>
    );

    return (
        <>
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                  <Link href="/" className="transition-colors hover:text-foreground/80">Home</Link>
                  <Link href="/products" className="font-semibold transition-colors hover:text-foreground/80">Shop</Link>
                  <Link href="/gallery" className="transition-colors hover:text-foreground/80">Gallery</Link>
                  <Link href="/contact" className="transition-colors hover:text-foreground/80">Contact</Link>
              </nav>
              <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild className="relative">
                  <Link href="/wishlist" aria-label="Wishlist">
                      <Heart className="h-5 w-5" />
                      {wishlistCount > 0 && (
                          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-xs">
                              {wishlistCount}
                          </Badge>
                      )}
                  </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild className="relative" data-cart-icon>
                  <Link href="/cart" aria-label="Shopping Bag">
                      <ShoppingBag className="h-5 w-5" />
                      {cartCount > 0 && (
                          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 rounded-full text-xs">
                              {cartCount}
                          </Badge>
                      )}
                  </Link>
                  </Button>
                  
                  {renderAuthButton()}

                  <ThemeToggle />
                  <MobileNav />
              </div>
            </div>
            <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
        </>
    )
}
