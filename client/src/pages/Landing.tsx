
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotUsernameEmail, setForgotUsernameEmail] = useState("");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isForgotUsernameOpen, setIsForgotUsernameOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isForgotUsernameLoading, setIsForgotUsernameLoading] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
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
        window.location.href = "/";
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

  const handleForgotUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotUsernameLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotUsernameEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Username sent",
          description: "If an account exists with this email, the username has been sent to your email address.",
        });
        setIsForgotUsernameOpen(false);
        setForgotUsernameEmail("");
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send username",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsForgotUsernameLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotPasswordLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Reset email sent",
          description: "If an account exists with this email, a password reset link has been sent to your email address.",
        });
        setIsForgotPasswordOpen(false);
        setForgotPasswordEmail("");
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send reset email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Maintenance Portal
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access the maintenance management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                disabled={isLoading}
                data-testid="input-password"
              />
              {error && (
                <p className="text-sm text-red-500 font-medium">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="flex justify-between text-sm mt-4">
              <Dialog open={isForgotUsernameOpen} onOpenChange={setIsForgotUsernameOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-sm" data-testid="button-forgot-username">
                    Forgot Username?
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-forgot-username">
                  <DialogHeader>
                    <DialogTitle>Recover Username</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send your username to you.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotUsername} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-username-email">Email Address</Label>
                      <Input
                        id="forgot-username-email"
                        type="email"
                        value={forgotUsernameEmail}
                        onChange={(e) => setForgotUsernameEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        data-testid="input-forgot-username-email"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsForgotUsernameOpen(false)}
                        data-testid="button-cancel-forgot-username"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isForgotUsernameLoading}
                        data-testid="button-submit-forgot-username"
                      >
                        {isForgotUsernameLoading ? "Sending..." : "Send Username"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-sm" data-testid="button-forgot-password">
                    Forgot Password?
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-forgot-password">
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-password-email">Email Address</Label>
                      <Input
                        id="forgot-password-email"
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        data-testid="input-forgot-password-email"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsForgotPasswordOpen(false)}
                        data-testid="button-cancel-forgot-password"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isForgotPasswordLoading}
                        data-testid="button-submit-forgot-password"
                      >
                        {isForgotPasswordLoading ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
