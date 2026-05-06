import Link from "next/link";
import { sendPasswordReset } from "./actions";

export const metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; email?: string; from?: string }>;
}) {
  const { sent, email: prefillEmail, from } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {from === "activate"
          ? "It looks like you already have an account but the password did not match. We will send a reset link to your email."
          : "Enter your email and we will send you a link to set a new password."}
      </p>

      {sent ? (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          If an account exists with that email, the reset link is on its way.
          The link is good for one use.
        </div>
      ) : (
        <form action={sendPasswordReset} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input
              type="email"
              name="email"
              defaultValue={prefillEmail ?? ""}
              required
              autoComplete="email"
              className="rounded-md border border-neutral-300 px-3 py-2 text-base"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Send reset link
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/login" className="underline hover:text-neutral-900">
          Back to log in
        </Link>
      </p>
    </main>
  );
}
