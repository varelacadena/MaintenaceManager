import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.firstTimeSetup) {
          toast({
            title: "Welcome!",
            description: `Admin account created successfully. Welcome, ${username}!`,
            duration: 5000,
          });
        }
        const returnUrl = sessionStorage.getItem("returnUrl");
        sessionStorage.removeItem("returnUrl");
        window.location.href = returnUrl || "/";
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || "Invalid username or password. Please check your credentials and try again.";

        setError(errorMessage);
        toast({
          title: "Authentication Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
        // Clear password field on failed login
        setPassword("");
      }
    } catch (error) {
      const errorMessage = "Unable to connect to the server. Please try again.";
      setError(errorMessage);
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'url(/hartland-building.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-card/95 border-0 shadow-2xl">
        <CardHeader className="space-y-3 pb-8 pt-8">
          <CardTitle className="text-3xl font-bold text-center tracking-tight text-foreground">
            Hartland Maintenance
          </CardTitle>
          <CardDescription className="text-center text-base font-medium text-foreground/80">
            Sign in to access your workspace
          </CardDescription>
          {error && error.includes("first") && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-sm text-blue-800 dark:text-blue-300">
              <strong>First Time Setup:</strong> Enter your desired admin username and password to create the initial account.
            </div>
          )}
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-foreground">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                required
                disabled={isLoading}
                data-testid="input-username"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                disabled={isLoading}
                data-testid="input-password"
                className="h-11"
              />
              {error && (
                <p className="text-sm text-red-500 font-medium mt-2">{error}</p>
              )}
            </div>
            <Button type="submit" size="lg" className="w-full mt-6" disabled={isLoading} data-testid="button-login">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center mt-3 flex flex-col gap-1.5">
              <a
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-forgot-password"
              >
                Forgot your password?
              </a>
              <a
                href="/request-access"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-request-access"
              >
                Request access
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}