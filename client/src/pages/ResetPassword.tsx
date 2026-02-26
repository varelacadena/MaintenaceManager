import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: "url(/hartland-building.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-card/95 border-0 shadow-2xl">
          <CardHeader className="space-y-3 pb-6 pt-8">
            <CardTitle className="text-2xl font-bold text-center tracking-tight text-foreground">
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              This password reset link is invalid or missing a token.
            </p>
            <Link href="/forgot-password">
              <Button className="w-full" data-testid="button-request-new-link">
                Request a New Link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url(/hartland-building.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <Card className="w-full max-w-md relative z-10 backdrop-blur-xl bg-card/95 border-0 shadow-2xl">
        <CardHeader className="space-y-3 pb-6 pt-8">
          <CardTitle className="text-2xl font-bold text-center tracking-tight text-foreground">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center text-sm text-foreground/80">
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {success ? (
            <div className="space-y-5">
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md text-sm text-green-800 dark:text-green-300">
                Your password has been reset successfully. You can now sign in with your new password.
              </div>
              <Link href="/login">
                <Button className="w-full" data-testid="button-go-to-login">
                  Go to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-semibold text-foreground">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  required
                  disabled={isLoading}
                  data-testid="input-new-password"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-semibold text-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  required
                  disabled={isLoading}
                  data-testid="input-confirm-password"
                  className="h-11"
                />
                {error && (
                  <p className="text-sm text-red-500 font-medium mt-1">{error}</p>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={isLoading || !newPassword || !confirmPassword}
                data-testid="button-reset-password"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
              <Link href="/forgot-password">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  data-testid="button-request-new-link"
                >
                  Request a New Link
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
