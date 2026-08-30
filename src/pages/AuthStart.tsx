// src/pages/AuthStart.tsx
// LEGACY COMPATIBILITY ROUTE
// The old intermediate "Compte" screen is retired. Any historical/internal route
// that still points here is redirected immediately to the unified AccountStart portal.
import React from "react";

type Props = {
  go: (t: any, p?: any) => void;
};

export default function AuthStart({ go }: Props) {
  React.useEffect(() => {
    go("account_start");
  }, [go]);

  return null;
}
