import { useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { goBack } from "@/lib/navigation";

/** Leave the current page for the one the user was just on. */
export function useGoBack() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  return useCallback(() => {
    goBack(setLocation, location, user?.role);
  }, [location, setLocation, user?.role]);
}
