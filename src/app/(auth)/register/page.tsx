import { redirect } from "next/navigation";

/**
 * Sign-up is Google-only now — there is no email/password registration. This
 * route is kept so old links to /register don't 404; it forwards to /login,
 * where the single "Tiếp tục với Google" button both signs in AND creates the
 * account on first use.
 */
export default function RegisterPage() {
  redirect("/login");
}
