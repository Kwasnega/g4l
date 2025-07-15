"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Menu, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showBackButton?: boolean;
  backHref?: string;
}

export function AdminHeader({ 
  title, 
  subtitle, 
  icon, 
  showBackButton = true, 
  backHref = "/admin" 
}: AdminHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.replace('/admin/login');
    }
  };

  const AdminMobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Admin Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-xs bg-gray-900 border-gray-700">
        <SheetHeader>
          <VisuallyHidden>
            <SheetTitle>Admin Navigation Menu</SheetTitle>
          </VisuallyHidden>
        </SheetHeader>
        <nav className="flex flex-col gap-6 text-lg font-medium mt-8">
          <SheetClose asChild>
            <Link href="/admin" className="flex items-center gap-3 text-blue-400 hover:text-blue-300 transition-colors">
              <Home className="h-5 w-5" />
              Dashboard
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/admin/products" className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
              Products
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/admin/orders" className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
              Orders
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/admin/gallery" className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
              Gallery
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/admin/settings" className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
              Settings
            </Link>
          </SheetClose>
          <div className="border-t border-gray-700 pt-4 mt-4">
            <SheetClose asChild>
              <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-gray-300 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Store
              </Link>
            </SheetClose>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 mt-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 pb-4 border-b border-blue-700/30 space-y-4 sm:space-y-0">
      {/* Mobile Layout: G4L logo on far left, menu on far right */}
      <div className="md:hidden flex items-center justify-between w-full">
        <Link href="/" className="font-headline text-2xl font-bold tracking-wider text-blue-400">
          G4L
        </Link>
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button asChild variant="ghost" size="icon">
              <Link href={backHref}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <AdminMobileNav />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-headline text-3xl font-bold tracking-wider text-blue-400">
            G4L
          </Link>
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-blue-400">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button asChild variant="ghost" size="sm" className="text-gray-400 hover:text-blue-300 hover:bg-gray-800">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          )}
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Title (shown below the header) */}
      <div className="md:hidden flex items-center gap-3">
        {icon}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-blue-400">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
