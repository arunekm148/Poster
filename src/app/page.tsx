"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-2xl shadow-lg text-center">

        <h1 className="text-4xl font-bold text-gray-900">
          Agent Platform
        </h1>

        <p className="mt-4 text-gray-600">
          Insurance Agent Management Platform
        </p>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-8 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
        >
          Login
        </button>

      </div>
    </main>
  );
}