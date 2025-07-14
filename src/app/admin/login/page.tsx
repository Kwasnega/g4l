"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase'; // Import db and isFirebaseConfigured
import { ref, get } from 'firebase/database'; // Import Firebase Realtime Database functions
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Lock, Mail } from 'lucide-react'; // Icons for visual appeal
import { useAuth } from '@/hooks/use-auth'; // To check if user is already logged in

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading, isAuthenticated } = useAuth(); // Get auth state

  // Effect to redirect if already authenticated and authorized
  useEffect(() => {
    if (!authLoading && isAuthenticated && isFirebaseConfigured) {
      const checkAdminStatus = async () => {
        if (!db || !user?.uid) {
          console.error("Login Page: Firebase DB or user UID not available for admin check.");
          router.replace('/'); // Redirect if essential data is missing
          return;
        }
        try {
          const adminUsersRef = ref(db, 'adminUsers');
          const snapshot = await get(adminUsersRef);
          if (snapshot.exists()) {
            const adminUids: Record<string, boolean> = snapshot.val();
            if (user.uid in adminUids && adminUids[user.uid] === true) {
              console.log("Login Page: Already logged in as admin, redirecting to /admin");
              router.replace('/admin'); // Redirect to dashboard if already admin
            } else {
              console.log("Login Page: Logged in but not admin, redirecting to /");
              router.replace('/'); // Redirect non-admin to homepage
            }
          } else {
            console.log("Login Page: 'adminUsers' node does not exist. Redirecting to /");
            router.replace('/');
          }
        } catch (error) {
          console.error("Login Page: Error checking admin status:", error);
          router.replace('/');
        }
      };
      checkAdminStatus();
    } else if (!authLoading && !isFirebaseConfigured) {
      console.error("Login Page: Firebase is not configured. Admin login disabled.");
      toast({
        title: "Configuration Error",
        description: "Firebase is not configured. Admin login is unavailable.",
        variant: "destructive",
      });
    }
  }, [authLoading, isAuthenticated, user, isFirebaseConfigured, router, toast]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isFirebaseConfigured || !auth || !db) {
      toast({
        title: "Firebase Error",
        description: "Firebase is not configured. Cannot perform login.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userUid = userCredential.user.uid;

      // Check if user's UID is in the adminUsers node
      const adminUsersRef = ref(db, 'adminUsers');
      const snapshot = await get(adminUsersRef);

      if (snapshot.exists()) {
        const adminUids: Record<string, boolean> = snapshot.val();
        if (userUid in adminUids && adminUids[userUid] === true) {
          toast({
            title: "Login Successful",
            description: "Welcome, Administrator!",
            variant: "success",
          });
          router.replace('/admin'); // Redirect to admin dashboard
        } else {
          // If authenticated but not an admin, sign them out and redirect
          auth.signOut();
          toast({
            title: "Access Denied",
            description: "You do not have administrative privileges.",
            variant: "destructive",
          });
          router.replace('/'); // Redirect to homepage
        }
      } else {
        // No adminUsers node found
        auth.signOut();
        toast({
          title: "Configuration Error",
          description: "Admin user configuration not found. Access denied.",
          variant: "destructive",
        });
        router.replace('/');
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      let errorMessage = "An unexpected error occurred during login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email format.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many login attempts. Please try again later.";
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show a loading spinner if auth status is still being checked on mount
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="ml-3 text-lg">Initializing Admin Portal...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-4">
      <Card className="w-full max-w-md mx-auto bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl overflow-hidden">
        <CardHeader className="text-center p-6 border-b border-blue-700/20">
          <ShieldCheck className="h-16 w-16 mx-auto text-blue-500 mb-2 animate-pulse" />
          <CardTitle className="text-3xl font-bold text-blue-400 tracking-wide">ADMIN ACCESS</CardTitle>
          <CardDescription className="text-gray-400 mt-2">
            Secure login to the G4L Command Center.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-blue-300 flex items-center text-lg">
                <Mail className="mr-2 h-5 w-5" /> Access ID (Email)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@g4l.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-blue-300 flex items-center text-lg">
                <Lock className="mr-2 h-5 w-5" /> Authorization Key (Password)
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>
            <Button
              type="submit"
              className="w-full py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out
                         flex items-center justify-center space-x-2
                         disabled:opacity-50 disabled:cursor-not-allowed
                         bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Initiate Protocol"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
