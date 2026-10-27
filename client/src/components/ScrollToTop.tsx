import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { fullLocation, getLastNavigationKind } from "@/lib/navigationHistory";
import { installScrollMemory, restoreScroll } from "@/lib/scrollMemory";

export function ScrollToTop() {
  const [location] = useLocation();
  const search = useSearch();
  const full = fullLocation(location, search);
  const kind = getLastNavigationKind();

  useEffect(() => {
    installScrollMemory();
    const mainContent = document.querySelector("main");
    if (!(mainContent instanceof HTMLElement)) {
      if (kind === "push") window.scrollTo(0, 0);
      return;
    }

    if (kind === "pop") return restoreScroll(full, mainContent);
    if (kind !== "push") return;

    mainContent.scrollTo(0, 0);
  }, [full, kind]);

  return null;
}
