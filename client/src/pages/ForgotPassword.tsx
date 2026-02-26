import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
            Forgot Password
          </CardTitle>
          <CardDescription className="text-center text-sm text-foreground/80">
            Enter your username and we'll send a recovery link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {submitted ? (
            <div className="space-y-5">
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md text-sm text-green-800 dark:text-green-300">
                If an account with that username exists and has an email address on file, a recovery link has been sent. Please check your inbox.
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-foreground">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
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
                {error && (
                  <p className="text-sm text-red-500 font-medium mt-1">{error}</p>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={isLoading || !username.trim()}
                data-testid="button-send-reset"
              >
                {isLoading ? "Sending..." : "Send Recovery Email"}
              </Button>
              <Link href="/login">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  data-testid="button-back-to-login"
                >
                  Back to Sign In
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
