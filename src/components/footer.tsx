'use client';

import Link from "next/link";
import { Github, Twitter, Instagram } from "lucide-react";
import { Button } from "./ui/button";
import { useLanding } from "@/hooks/use-landing";

export function Footer() {
  const { showLanding } = useLanding();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            © {new Date().getFullYear()} GREATNESS4L. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Button variant="link" className="text-muted-foreground text-xs" onClick={showLanding}>Replay Intro</Button>
            <Link href="#" aria-label="Twitter">
              <Twitter className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
            </Link>
            <Link href="https://www.instagram.com/greatness4l" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Instagram className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
            </Link>
            <Link href="#" aria-label="GitHub">
              <Github className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
