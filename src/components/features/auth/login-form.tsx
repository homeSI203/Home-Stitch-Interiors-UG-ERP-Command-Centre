"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/services/auth.service";
import { FirebaseError } from "firebase/app";
import { useAuthStore } from "@/store";
import {
  loadLastRememberedEmail,
  loadRememberedEmails,
  rememberLoginEmail,
  removeRememberedEmail,
} from "@/lib/remembered-emails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Mail, Lock, Sparkles, X, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { COMPANY } from "@/lib/navigation";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const OTHER_EMAIL = "__other__";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [useOtherEmail, setUseOtherEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const emailValue = watch("email");
  const { ref: passwordRegisterRef, ...passwordRegister } = register("password");

  useEffect(() => {
    const emails = loadRememberedEmails();
    const last = loadLastRememberedEmail();
    setSavedEmails(emails);
    if (last) {
      setValue("email", last);
      setUseOtherEmail(false);
      window.setTimeout(() => passwordRef.current?.focus(), 50);
    } else {
      setUseOtherEmail(true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const profile = await signIn(data.email, data.password);
      rememberLoginEmail(data.email);
      setSavedEmails(loadRememberedEmails());
      setSession(profile, profile.effectivePermissions);
      router.push("/dashboard");
    } catch (err) {
      let friendly = "Failed to sign in. Please try again.";
      if (err instanceof FirebaseError) {
        if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
          friendly = "Invalid email or password.";
        } else if (err.code === "auth/user-not-found") {
          friendly = "No account found with this email.";
        } else if (err.code === "auth/too-many-requests") {
          friendly = "Too many attempts. Please wait and try again.";
        } else {
          friendly = err.message;
        }
      } else if (err instanceof Error) {
        friendly = err.message.includes("permission")
          ? "Firestore access denied. Publish security rules in Firebase Console, then try again."
          : err.message;
      }
      setError(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const selectEmail = (value: string) => {
    if (value === OTHER_EMAIL) {
      setUseOtherEmail(true);
      setValue("email", "");
      return;
    }
    setUseOtherEmail(false);
    setValue("email", value, { shouldValidate: true });
    window.setTimeout(() => passwordRef.current?.focus(), 30);
  };

  const forgetEmail = (email: string) => {
    removeRememberedEmail(email);
    const next = loadRememberedEmails();
    setSavedEmails(next);
    if (emailValue === email) {
      if (next[0]) {
        setValue("email", next[0]);
        setUseOtherEmail(false);
      } else {
        setValue("email", "");
        setUseOtherEmail(true);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="flex flex-col items-center mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-gold shadow-premium mb-4">
          <Sparkles className="h-7 w-7 text-brand-green" />
        </div>
        <h1 className="font-display text-2xl font-bold text-brand-green">
          {COMPANY.shortName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{COMPANY.tagline}</p>
      </div>

      <Card className="border-0 shadow-premium">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Choose your email, then enter your password
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {savedEmails.length > 0 && !useOtherEmail ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      id="email"
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={emailValue}
                      onChange={(e) => selectEmail(e.target.value)}
                    >
                      {savedEmails.map((email) => (
                        <option key={email} value={email}>
                          {email}
                        </option>
                      ))}
                      <option value={OTHER_EMAIL}>Use a different email…</option>
                    </select>
                  </div>
                  {emailValue && savedEmails.includes(emailValue) && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => forgetEmail(emailValue)}
                    >
                      <X className="h-3 w-3" />
                      Forget this email on this device
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="you@company.com"
                      className="pl-10"
                      {...register("email")}
                    />
                  </div>
                  {savedEmails.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-brand-brown hover:underline"
                      onClick={() => {
                        setUseOtherEmail(false);
                        setValue("email", savedEmails[0] || "");
                        window.setTimeout(() => passwordRef.current?.focus(), 30);
                      }}
                    >
                      Choose a saved email instead
                    </button>
                  )}
                </div>
              )}
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-brand-brown hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...passwordRegister}
                  ref={(el) => {
                    passwordRegisterRef(el);
                    passwordRef.current = el;
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-brand-brown font-medium hover:underline"
              >
                Create account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
