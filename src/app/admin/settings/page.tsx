"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ref, get, set, onValue, off } from 'firebase/database'; // Import onValue, off
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Settings, ArrowLeft, Mail, Store, Instagram, Facebook, Twitter } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch'; // For the store status toggle

// Define interface for settings data
interface AppSettings {
  contactEmail: string;
  isStoreOpen: boolean;
  instagramLink?: string;
  facebookLink?: string;
  twitterLink?: string;
}

export default function AdminSettingsPage() {
  const { user, loading: authLoading, isAuthenticated, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [settings, setSettings] = useState<AppSettings>({
    contactEmail: '',
    isStoreOpen: true,
    instagramLink: '',
    facebookLink: '',
    twitterLink: '',
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
      const settingsRef = ref(db, 'settings/general');

      unsubscribeSettings = onValue(settingsRef, (snapshot) => {
        const fetchedSettings = snapshot.val();
        if (snapshot.exists() && fetchedSettings) {
          setSettings({
            contactEmail: fetchedSettings.contactEmail || '',
            isStoreOpen: typeof fetchedSettings.isStoreOpen === 'boolean' ? fetchedSettings.isStoreOpen : true, // Default to true
            instagramLink: fetchedSettings.instagramLink || '',
            facebookLink: fetchedSettings.facebookLink || '',
            twitterLink: fetchedSettings.twitterLink || '',
          });
          console.log("AdminSettingsPage: Settings loaded:", fetchedSettings);
        } else {
          // Initialize default settings if node doesn't exist
          console.log("AdminSettingsPage: No settings found, initializing defaults.");
          setSettings({
            contactEmail: 'support@g4l.com',
            isStoreOpen: true,
            instagramLink: 'https://instagram.com/greatness4l',
            facebookLink: 'https://facebook.com/greatness4l',
            twitterLink: 'https://twitter.com/greatness4l',
          });
          // Optionally, save defaults to DB immediately
          // set(settingsRef, settings);
        }
        setFetchingSettings(false);
      }, (error) => {
        console.error("AdminSettingsPage: Error fetching settings:", error);
        toast({
          title: "Error",
          description: "Failed to load settings. Please try again.",
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!db) {
        throw new Error("Firebase database not initialized.");
      }
      const settingsRef = ref(db, 'settings/general');
      await set(settingsRef, settings); // Overwrites existing settings

      toast({
        title: "Settings Saved",
        description: "Your system settings have been updated.",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save settings. Please try again.",
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

  // If not an admin, return null (redirection handled by useEffect)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-800 text-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-blue-700/30">
          <h1 className="text-4xl font-bold tracking-tight text-blue-400 flex items-center">
            <Settings className="h-10 w-10 mr-3 text-cyan-500 animate-pulse" />
            System Settings
          </h1>
          <Button asChild variant="ghost" className="text-gray-400 hover:text-blue-300 hover:bg-gray-800 transition-colors duration-200">
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card className="bg-gray-900 border border-blue-700/30 shadow-lg shadow-blue-500/20 rounded-xl">
          <CardHeader className="border-b border-blue-700/20 pb-4">
            <CardTitle className="text-xl text-blue-400">General Store Settings</CardTitle>
            <CardDescription className="text-gray-400">Configure global settings for your G4L store.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveSettings} className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="contactEmail" className="text-blue-300 flex items-center">
                  <Mail className="h-4 w-4 mr-2" /> Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="e.g., support@yourstore.com"
                  required
                  className="bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between space-x-4 p-4 bg-gray-800 rounded-lg border border-blue-700/20">
                <div className="grid gap-1">
                  <Label htmlFor="isStoreOpen" className="text-blue-300 flex items-center">
                    <Store className="h-4 w-4 mr-2" /> Store Status
                  </Label>
                  <CardDescription className="text-gray-400">Toggle to open or close your online store.</CardDescription>
                </div>
                <Switch
                  id="isStoreOpen"
                  checked={settings.isStoreOpen}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, isStoreOpen: checked }))}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-blue-300">Social Media Links</Label>
                <div className="grid gap-4">
                  <div className="flex items-center space-x-2">
                    <Instagram className="h-5 w-5 text-purple-400" />
                    <Input
                      type="url"
                      value={settings.instagramLink}
                      onChange={(e) => setSettings(prev => ({ ...prev, instagramLink: e.target.value }))}
                      placeholder="Instagram Profile URL"
                      className="flex-1 bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Facebook className="h-5 w-5 text-blue-400" />
                    <Input
                      type="url"
                      value={settings.facebookLink}
                      onChange={(e) => setSettings(prev => ({ ...prev, facebookLink: e.target.value }))}
                      placeholder="Facebook Page URL"
                      className="flex-1 bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Twitter className="h-5 w-5 text-sky-400" />
                    <Input
                      type="url"
                      value={settings.twitterLink}
                      onChange={(e) => setSettings(prev => ({ ...prev, twitterLink: e.target.value }))}
                      placeholder="Twitter Profile URL"
                      className="flex-1 bg-gray-800 border border-blue-600/50 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-3 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out
                           flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving Settings...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
