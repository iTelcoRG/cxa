"use client";
import { useActionState } from "react";
import { authenticate } from "../app/admin/login/actions.ts";

export function AdminLoginForm() {
  const [error, action, pending] = useActionState(authenticate, "");
  return (
    <form action={action} className="admin-login-form">
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <button className="admin-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
