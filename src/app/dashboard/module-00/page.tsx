import Link from "next/link";
import { MODULES } from "@/lib/blueprint-modules";

const MODULE = MODULES.find((m) => m.slug === "module-00")!;

export const metadata = { title: `Module 00 — ${MODULE.title}` };

export default function ModuleZeroPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        &larr; All modules
      </Link>

      <header className="mt-4">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Module {MODULE.number}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {MODULE.title}
        </h1>
        <p className="mt-3 text-neutral-600">{MODULE.summary}</p>
      </header>

      <article className="prose prose-neutral mt-10 max-w-none">
        <h2>What this module covers</h2>
        <p>
          Placeholder. The full module content will be converted from the
          source document during Day 3 of the build.
        </p>

        <h2>Tools</h2>
        <ul>
          <li>Tool 00A — 7-Day Quick Start Checklist (interactive)</li>
          <li>Tool 00B — Family Sharing Letter (printable PDF)</li>
        </ul>
      </article>

      <footer className="mt-12 flex items-center justify-between border-t border-neutral-200 pt-6 text-sm">
        <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-900">
          &larr; Back to all modules
        </Link>
        <Link
          href="/dashboard/module-01"
          className="font-medium text-neutral-900 hover:underline"
        >
          Module 01: Starting Point Assessment &rarr;
        </Link>
      </footer>
    </main>
  );
}
