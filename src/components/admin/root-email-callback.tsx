"use client";

import { useEffect } from "react";
import { rootEmailCallbackTarget } from "@/lib/auth/account";

export function RootEmailCallback() {
  useEffect(() => {
    const target = rootEmailCallbackTarget(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );
    if (target) window.location.replace(target);
  }, []);
  return null;
}
