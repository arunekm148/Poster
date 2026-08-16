"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type AgentUser = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  role?: string;
  logoUrl?: string | null;
  state?: string | null;
  district?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] =
    useState<AgentUser | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  /* PASSWORD */

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordSuccess,
    setPasswordSuccess,
  ] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* LOAD USER                                                              */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "agentUser"
        );

      if (!savedUser) {
        router.replace(
          "/login"
        );

        return;
      }

      const parsedUser:
        AgentUser =
        JSON.parse(
          savedUser
        );

      if (!parsedUser?.id) {
        localStorage.removeItem(
          "agentUser"
        );

        localStorage.removeItem(
          "userId"
        );

        router.replace(
          "/login"
        );

        return;
      }

      setUser(
        parsedUser
      );
    } catch (error) {
      console.error(
        "Unable to load profile:",
        error
      );

      localStorage.removeItem(
        "agentUser"
      );

      localStorage.removeItem(
        "userId"
      );

      router.replace(
        "/login"
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  /* ---------------------------------------------------------------------- */
  /* CHANGE PASSWORD                                                        */
  /* ---------------------------------------------------------------------- */

  async function changePassword() {
    if (!user?.id) {
      setPasswordSuccess(
        false
      );

      setPasswordMessage(
        "Login information not found. Please login again."
      );

      return;
    }

    if (
      newPassword.length <
      6
    ) {
      setPasswordSuccess(
        false
      );

      setPasswordMessage(
        "Password must contain at least 6 characters."
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordSuccess(
        false
      );

      setPasswordMessage(
        "New Password and Confirm Password do not match."
      );

      return;
    }

    try {
      setChangingPassword(
        true
      );

      setPasswordMessage(
        ""
      );

      setPasswordSuccess(
        false
      );

      const response =
        await fetch(
          "/api/profile/password",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId:
                  user.id,

                password:
                  newPassword,
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to change password."
        );
      }

      setPasswordSuccess(
        true
      );

      setPasswordMessage(
        data.message ||
          "Password changed successfully."
      );

      setNewPassword("");

      setConfirmPassword("");
    } catch (error) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        error
      );

      setPasswordSuccess(
        false
      );

      setPasswordMessage(
        error instanceof Error
          ? error.message
          : "Unable to change password."
      );
    } finally {
      setChangingPassword(
        false
      );
    }
  }

  /* ---------------------------------------------------------------------- */
  /* LOGOUT                                                                 */
  /* ---------------------------------------------------------------------- */

  function handleLogout() {
    localStorage.removeItem(
      "agentUser"
    );

    localStorage.removeItem(
      "userId"
    );

    localStorage.removeItem(
      "userName"
    );

    localStorage.removeItem(
      "userPhone"
    );

    localStorage.removeItem(
      "userEmail"
    );

    localStorage.removeItem(
      "userRole"
    );

    localStorage.removeItem(
      "userState"
    );

    localStorage.removeItem(
      "userDistrict"
    );

    localStorage.removeItem(
      "userLogoUrl"
    );

    router.replace(
      "/login"
    );
  }

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="mb-3 text-5xl">
            👤
          </div>

          <p className="font-semibold text-slate-700">
            Loading profile...
          </p>

        </div>

      </main>
    );
  }

  if (!user) {
    return null;
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">

        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">

          <div>

            <p className="text-sm text-blue-200">
              Agent Platform
            </p>

            <h1 className="text-2xl font-bold">
              My Profile
            </h1>

          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-4xl px-4 py-6">

        {/* PROFILE CARD */}

        <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-blue-900 p-6 text-white shadow-lg">

          <div className="flex items-center gap-4">

            {user.logoUrl ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-2">

                <img
                  src={
                    user.logoUrl
                  }
                  alt={
                    user.name ||
                    "Agent"
                  }
                  className="max-h-full max-w-full object-contain"
                />

              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl">
                👤
              </div>
            )}

            <div>

              <p className="text-sm text-blue-200">
                {user.role ===
                "ADMIN"
                  ? "Administrator"
                  : "Insurance Agent"}
              </p>

              <h2 className="text-2xl font-bold">
                {user.name ||
                  "Agent"}
              </h2>

              {user.phone && (
                <p className="mt-1 text-blue-100">
                  +91{" "}
                  {user.phone}
                </p>
              )}

            </div>

          </div>

        </div>

        {/* PERSONAL DETAILS */}

        <div className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">

          <div className="border-b px-5 py-4">

            <h2 className="text-lg font-bold text-slate-900">
              Personal Details
            </h2>

          </div>

          <div className="divide-y">

            <div className="p-5">

              <p className="text-xs text-gray-500">
                Full Name
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {user.name ||
                  "Not available"}
              </p>

            </div>

            <div className="p-5">

              <p className="text-xs text-gray-500">
                Mobile Number
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {user.phone
                  ? `+91 ${user.phone}`
                  : "Not available"}
              </p>

            </div>

            <div className="p-5">

              <p className="text-xs text-gray-500">
                Email Address
              </p>

              <p className="mt-1 break-all font-semibold text-slate-900">
                {user.email ||
                  "Not available"}
              </p>

            </div>

            <div className="p-5">

              <p className="text-xs text-gray-500">
                Role
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {user.role ||
                  "AGENT"}
              </p>

            </div>

            <div className="p-5">

              <p className="text-xs text-gray-500">
                District
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {user.district ||
                  "Not available"}
              </p>

            </div>

            <div className="p-5">

              <p className="text-xs text-gray-500">
                State
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {user.state ||
                  "Not available"}
              </p>

            </div>

          </div>

        </div>

        {/* -------------------------------------------------------------- */}
        {/* CHANGE PASSWORD                                                */}
        {/* -------------------------------------------------------------- */}

        <div className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
              🔐
            </div>

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Change Password
              </h2>

              <p className="text-xs text-slate-500">
                Enter your new password below.
              </p>

            </div>

          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {/* NEW PASSWORD */}

            <div>

              <label className="block text-sm font-bold text-slate-800">
                New Password
              </label>

              <input
                type="password"
                value={
                  newPassword
                }
                onChange={(
                  event
                ) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                minLength={6}
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              />

            </div>

            {/* CONFIRM PASSWORD */}

            <div>

              <label className="block text-sm font-bold text-slate-800">
                Confirm Password
              </label>

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(
                  event
                ) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                minLength={6}
                autoComplete="new-password"
                placeholder="Enter password again"
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              />

            </div>

          </div>

          {/* MESSAGE */}

          {passwordMessage && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
                passwordSuccess
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {passwordMessage}
            </div>
          )}

          <button
            type="button"
            disabled={
              changingPassword
            }
            onClick={() =>
              void changePassword()
            }
            className="mt-5 rounded-xl bg-blue-700 px-6 py-3 font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {changingPassword
              ? "Changing Password..."
              : "Change Password"}
          </button>

        </div>

        {/* ACCOUNT */}

        <div className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">

          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Account
          </h2>

          <div className="space-y-3">

            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-slate-50"
            >

              <div>

                <p className="font-semibold text-slate-900">
                  Dashboard
                </p>

                <p className="text-xs text-gray-500">
                  Return to agent dashboard
                </p>

              </div>

              <span>
                →
              </span>

            </Link>

            <Link
              href="/sub-agents"
              className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-slate-50"
            >

              <div>

                <p className="font-semibold text-slate-900">
                  Sub Agents
                </p>

                <p className="text-xs text-gray-500">
                  View and manage your sub agents
                </p>

              </div>

              <span>
                →
              </span>

            </Link>

            <Link
              href="/posters"
              className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-slate-50"
            >

              <div>

                <p className="font-semibold text-slate-900">
                  Marketing Posters
                </p>

                <p className="text-xs text-gray-500">
                  Open marketing centre
                </p>

              </div>

              <span>
                →
              </span>

            </Link>

          </div>

        </div>

        {/* LOGOUT */}

        <button
          type="button"
          onClick={
            handleLogout
          }
          className="mt-6 w-full rounded-xl bg-red-600 p-4 font-semibold text-white transition hover:bg-red-700"
        >
          Logout
        </button>

      </section>

      {/* MOBILE NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg md:hidden">

        <div className="grid h-16 grid-cols-4">

          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center text-gray-600"
          >
            <span className="text-lg">
              🏠
            </span>

            <span className="text-xs">
              Home
            </span>
          </Link>

          <Link
            href="/customers"
            className="flex flex-col items-center justify-center text-gray-600"
          >
            <span className="text-lg">
              👥
            </span>

            <span className="text-xs">
              Customers
            </span>
          </Link>

          <Link
            href="/posters"
            className="flex flex-col items-center justify-center text-gray-600"
          >
            <span className="text-lg">
              🎨
            </span>

            <span className="text-xs">
              Posters
            </span>
          </Link>

          <Link
            href="/profile"
            className="flex flex-col items-center justify-center text-blue-700"
          >
            <span className="text-lg">
              👤
            </span>

            <span className="text-xs">
              Profile
            </span>
          </Link>

        </div>

      </nav>

    </main>
  );
}