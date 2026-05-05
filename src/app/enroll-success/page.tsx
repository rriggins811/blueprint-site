import Link from "next/link";

export const metadata = { title: "Welcome aboard" };

export default async function EnrollSuccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">You are in.</h1>
      <p className="mt-3 text-base text-neutral-700">
        Your purchase is confirmed. We just sent a one-time login link to the
        email you used at checkout. Click it to set up your dashboard.
      </p>
      <p className="mt-3 text-sm text-neutral-500">
        Did not get the email in 5 minutes? Check spam, or request a fresh link
        below.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex justify-center rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Send a new login link
      </Link>
    </main>
  );
}
