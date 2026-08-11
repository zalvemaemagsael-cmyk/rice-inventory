import React, { useEffect, useState } from "react";
import { isCloudConfigured, getSession, onAuthChange, signOut } from "./lib/auth.js";
import Login from "./components/Login.jsx";
import App from "./App.jsx";

// Wraps the whole app. If a cloud database is configured, this requires a
// signed-in Supabase user before showing anything else. If no cloud
// database is configured (local-only/testing mode), there's no server to
// check credentials against, so it skips straight to the app.
export default function AuthGate() {
  const [checked, setChecked] = useState(!isCloudConfigured);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!isCloudConfigured) return;
    let cancelled = false;
    getSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      setChecked(true);
    });
    const unsubscribe = onAuthChange((s) => setSession(s));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!checked) {
    return (
      <div className="rt-root">
        <div className="loading">Checking sign-in…</div>
      </div>
    );
  }

  if (isCloudConfigured && !session) {
    return <Login />;
  }

  return <App onLogout={isCloudConfigured ? signOut : null} />;
}
