"use client";

import {
  KeyboardEvent,
  useState,
} from "react";

type LoginUser = {
  id?: string;
  userId?: string;
  staffId?: string | null;

  name?: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;

  role?: string;
  accountType?: string;

  staffCode?: string;
  designation?: string | null;
  department?: string | null;

  supervisorId?: string | null;

  state?: string | null;
  district?: string | null;

  logoUrl?: string | null;

  agent?: {
    id?: string;
    name?: string;
    logoUrl?: string | null;
  } | null;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  accountType?: string;
  user?: LoginUser;
};

export default function LoginPage() {
  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  /* ---------------------------------------------------------------------- */
  /* LOGIN                                                                  */
  /* ---------------------------------------------------------------------- */

  async function handleLogin() {
    if (loading) {
      return;
    }

    setMessage("");
    setSuccess(false);

    const cleanPhone =
      phone
        .replace(/\D/g, "")
        .slice(-10);

    /* -------------------------------------------------------------------- */
    /* VALIDATE MOBILE                                                      */
    /* -------------------------------------------------------------------- */

    if (
      !/^[6-9]\d{9}$/.test(
        cleanPhone
      )
    ) {
      setMessage(
        "Please enter a valid 10 digit mobile number."
      );

      return;
    }

    /* -------------------------------------------------------------------- */
    /* VALIDATE PASSWORD                                                    */
    /* -------------------------------------------------------------------- */

    if (!password) {
      setMessage(
        "Please enter your password."
      );

      return;
    }

    try {
      setLoading(true);

      /* ------------------------------------------------------------------ */
      /* LOGIN REQUEST                                                      */
      /* ------------------------------------------------------------------ */

      const response =
        await fetch(
          "/api/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            cache:
              "no-store",

            body:
              JSON.stringify({
                phone:
                  cleanPhone,

                password,
              }),
          }
        );

      let data:
        LoginResponse = {};

      try {
        data =
          await response.json();
      } catch {
        setMessage(
          "Server response could not be read."
        );

        return;
      }

      console.log(
        "LOGIN RESPONSE:",
        response.status,
        data
      );

      /* ------------------------------------------------------------------ */
      /* LOGIN FAILED                                                       */
      /* ------------------------------------------------------------------ */

      if (
        !response.ok ||
        !data.success
      ) {
        setMessage(
          data.message ||
            "Invalid mobile number or password."
        );

        return;
      }

      /* ------------------------------------------------------------------ */
      /* CHECK USER DATA                                                    */
      /* ------------------------------------------------------------------ */

      const loginUser =
        data.user;

      if (
        !loginUser?.id
      ) {
        setMessage(
          "Login information was not received from server."
        );

        return;
      }

      const accountType =
        String(
          loginUser.accountType ||
            data.accountType ||
            "USER"
        ).toUpperCase();

      const role =
        String(
          loginUser.role ||
            ""
        ).toUpperCase();

      /* ------------------------------------------------------------------ */
      /* IMPORTANT                                                          */
      /* ------------------------------------------------------------------ */
      /*
       *
       * AGENT / ADMIN
       *
       * id     = User ID
       * userId = User ID
       *
       *
       * STAFF / SUPERVISOR
       *
       * id      = Staff ID
       * staffId = Staff ID
       * userId  = Owning Agent User ID
       *
       */

      const ownerUserId =
        String(
          loginUser.userId ||
            (
              accountType ===
              "USER"
                ? loginUser.id
                : ""
            )
        ).trim();

      if (!ownerUserId) {
        setMessage(
          "Business account information is missing."
        );

        return;
      }

      /* ------------------------------------------------------------------ */
      /* CLEAR PREVIOUS LOGIN                                               */
      /* ------------------------------------------------------------------ */

      localStorage.clear();

      /* ------------------------------------------------------------------ */
      /* SAVE COMMON LOGIN INFORMATION                                      */
      /* ------------------------------------------------------------------ */

      localStorage.setItem(
        "agentUser",
        JSON.stringify(
          loginUser
        )
      );

      /*
       * Keep "user" also because some existing pages
       * may read this localStorage key.
       */

      localStorage.setItem(
        "user",
        JSON.stringify(
          loginUser
        )
      );

      /*
       * CRITICAL:
       *
       * For Staff this is the owning Agent ID.
       * Existing Customers / Policies / Renewals
       * use this userId.
       */

      localStorage.setItem(
        "userId",
        ownerUserId
      );

      localStorage.setItem(
        "loginId",
        String(
          loginUser.id
        )
      );

      localStorage.setItem(
        "accountType",
        accountType
      );

      localStorage.setItem(
        "userName",
        String(
          loginUser.name ||
            ""
        )
      );

      localStorage.setItem(
        "userPhone",
        String(
          loginUser.phone ||
            ""
        )
      );

      localStorage.setItem(
        "userEmail",
        String(
          loginUser.email ||
            ""
        )
      );

      localStorage.setItem(
        "userRole",
        role
      );

      localStorage.setItem(
        "userState",
        String(
          loginUser.state ||
            ""
        )
      );

      localStorage.setItem(
        "userDistrict",
        String(
          loginUser.district ||
            ""
        )
      );

      localStorage.setItem(
        "userLogoUrl",
        String(
          loginUser.logoUrl ||
            ""
        )
      );

      /* ------------------------------------------------------------------ */
      /* STAFF INFORMATION                                                  */
      /* ------------------------------------------------------------------ */

      if (
        accountType ===
        "STAFF"
      ) {
        const staffId =
          String(
            loginUser.staffId ||
              loginUser.id ||
              ""
          ).trim();

        if (!staffId) {
          localStorage.clear();

          setMessage(
            "Staff information is missing."
          );

          return;
        }

        localStorage.setItem(
          "staffId",
          staffId
        );

        localStorage.setItem(
          "staffCode",
          String(
            loginUser.staffCode ||
              ""
          )
        );

        localStorage.setItem(
          "staffRole",
          role
        );

        localStorage.setItem(
          "staffDesignation",
          String(
            loginUser.designation ||
              ""
          )
        );

        localStorage.setItem(
          "staffDepartment",
          String(
            loginUser.department ||
              ""
          )
        );

        localStorage.setItem(
          "supervisorId",
          String(
            loginUser.supervisorId ||
              ""
          )
        );

        if (
          loginUser.agent
        ) {
          localStorage.setItem(
            "agentInfo",
            JSON.stringify(
              loginUser.agent
            )
          );
        }
      }

      /* ------------------------------------------------------------------ */
      /* VERIFY LOGIN SAVED                                                  */
      /* ------------------------------------------------------------------ */

      const savedUser =
        localStorage.getItem(
          "agentUser"
        );

      const savedUserId =
        localStorage.getItem(
          "userId"
        );

      if (
        !savedUser ||
        !savedUserId
      ) {
        localStorage.clear();

        setMessage(
          "Unable to save login information on this device."
        );

        return;
      }

      /* ------------------------------------------------------------------ */
      /* SUCCESS                                                            */
      /* ------------------------------------------------------------------ */

      setSuccess(true);

      /* ------------------------------------------------------------------ */
      /* REDIRECT                                                           */
      /* ------------------------------------------------------------------ */

      if (
        accountType ===
        "STAFF" ||
        role ===
        "STAFF" ||
        role ===
        "SUPERVISOR"
      ) {
        setMessage(
          role ===
            "SUPERVISOR"
            ? "Supervisor login successful. Opening staff dashboard..."
            : "Staff login successful. Opening staff dashboard..."
        );

        window.location.href =
          "/staff/dashboard";

        return;
      }

      if (
        role ===
        "ADMIN"
      ) {
        setMessage(
          "Admin login successful. Opening admin dashboard..."
        );

        window.location.href =
          "/admin";

        return;
      }

      /* ------------------------------------------------------------------ */
      /* AGENT                                                              */
      /* ------------------------------------------------------------------ */

      setMessage(
        "Login successful. Opening dashboard..."
      );

      window.location.href =
        "/dashboard";
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      setMessage(
        "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* ENTER KEY                                                              */
  /* ---------------------------------------------------------------------- */

  function handleKeyDown(
    event:
      KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key ===
      "Enter"
    ) {
      event.preventDefault();

      void handleLogin();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-8">

      {/* BACKGROUND */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="absolute left-[8%] top-[10%] text-7xl opacity-10">
          🛡️
        </div>

        <div className="absolute right-[10%] top-[20%] text-6xl opacity-10">
          ❤️
        </div>

        <div className="absolute bottom-[15%] left-[15%] text-6xl opacity-10">
          👨‍👩‍👧‍👦
        </div>

      </div>

      {/* LOGIN CONTAINER */}

      <div className="relative z-10 w-full max-w-md">

        {/* HEADER */}

        <div className="mb-7 text-center text-white">

          <div className="mb-3 text-5xl">
            🛡️
          </div>

          <h1 className="text-4xl font-black">
            Agent Platform
          </h1>

          <p className="mt-2 text-blue-200">
            Insurance Business.
            Simplified.
          </p>

        </div>

        {/* CARD */}

        <div className="rounded-3xl bg-white p-7 shadow-2xl sm:p-8">

          <h2 className="text-center text-2xl font-black text-slate-900">
            Welcome Back
          </h2>

          <p className="mb-2 mt-1 text-center text-gray-500">
            Login to your account
          </p>

          <p className="mb-7 text-center text-xs font-bold text-blue-700">
            Agent • Admin • Staff • Supervisor
          </p>

          {/* MOBILE */}

          <div>

            <label
              htmlFor="phone"
              className="mb-2 block font-semibold text-gray-700"
            >
              Mobile Number
            </label>

            <div className="flex">

              <span className="flex items-center rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 px-4 font-bold text-slate-900">
                +91
              </span>

              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                value={phone}
                disabled={loading}
                onKeyDown={
                  handleKeyDown
                }
                onChange={(
                  event
                ) => {
                  setPhone(
                    event.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(
                        0,
                        10
                      )
                  );
                }}
                placeholder="Enter mobile number"
                className="w-full rounded-r-xl border border-gray-300 bg-white p-3.5 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              />

            </div>

          </div>

          {/* PASSWORD */}

          <div className="mt-5">

            <label
              htmlFor="password"
              className="mb-2 block font-semibold text-gray-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={loading}
              onKeyDown={
                handleKeyDown
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
            />

          </div>

          {/* MESSAGE */}

          {message && (
            <div
              className={`mt-5 rounded-xl border p-3 text-center text-sm font-semibold ${
                success
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* LOGIN BUTTON */}

          <button
            type="button"
            disabled={loading}
            onClick={() =>
              void handleLogin()
            }
            className="mt-6 w-full rounded-xl bg-slate-900 p-3.5 font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

          {/* DIVIDER */}

          <div className="my-6 flex items-center">

            <div className="flex-1 border-t border-gray-200" />

            <span className="px-3 text-sm text-gray-400">
              NEW AGENT?
            </span>

            <div className="flex-1 border-t border-gray-200" />

          </div>

          {/* REGISTER */}

          <a
            href="/register"
            className="block w-full rounded-xl border-2 border-slate-900 bg-white p-3 text-center font-bold text-slate-900"
          >
            Self Registration
          </a>

          <p className="mt-6 text-center text-xs text-gray-400">
            Secure Insurance Agent & Team Management Platform
          </p>

        </div>

      </div>

    </main>
  );
}