"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type ApiResponse = {
  success?: boolean;
  message?: string;
};

function getLoggedInUserId(): string {
  if (typeof window === "undefined") return "";

  const direct = localStorage.getItem("userId");
  if (direct?.trim()) return direct.trim();

  for (const key of ["agentUser", "user"]) {
    const stored = localStorage.getItem(key);
    if (!stored) continue;

    try {
      const parsed = JSON.parse(stored);
      const id = String(parsed?.id || parsed?.userId || "").trim();
      if (id) {
        localStorage.setItem("userId", id);
        return id;
      }
    } catch {
      // Ignore invalid local storage parsing errors
    }
  }

  return "";
}

function nowForDateTimeInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AddFollowUpPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="font-bold text-slate-500">Loading follow-up...</p>
        </main>
      }
    >
      <AddFollowUpContent />
    </Suspense>
  );
}

function AddFollowUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const enquiryId = String(searchParams.get("enquiryId") || "").trim();
  const customerId = String(searchParams.get("customerId") || "").trim();
  const customerName = String(searchParams.get("name") || "Customer").trim();
  const customerPhone = String(searchParams.get("phone") || "").trim();
  const businessType = String(searchParams.get("businessType") || "").trim();

  const [userId, setUserId] = useState("");
  const [comment, setComment] = useState("");
  const [followUpDate, setFollowUpDate] = useState(nowForDateTimeInput());
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const activeUserId = getLoggedInUserId();

    if (!activeUserId) {
      setError("Agent login information not found. Please login again.");
      return;
    }

    setUserId(activeUserId);

    if (!enquiryId || !customerId) {
      setError("Enquiry information is missing. Please open Add Follow-up from the Enquiries page.");
    }
  }, [enquiryId, customerId]);

  async function saveFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    const activeUserId = userId || getLoggedInUserId();

    if (!activeUserId) {
      setError("Agent login information not found.");
      return;
    }

    if (!customerId) {
      setError("Customer information is missing.");
      return;
    }

    if (!enquiryId) {
      setError("Enquiry information is missing.");
      return;
    }

    if (!comment.trim()) {
      setError("Please enter follow-up remarks.");
      return;
    }

    if (!followUpDate) {
      setError("Please select follow-up date and time.");
      return;
    }

    const currentFollowUp = new Date(followUpDate);
    if (isNaN(currentFollowUp.getTime())) {
      setError("Please select a valid follow-up date & time.");
      return;
    }

    let nextFollowUp: Date | null = null;
    if (nextFollowUpDate) {
      nextFollowUp = new Date(nextFollowUpDate);
      if (isNaN(nextFollowUp.getTime())) {
        setError("Please select a valid next follow-up date & time.");
        return;
      }

      if (nextFollowUp <= currentFollowUp) {
        setError("Next follow-up time must be after the current follow-up time.");
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch("/api/follow-ups", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: activeUserId,
          customerId,
          enquiryId,
          comment: comment.trim(),
          followUpDate: currentFollowUp.toISOString(),
          nextFollowUpDate: nextFollowUp ? nextFollowUp.toISOString() : null,
        }),
      });

      const data: ApiResponse = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        setError(data.message || "Unable to save follow-up.");
        return;
      }

      setSuccess(data.message || "Follow-up saved successfully.");

      window.setTimeout(() => {
        router.push("/follow-ups");
      }, 500);
    } catch (err) {
      console.error("SAVE FOLLOW-UP ERROR:", err);
      setError(err instanceof Error ? err.message : "Unable to save follow-up.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/enquiries"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            ← Enquiries
          </Link>

          <Link
            href="/follow-ups"
            className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-800 hover:bg-orange-100"
          >
            Follow-ups
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-wider text-orange-700">Sales Follow-up</p>

          <h1 className="mt-1 text-2xl font-black">Add Follow-up</h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Record the discussion and schedule the next contact.
          </p>

          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase text-blue-700">Enquiry</p>

            <h2 className="mt-1 text-xl font-black text-blue-950">{customerName}</h2>

            <div className="mt-2 flex flex-wrap gap-2 text-sm font-bold text-blue-800">
              {customerPhone && <span>📱 {customerPhone}</span>}
              {businessType && <span>🛡️ {businessType}</span>}
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              ✅ {success}
            </div>
          )}

          <form onSubmit={saveFollowUp} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-black text-slate-800">
                Follow-up Remarks *
              </label>

              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Example: Customer requested quotation. Call again today evening."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-800">
                  Follow-up Date & Time *
                </label>

                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-800">
                  Next Follow-up Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={nextFollowUpDate}
                  min={followUpDate || undefined}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
              After saving, this enquiry automatically moves to Follow-up status and appears on the Follow-ups page.
            </p>

            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href="/enquiries"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving || !enquiryId || !customerId}
                className="rounded-xl bg-orange-600 px-6 py-3 font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Follow-up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}