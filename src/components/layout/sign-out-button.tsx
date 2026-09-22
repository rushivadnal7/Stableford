'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DASHBOARD } from '@/content/dashboard';
import { ROUTES } from '@/lib/routes';
import { browserClient } from '@/lib/supabase/browser';

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await browserClient().auth.signOut();
        location.href = ROUTES.home;
      }}
    >
      <LogOut className="size-4" aria-hidden />
      {DASHBOARD.signOut}
    </Button>
  );
}
