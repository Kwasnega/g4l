"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ref, get, set, onValue, off } from 'firebase/database'; // Import onValue, off
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Settings, Store, ShoppingBag, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AdminHeader } from '@/components/admin-header';

// Define interface for settings data
interface AppSettings {
  isStoreOpen: boolean;
  lastUpdated?: string;
  updatedBy?: string;
}

export default function AdminSettingsPage() {
  const { user, loading: authLoading, isAuthenticated, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [settings, setSettings] = useState<AppSettings>({
    isStoreOpen: true,
    lastUpdated: '',
    updatedBy: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);

  // Authentication and Authorization Logic (standard)
  useEffect(() => {
    if (!authLoading && isFirebaseConfigured) {
      if (!isAuthenticated) {
        console.log("AdminSettingsPage: Not authenticated, redirecting to /admin/login");
        router.replace('/admin/login');
        setCheckingAuth(false);
      } else {
        const checkAdminStatus = async () => {
          if (!db || !user?.uid) {
            console.error("AdminSettingsPage: Firebase DB or user UID not available for admin check.");
            setIsAdmin(false);
            router.replace('/');
            setCheckingAuth(false);
            return;
          }

          try {
            const adminUsersRef = ref(db, 'adminUsers');
            const snapshot = await get(adminUsersRef);

            if (snapshot.exists()) {
              const adminUids: Record<string, boolean> = snapshot.val();
              if (user.uid in adminUids && adminUids[user.uid] === true) {
                setIsAdmin(true);
                console.log("AdminSettingsPage: User is authorized admin.");
              } else {
                setIsAdmin(false);
                console.log("AdminSettingsPage: User UID not found in adminUsers or not authorized, redirecting to /");
                router.replace('/');
              }
            } else {
              console.log("AdminSettingsPage: 'adminUsers' node does not exist in Firebase. No admins configured.");
              setIsAdmin(false);
              router.replace('/');
            }
          } catch (error) {
            console.error("AdminSettingsPage: Error checking admin status from Firebase:", error);
            setIsAdmin(false);
            router.replace('/');
          } finally {
            setCheckingAuth(false);
          }
        };

        checkAdminStatus();
      }
    } else if (!isFirebaseConfigured && !authLoading) {
        console.error("AdminSettingsPage: Firebase is not configured. Admin access disabled.");
        router.replace('/');
        setCheckingAuth(false);
    }
  }, [authLoading, isAuthenticated, user, isFirebaseConfigured, router]);

  // Fetch and Listen for Real-time Settings
  useEffect(() => {
    let unsubscribeSettings: (() => void) | undefined;

    if (isAdmin && isFirebaseConfigured && db) {
      setFetchingSettings(true);
      // Use a separate path that won't interfere with products
      const settingsRef = ref(db, 'admin/storeSettings');
      console.log("Debug - Attempting to read from:", 'admin/storeSettings');
      console.log("Debug - Current user for settings read:", user?.uid);
      console.log("Debug - Is admin:", isAdmin);

      unsubscribeSettings = onValue(settingsRef, (snapshot) => {
        const fetchedSettings = snapshot.val();
        if (snapshot.exists() && fetchedSettings) {
          setSettings({
            isStoreOpen: typeof fetchedSettings.isStoreOpen === 'boolean' ? fetchedSettings.isStoreOpen : true,
            lastUpdated: fetchedSettings.lastUpdated || '',
            updatedBy: fetchedSettings.updatedBy || '',
          });
          console.log("AdminSettingsPage: Store settings loaded:", fetchedSettings);
        } else {
          // Initialize default settings if node doesn't exist
          console.log("AdminSettingsPage: No store settings found, initializing defaults.");
          setSettings({
            isStoreOpen: true,
            lastUpdated: '',
            updatedBy: '',
          });
        }
        setFetchingSettings(false);
      }, (error) => {
        console.error("AdminSettingsPage: Error fetching settings:", error);
        console.error("Debug - Error details:", error.code, error.message);
        console.error("Debug - User UID during error:", user?.uid);
        console.error("Debug - Is admin during error:", isAdmin);
        toast({
          title: "Settings Permission Error",
          description: `${error.message}. Please check Firebase rules and admin access.`,
          variant: "destructive",
        });
        setFetchingSettings(false);
      });

      // Cleanup function
      return () => {
        if (unsubscribeSettings) {
          off(settingsRef, 'value', unsubscribeSettings);
        }
      };
    } else if (!isAdmin && !checkingAuth && !authLoading) {
        setFetchingSettings(false);
    }
  }, [isAdmin, isFirebaseConfigured, db, checkingAuth, authLoading, toast]);

  const handleStoreToggle = async (checked: boolean) => {
    setIsSaving(true);
    console.log("Debug - User:", user);
    console.log("Debug - User UID:", user?.uid);
    console.log("Debug - Is Authenticated:", isAuthenticated);
    console.log("Debug - Database available:", !!db);

    try {
      if (!db || !user?.uid) {
        console.error("Debug - Missing requirements:", { db: !!db, userUid: user?.uid });
        throw new Error("Firebase database or user not available.");
      }

      const updatedSettings = {
        ...settings,
        isStoreOpen: checked,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.uid,
      };

      // Use a separate path that won't interfere with products
      const settingsRef = ref(db, 'admin/storeSettings');
      await set(settingsRef, updatedSettings);

      setSettings(updatedSettings);

      toast({
        title: checked ? "Store Opened" : "Store Closed",
        description: checked
          ? "Your G4L store is now open for customers!"
          : "Your G4L store is now closed. Customers cannot place orders.",
      });
    } catch (error: any) {
      console.error("Error updating store status:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update store status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Render loading state for initial auth/admin check
  if (authLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-xl">Verifying Admin Access to Settings...</p>
      </div>
    );
  }

  // Show debug info if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-red-400 mb-6">Admin Access Required</h1>
          <div className="bg-gray-900 p-6 rounded-lg border border-red-700/30">
            <h2 className="text-xl text-white mb-4">Debug Information:</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-blue-300">User:</span> {user?.email || 'Not logged in'}</p>
              <p><span className="text-blue-300">User UID:</span> {user?.uid || 'No UID'}</p>
              <p><span className="text-blue-300">Is Authenticated:</span> {isAuthenticated ? 'Yes' : 'No'}</p>
              <p><span className="text-blue-300">Is Admin:</span> {isAdmin ? 'Yes' : 'No'}</p>
              <p><span className="text-blue-300">Firebase Configured:</span> {isFirebaseConfigured ? 'Yes' : 'No'}</p>
            </div>
            <div className="mt-6">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/admin/login">Go to Admin Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <AdminHeader
          title="Store Control"
          subtitle="Manage your G4L store availability"
          icon={<Store className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-500" />}
        />

        {/* Store Status Card */}
        <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl mb-6">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Status Display */}
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${settings.isStoreOpen ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {settings.isStoreOpen ? (
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    Store is {settings.isStoreOpen ? 'Open' : 'Closed'}
                  </h2>
                  <p className="text-gray-400">
                    {settings.isStoreOpen
                      ? 'Customers can browse and place orders'
                      : 'Store is temporarily unavailable to customers'
                    }
                  </p>
                  {settings.lastUpdated && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {new Date(settings.lastUpdated).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex flex-col items-center gap-3">
                <Badge
                  variant={settings.isStoreOpen ? "default" : "destructive"}
                  className={`px-4 py-2 text-sm font-medium ${
                    settings.isStoreOpen
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {settings.isStoreOpen ? 'OPEN' : 'CLOSED'}
                </Badge>
                <Switch
                  checked={settings.isStoreOpen}
                  onCheckedChange={handleStoreToggle}
                  disabled={isSaving}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600 scale-125"
                />
                {isSaving && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Updating...</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Impact Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border border-green-700/30 shadow-lg shadow-green-500/10 rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-green-400 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                When Store is Open
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <ShoppingBag className="h-4 w-4 text-green-400" />
                <span className="text-sm">Customers can browse all products</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Users className="h-4 w-4 text-green-400" />
                <span className="text-sm">Orders can be placed and processed</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm">Full shopping experience available</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border border-red-700/30 shadow-lg shadow-red-500/10 rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-red-400 flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                When Store is Closed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm">Customers see "Store Temporarily Closed"</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm">No orders can be placed</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Users className="h-4 w-4 text-red-400" />
                <span className="text-sm">Products remain visible but not purchasable</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
