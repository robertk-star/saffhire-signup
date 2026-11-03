import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
        <div className="text-center mb-8">
          <img
            src="https://saffhire.com/images/saffhire-logo.png"
            alt="SaffHire"
            className="h-12 w-auto object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to manage credentialing submissions
          </p>
        </div>

        <form
          className="bg-card border border-border rounded-lg p-8 shadow-sm space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            try {
              const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
              });
              const body = await response.json().catch(() => ({}));
              if (!response.ok) {
                setError(typeof body.error === "string" ? body.error : "Email or password is incorrect.");
                return;
              }
              window.location.href = "/admin";
            } catch {
              setError("Could not reach the server.");
            } finally {
              setPending(false);
            }
          }}
        >
          <div>
            <Label htmlFor="admin-email" className="mb-2 block">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="admin-password" className="mb-2 block">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Only the configured administrator can access this portal.
          </p>
        </form>
      </div>
    </div>
  );
}
