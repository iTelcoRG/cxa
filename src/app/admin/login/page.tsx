import type { Metadata } from "next";
import { AdminLoginForm } from "../../../components/admin-login-form.tsx";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};
export default async function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p className="admin-kicker">CUSTOM X APPAREL</p>
        <h1>Staff sign in</h1>
        <p>Authorized CXA staff only.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
