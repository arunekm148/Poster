"use client";

import {
  useEffect,
  useState,
} from "react";

type Step =
  | "PHONE"
  | "OTP"
  | "RESET"
  | "SUCCESS";

type ApiResponse = {
  success?: boolean;
  message?: string;
  maskedEmail?: string;
  resetToken?: string;
};

export default function ForgotPasswordPage() {
  const [step, setStep] =
    useState<Step>(
      "PHONE"
    );

  const [phone, setPhone] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    maskedEmail,
    setMaskedEmail,
  ] =
    useState("");

  const [
    resetToken,
    setResetToken,
  ] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    resendSeconds,
    setResendSeconds,
  ] =
    useState(0);

  /* ---------------------------------------------------------------------- */
  /* RESEND COUNTDOWN                                                       */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (
      resendSeconds <= 0
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setResendSeconds(
            (current) =>
              current > 0
                ? current - 1
                : 0
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [resendSeconds]);

  /* ---------------------------------------------------------------------- */
  /* CLEAN PHONE                                                            */
  /* ---------------------------------------------------------------------- */

  function cleanPhone() {
    return phone
      .replace(
        /\D/g,
        ""
      )
      .slice(
        -10
      );
  }

  /* ---------------------------------------------------------------------- */
  /* REQUEST OTP                                                            */
  /* ---------------------------------------------------------------------- */

  async function requestOtp(
    isResend = false
  ) {
    if (loading) {
      return;
    }

    const mobile =
      cleanPhone();

    if (
      !/^[6-9]\d{9}$/.test(
        mobile
      )
    ) {
      setSuccess(false);

      setMessage(
        "Please enter a valid 10 digit mobile number."
      );

      return;
    }

    try {
      setLoading(true);

      setMessage("");

      setSuccess(false);

      const response =
        await fetch(
          "/api/forgot-password/request",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                phone:
                  mobile,
              }),
          }
        );

      const data:
        ApiResponse =
          await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setSuccess(false);

        setMessage(
          data.message ||
            "Unable to send OTP."
        );

        return;
      }

      if (
        data.maskedEmail
      ) {
        setMaskedEmail(
          data.maskedEmail
        );
      }

      setStep(
        "OTP"
      );

      setOtp("");

      setSuccess(true);

      setMessage(
        isResend
          ? `A new 6-digit OTP has been sent to ${data.maskedEmail || "your registered email address"}.`
          : `OTP sent successfully to ${data.maskedEmail || "your registered email address"}. It is valid for 10 minutes.`
      );

      setResendSeconds(
        60
      );
    } catch (
      error
    ) {
      console.error(
        "REQUEST OTP ERROR:",
        error
      );

      setSuccess(false);

      setMessage(
        "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* VERIFY OTP                                                             */
  /* ---------------------------------------------------------------------- */

  async function verifyOtp() {
    if (loading) {
      return;
    }

    const mobile =
      cleanPhone();

    const cleanOtp =
      otp.replace(
        /\D/g,
        ""
      );

    if (
      cleanOtp.length !==
      6
    ) {
      setSuccess(false);

      setMessage(
        "Please enter the 6-digit OTP."
      );

      return;
    }

    try {
      setLoading(true);

      setMessage("");

      setSuccess(false);

      const response =
        await fetch(
          "/api/forgot-password/verify",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                phone:
                  mobile,

                otp:
                  cleanOtp,
              }),
          }
        );

      const data:
        ApiResponse =
          await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.resetToken
      ) {
        setSuccess(false);

        setMessage(
          data.message ||
            "OTP verification failed."
        );

        return;
      }

      setResetToken(
        data.resetToken
      );

      setStep(
        "RESET"
      );

      setSuccess(true);

      setMessage(
        "OTP verified successfully. Please create your new password."
      );
    } catch (
      error
    ) {
      console.error(
        "VERIFY OTP ERROR:",
        error
      );

      setSuccess(false);

      setMessage(
        "Unable to verify OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* RESET PASSWORD                                                         */
  /* ---------------------------------------------------------------------- */

  async function resetPassword() {
    if (loading) {
      return;
    }

    if (
      newPassword.length <
      6
    ) {
      setSuccess(false);

      setMessage(
        "New password must contain at least 6 characters."
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setSuccess(false);

      setMessage(
        "New Password and Confirm Password do not match."
      );

      return;
    }

    if (
      !resetToken
    ) {
      setSuccess(false);

      setMessage(
        "Password reset session has expired. Please request a new OTP."
      );

      return;
    }

    try {
      setLoading(true);

      setMessage("");

      const response =
        await fetch(
          "/api/forgot-password/reset",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                phone:
                  cleanPhone(),

                resetToken,

                newPassword,

                confirmPassword,
              }),
          }
        );

      const data:
        ApiResponse =
          await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setSuccess(false);

        setMessage(
          data.message ||
            "Unable to reset password."
        );

        return;
      }

      setSuccess(true);

      setMessage(
        "Your password has been changed successfully."
      );

      setStep(
        "SUCCESS"
      );

      setOtp("");

      setNewPassword("");

      setConfirmPassword("");

      setShowNewPassword(
        false
      );

      setShowConfirmPassword(
        false
      );

      setResetToken("");
    } catch (
      error
    ) {
      console.error(
        "RESET PASSWORD ERROR:",
        error
      );

      setSuccess(false);

      setMessage(
        "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-8">

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      </div>

      <div className="relative z-10 w-full max-w-md">

        <div className="mb-7 text-center text-white">

          <div className="mb-3 text-5xl">
            🔐
          </div>

          <h1 className="text-3xl font-black">
            Forgot Password
          </h1>

          <p className="mt-2 text-blue-200">
            Agents India
          </p>

        </div>

        <div className="rounded-3xl bg-white p-7 shadow-2xl sm:p-8">

          {/* PHONE STEP */}

          {step ===
            "PHONE" && (
            <>

              <h2 className="text-center text-2xl font-black text-slate-900">
                Reset Password
              </h2>

              <p className="mt-2 text-center text-sm text-gray-500">
                Enter your registered mobile number.
              </p>

              <div className="mt-7">

                <label className="mb-2 block font-semibold text-gray-700">
                  Registered Mobile Number
                </label>

                <div className="flex">

                  <span className="flex items-center rounded-l-xl border border-r-0 border-gray-300 bg-gray-100 px-4 font-bold text-slate-900">
                    +91
                  </span>

                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={
                      10
                    }
                    value={
                      phone
                    }
                    disabled={
                      loading
                    }
                    onChange={(
                      event
                    ) => {
                      setPhone(
                        event
                          .target
                          .value
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
                    className="w-full rounded-r-xl border border-gray-300 p-3.5 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />

                </div>

              </div>

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  void requestOtp()
                }
                className="mt-6 w-full rounded-xl bg-slate-900 p-3.5 font-black text-white hover:bg-blue-900 disabled:opacity-60"
              >
                {loading
                  ? "Sending OTP..."
                  : "Send OTP"}
              </button>

            </>
          )}

          {/* OTP STEP */}

          {step ===
            "OTP" && (
            <>

              <h2 className="text-center text-2xl font-black text-slate-900">
                Verify OTP
              </h2>

              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center">

                <p className="text-sm font-bold text-green-800">
                  OTP sent to your registered email
                </p>

                {maskedEmail && (
                  <p className="mt-1 font-black text-green-900">
                    {
                      maskedEmail
                    }
                  </p>
                )}

                <p className="mt-1 text-xs text-green-700">
                  Valid for 10 minutes
                </p>

              </div>

              <div className="mt-6">

                <label className="mb-2 block font-semibold text-gray-700">
                  6-Digit OTP
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={
                    6
                  }
                  value={
                    otp
                  }
                  disabled={
                    loading
                  }
                  onChange={(
                    event
                  ) =>
                    setOtp(
                      event
                        .target
                        .value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(
                          0,
                          6
                        )
                    )
                  }
                  placeholder="Enter OTP"
                  className="w-full rounded-xl border border-gray-300 p-4 text-center text-2xl font-black tracking-[0.5em] text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />

              </div>

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  void verifyOtp()
                }
                className="mt-6 w-full rounded-xl bg-slate-900 p-3.5 font-black text-white hover:bg-blue-900 disabled:opacity-60"
              >
                {loading
                  ? "Verifying..."
                  : "Verify OTP"}
              </button>

              <button
                type="button"
                disabled={
                  loading ||
                  resendSeconds >
                    0
                }
                onClick={() =>
                  void requestOtp(
                    true
                  )
                }
                className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 p-3 font-bold text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendSeconds >
                0
                  ? `Resend OTP in ${resendSeconds}s`
                  : "Resend OTP"}
              </button>

            </>
          )}

          {/* RESET STEP */}

          {step ===
            "RESET" && (
            <>

              <h2 className="text-center text-2xl font-black text-slate-900">
                Create New Password
              </h2>

              <p className="mt-2 text-center text-sm text-gray-500">
                Enter your new login password.
              </p>

              <div className="mt-6">

                <label className="mb-2 block font-semibold text-gray-700">
                  New Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    value={
                      newPassword
                    }
                    disabled={
                      loading
                    }
                    onChange={(
                      event
                    ) =>
                      setNewPassword(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-gray-300 p-3.5 pr-14 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    aria-label={
                      showNewPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    title={
                      showNewPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-xl hover:bg-slate-100"
                  >
                    {showNewPassword
                      ? "🙈"
                      : "👁️"}
                  </button>

                </div>

              </div>

              <div className="mt-5">

                <label className="mb-2 block font-semibold text-gray-700">
                  Confirm New Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    value={
                      confirmPassword
                    }
                    disabled={
                      loading
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmPassword(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-gray-300 p-3.5 pr-14 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    title={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-xl hover:bg-slate-100"
                  >
                    {showConfirmPassword
                      ? "🙈"
                      : "👁️"}
                  </button>

                </div>

              </div>

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  void resetPassword()
                }
                className="mt-6 w-full rounded-xl bg-slate-900 p-3.5 font-black text-white hover:bg-blue-900 disabled:opacity-60"
              >
                {loading
                  ? "Changing Password..."
                  : "Change Password"}
              </button>

            </>
          )}

          {/* SUCCESS STEP */}

          {step ===
            "SUCCESS" && (
            <>

              <div className="text-center">

                <div className="text-6xl">
                  ✅
                </div>

                <h2 className="mt-4 text-2xl font-black text-slate-900">
                  Password Changed
                </h2>

                <p className="mt-2 text-gray-600">
                  Your new password is ready to use.
                </p>

              </div>

              <a
                href="/login"
                className="mt-7 block w-full rounded-xl bg-slate-900 p-3.5 text-center font-black text-white hover:bg-blue-900"
              >
                Back to Login
              </a>

            </>
          )}

          {/* MESSAGE */}

          {message &&
            step !==
              "SUCCESS" && (
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

          {step !==
            "SUCCESS" && (
            <>

              <div className="my-6 border-t border-gray-200" />

              <a
                href="/login"
                className="block text-center font-bold text-blue-700 hover:underline"
              >
                ← Back to Login
              </a>

              <p className="mt-5 text-center text-xs text-gray-400">
                Need help? support@agentsindia.org
              </p>

            </>
          )}

        </div>

      </div>

    </main>
  );
}