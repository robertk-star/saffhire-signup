import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // If already logged in, redirect to admin dashboard
  useEffect(() => {
    if (user && !loading) {
      setLocation("/admin");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/manus-storage/SaffhireLogoShirtStyle_6539361a.webp"
            alt="SaffHire"
            className="h-12 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to manage credentialing submissions
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Sign in with your SaffHire account to access the admin dashboard.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="w-full"
            >
              <a href={getLoginUrl()}>
                Sign in with SaffHire
              </a>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-card text-muted-foreground">
                  Secure Login
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Only authorized administrators can access this portal.
              If you don't have access, contact your system administrator.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            © 2026 SaffHire Background Screening. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
