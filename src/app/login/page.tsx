import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход — Джарвис" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-8 text-center text-3xl font-semibold">Джарвис</h1>
        <LoginForm />
      </div>
    </main>
  );
}
