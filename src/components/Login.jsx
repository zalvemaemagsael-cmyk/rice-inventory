import React, { useState } from "react";
import { Wheat, Lock } from "lucide-react";
import { signIn } from "../lib/auth.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // onAuthStateChange in AuthGate picks up the new session from here.
    } catch (err) {
      setError(err.message || "Couldn't sign in. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rt-root" style={{ maxWidth: 380, marginTop: "10vh" }}>
      <div className="brand" style={{ justifyContent: "center", marginBottom: 24 }}>
        <Wheat size={22} strokeWidth={1.75} />
        <div>
          <div className="brand-title">Jessa's Rice Stock Ledger</div>
          <div className="brand-sub">Sign in to continue</div>
        </div>
      </div>

      <form className="form-card" onSubmit={submit}>
        <div className="form-row">
          <label>
            Email
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {error && (
          <div className="muted" style={{ color: "#B3261E" }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={submitting}>
          <Lock size={16} /> {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}