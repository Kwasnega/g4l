
"use client";

import { useState, type FC } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Terminal, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '@/lib/utils';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: 'login' | 'signup' | 'reset';
}

const authSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

type AuthFormValues = z.infer<typeof authSchema>;

const resetSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email.' }),
});

type ResetFormValues = z.infer<typeof resetSchema>;

// Standalone AuthForm Component
const AuthFormComponent: FC<{
  form: UseFormReturn<AuthFormValues>;
  onSubmit: (values: AuthFormValues) => void;
  isSubmitting: boolean;
  showPassword: boolean;
  onShowPasswordChange: () => void;
  isLogin: boolean;
  onForgotPassword: () => void;
}> = ({ form, onSubmit, isSubmitting, showPassword, onShowPasswordChange, isLogin, onForgotPassword }) => {
  const { formState: { isValid } } = form;
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...field}
                    className="pr-10"
                  />
                  <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={onShowPasswordChange}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isLogin && (
            <div className="text-sm text-right">
                <Button type="button" variant="link" onClick={onForgotPassword} className="p-0 h-auto font-normal">
                    Forgot Password?
                </Button>
            </div>
        )}
        <Button
          type="submit"
          className={cn("w-full", !isValid && "hover:animate-shake")}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLogin ? 'Log In' : 'Create Account'}
        </Button>
      </form>
    </Form>
  );
};

// Standalone PasswordResetForm Component
const PasswordResetFormComponent: FC<{
  form: UseFormReturn<ResetFormValues>;
  onSubmit: (values: ResetFormValues) => void;
  isSubmitting: boolean;
  onBackToLogin: () => void;
}> = ({ form, onSubmit, isSubmitting, onBackToLogin }) => (
  <>
    <DialogHeader className="items-center text-center">
      <div className="font-headline text-5xl mb-2">G4L</div>
      <DialogTitle>Reset Your Password</DialogTitle>
      <DialogDescription>
        Enter your account's email address and we will send you a link to reset your password.
      </DialogDescription>
    </DialogHeader>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 pt-2">
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto"
            onClick={onBackToLogin}
          >
            Back to Login
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </div>
      </form>
    </Form>
  </>
);


export function AuthDialog({ open, onOpenChange, initialView = 'login' }: AuthDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<'login' | 'signup' | 'reset'>(initialView);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
        email: '',
    },
  });

  const handleAuth = async (values: AuthFormValues, isLogin: boolean) => {
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth!, values.email, values.password);
        toast({ title: 'Login Successful', description: 'Welcome back!' });
      } else {
        await createUserWithEmailAndPassword(
          auth!,
          values.email,
          values.password
        );
        toast({
          title: 'Account Created',
          description: "You're now logged in.",
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description:
          error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password'
            ? 'Invalid email or password.'
            : error.code === 'auth/email-already-in-use'
            ? 'This email is already registered.'
            : 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (values: ResetFormValues) => {
    setIsSubmitting(true);
    try {
        await sendPasswordResetEmail(auth!, values.email);
        toast({
            title: 'Reset Link Sent',
            description: 'Please check your email for a link to reset your password.',
        });
        setView('login');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Reset Failed',
            description: error.code === 'auth/user-not-found' ? 'No user found with this email.' : 'An error occurred. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDialogStateChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
        resetForm.reset();
        setShowPassword(false);
        setTimeout(() => setView(initialView), 200);
    }
    onOpenChange(isOpen);
  }

  if (!isFirebaseConfigured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Authentication Not Configured</DialogTitle>
            <DialogDescription>
              This feature is disabled until the app is connected to Firebase.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              <p>Firebase credentials are not set in the <code>.env</code> file.</p>
              <p className="mt-2">Please add your project credentials to enable authentication.</p>
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogStateChange}>
      <DialogContent className="sm:max-w-[425px]">
        {view === 'reset' ? (
          <PasswordResetFormComponent
            form={resetForm}
            onSubmit={handlePasswordReset}
            isSubmitting={isSubmitting}
            onBackToLogin={() => setView('login')}
          />
        ) : (
            <Tabs value={view} onValueChange={(v) => setView(v as 'login' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <DialogHeader className="mb-4 items-center text-center">
                    <div className="font-headline text-5xl mb-2">G4L</div>
                    <DialogTitle>Welcome Back</DialogTitle>
                    <DialogDescription>
                        Enter your credentials to access your account.
                    </DialogDescription>
                </DialogHeader>
                <AuthFormComponent
                  form={form}
                  onSubmit={(values) => handleAuth(values, true)}
                  isSubmitting={isSubmitting}
                  showPassword={showPassword}
                  onShowPasswordChange={() => setShowPassword(prev => !prev)}
                  isLogin={true}
                  onForgotPassword={() => setView('reset')}
                />
            </TabsContent>
            <TabsContent value="signup">
                <DialogHeader className="mb-4 items-center text-center">
                    <div className="font-headline text-5xl mb-2">G4L</div>
                    <DialogTitle>Create an Account</DialogTitle>
                    <DialogDescription>
                        It's quick and easy to get started.
                    </DialogDescription>
                </DialogHeader>
                <AuthFormComponent
                  form={form}
                  onSubmit={(values) => handleAuth(values, false)}
                  isSubmitting={isSubmitting}
                  showPassword={showPassword}
                  onShowPasswordChange={() => setShowPassword(prev => !prev)}
                  isLogin={false}
                  onForgotPassword={() => {}}
                />
            </TabsContent>
            </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

    