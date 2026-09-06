"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type FollowUp = {
  id: string;
  userId: string;
  customerId: string;
  enquiryId?: string | null;
  comment: string;
  followUpDate: string;
  nextFollowUpDate?: string | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | string;
  outcome?: "CONTINUE" | "BUSINESS_CLOSED" | "CASE_LOST" | "CANCELLED" | string;
  lostReason?: string | null;
  cancellationReason?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customer?: {
    id: string;
    customerId?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  enquiry?: {
    id: string;
    businessType?: string | null;
    requirement?: string | null;
    remarks?: string | null;
    status?: string | null;
    enquiryDate?: string | null;
    nextFollowUpDate?: string | null;
  } | null;
};

type Outcome = "CONTINUE" | "BUSINESS_CLOSED" | "CASE_LOST" | "CANCELLED";
type LeadType = "CUSTOMER" | "SUB_AGENT";

interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  followUps?: T[];
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

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
      // Ignore invalid local storage payload
    }
  }

  return "";
}

function cleanPhone(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function getStatusStyle(status?: string) {
  switch (status) {
    case "PENDING":
      return "bg-orange-50 text-orange-700";
    case "COMPLETED":
      return "bg-green-50 text-green-700";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStatusName(status?: string) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status || "-";
  }
}

function getOutcomeName(outcome?: string) {
  switch (outcome) {
    case "CONTINUE":
      return "Continue Follow-up";
    case "BUSINESS_CLOSED":
      return "Business Closed / Converted";
    case "CASE_LOST":
      return "Case Lost";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "";
  }
}

function getOutcomeStyle(outcome?: string) {
  switch (outcome) {
    case "BUSINESS_CLOSED":
      return "bg-green-50 text-green-700";
    case "CASE_LOST":
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

function getLeadType(item: FollowUp): LeadType {
  const marker = `${item.enquiry?.remarks || ""} ${item.enquiry?.requirement || ""}`.toUpperCase();
  return marker.includes("SUB_AGENT") || marker.includes("SUB-AGENT")
    ? "SUB_AGENT"
    : "CUSTOMER";
}

/* -------------------------------------------------------------------------- */
/* PAGE COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function FollowUpsPage() {
  const router = useRouter();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");

  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);

  const loadFollowUps = useCallback(async (currentUserId: string) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/follow-ups?userId=${encodeURIComponent(currentUserId)}`,
        { cache: "no-store", credentials: "include" }
      );

      const data: ApiResponse<FollowUp> = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        setFollowUps([]);
        setError(data.message || "Unable to load follow-ups.");
        return;
      }

      setFollowUps(Array.isArray(data.followUps) ? data.followUps : []);
    } catch (err) {
      console.error("LOAD FOLLOW UPS ERROR:", err);
      setFollowUps([]);
      setError("Unable to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = getLoggedInUserId();
    if (!id) {
      setLoading(false);
      setError("Logged-in user information was not found. Please login again.");
      return;
    }
    setUserId(id);
    void loadFollowUps(id);
  }, [loadFollowUps]);

  const { pendingCount, completedCount, cancelledCount } = useMemo(() => {
    return followUps.reduce(
      (acc, item) => {
        if (item.status === "PENDING") acc.pendingCount++;
        else if (item.status === "COMPLETED") acc.completedCount++;
        else if (item.status === "CANCELLED") acc.cancelledCount++;
        return acc;
      },
      { pendingCount: 0, completedCount: 0, cancelledCount: 0 }
    );
  }, [followUps]);

  const filteredFollowUps = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return followUps;

    return followUps.filter((item) => {
      const searchFields = [
        item.customer?.name,
        item.customer?.phone,
        item.customer?.customerId,
        item.enquiry?.businessType,
        item.enquiry?.requirement,
        item.comment,
        item.status,
        getOutcomeName(item.outcome),
        getLeadType(item),
      ];

      return searchFields.some((field) =>
        String(field || "").toLowerCase().includes(query)
      );
    });
  }, [followUps, search]);

  function openAction(item: FollowUp, outcome: Outcome) {
    setSelectedFollowUp(item);
    setSelectedOutcome(outcome);
    setError("");
    setSuccess("");
  }

  function closeAction() {
    setSelectedFollowUp(null);
    setSelectedOutcome(null);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
          >
            ← Dashboard
          </Link>
          <Link
            href="/enquiries"
            className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Enquiries
          </Link>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Customer and Sub-Agent follow-up reminders and status
          </p>
        </div>

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
            ✅ {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            ⚠️ {error}
          </div>
        )}

        {!loading && (
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryCard label="📞 Total" value={followUps.length} valueClass="text-blue-700" />
            <SummaryCard label="⏳ Pending" value={pendingCount} valueClass="text-orange-600" />
            <SummaryCard label="✅ Completed" value={completedCount} valueClass="text-green-600" />
            <SummaryCard label="❌ Cancelled" value={cancelledCount} valueClass="text-red-600" />
          </div>
        )}

        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, mobile, business, remarks or status..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500"
          />
        </div>

        {loading && (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="mb-2 text-3xl">⏳</div>
            <p className="text-sm text-gray-600">Loading follow-ups...</p>
          </div>
        )}

        {!loading && !error && filteredFollowUps.length === 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mb-2 text-4xl">📞</div>
            <h2 className="font-bold text-gray-900">No Follow-ups Found</h2>
            <p className="mt-1 text-sm text-gray-500">
              Follow-ups created from enquiries will appear here.
            </p>
          </div>
        )}

        {!loading && filteredFollowUps.length > 0 && (
          <div className="space-y-3">
            {filteredFollowUps.map((item) => {
              const phone = item.customer?.phone || "";
              const whatsapp = cleanPhone(phone);
              const businessType = item.enquiry?.businessType || "-";
              const requirement = item.enquiry?.requirement || "-";
              const outcomeName = getOutcomeName(item.outcome);
              const isPending = item.status === "PENDING";
              const leadType = getLeadType(item);

              return (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-gray-900">{item.customer?.name || "Customer"}</h2>
                        {item.customer?.customerId && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {item.customer.customerId}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            leadType === "SUB_AGENT"
                              ? "bg-violet-100 text-violet-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {leadType === "SUB_AGENT" ? "🤝 Sub Agent Lead" : "👤 Customer Lead"}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        {phone && <span>📱 {phone}</span>}
                        <span>🛡️ {businessType}</span>
                        {requirement !== "-" && !requirement.toUpperCase().includes("SUB-AGENT LEAD") && (
                          <span>Requirement: {requirement}</span>
                        )}
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${getStatusStyle(item.status)}`}>
                      {getStatusName(item.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100 pt-3 text-sm">
                    <span className="font-medium text-blue-700">
                      📅 {formatDate(item.followUpDate)}
                    </span>
                    {item.nextFollowUpDate && (
                      <span className="font-medium text-orange-700">
                        Next: {formatDate(item.nextFollowUpDate)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Remarks:</span> {item.comment}
                    </p>
                  </div>

                  {item.outcome && item.outcome !== "CONTINUE" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${getOutcomeStyle(item.outcome)}`}>
                        {outcomeName}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    {phone && (
                      <a href={`tel:${phone}`} className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                        📞 Call
                      </a>
                    )}
                    {whatsapp && (
                      <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white">
                        WhatsApp
                      </a>
                    )}
                    {item.enquiryId && (
                      <Link href={`/enquiries/${item.enquiryId}`} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800">
                        👁 View Enquiry
                      </Link>
                    )}
                  </div>

                  {isPending && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                        Update Follow-up
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <button type="button" onClick={() => openAction(item, "CONTINUE")} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                          📅 Continue
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction(item, "BUSINESS_CLOSED")}
                          className={`rounded-lg px-3 py-2 text-sm font-bold ${
                            leadType === "SUB_AGENT" ? "bg-violet-50 text-violet-700" : "bg-green-50 text-green-700"
                          }`}
                        >
                          {leadType === "SUB_AGENT" ? "🤝 Create Sub Agent" : "✅ Business Closed"}
                        </button>
                        <button type="button" onClick={() => openAction(item, "CASE_LOST")} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                          ❌ Case Lost
                        </button>
                        <button type="button" onClick={() => openAction(item, "CANCELLED")} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700">
                          🚫 Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedFollowUp && selectedOutcome && (
        <ActionModal
          selectedFollowUp={selectedFollowUp}
          selectedOutcome={selectedOutcome}
          userId={userId}
          onClose={closeAction}
          onSuccess={(msg) => {
            setSuccess(msg);
            closeAction();
            void loadFollowUps(userId);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onError={setError}
        />
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* MODAL COMPONENT                                                            */
/* -------------------------------------------------------------------------- */

function ActionModal({
  selectedFollowUp,
  selectedOutcome,
  userId,
  onClose,
  onSuccess,
  onError,
}: {
  selectedFollowUp: FollowUp;
  selectedOutcome: Outcome;
  userId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const router = useRouter();
  const [actionComment, setActionComment] = useState(selectedFollowUp.comment || "");
  const [actionFollowUpDate, setActionFollowUpDate] = useState(
    toDateInputValue(selectedFollowUp.followUpDate)
  );
  const [actionNextDate, setActionNextDate] = useState(
    selectedOutcome === "CONTINUE" ? toDateInputValue(selectedFollowUp.nextFollowUpDate) : ""
  );
  const [lostReason, setLostReason] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  const leadType = getLeadType(selectedFollowUp);

  async function saveAction() {
    if (!userId) {
      onError("Logged-in user information was not found.");
      return;
    }

    const comment = actionComment.trim();
    if (!comment) {
      onError("Please enter follow-up remarks.");
      return;
    }

    if (selectedOutcome === "BUSINESS_CLOSED" && leadType === "SUB_AGENT") {
      const enquiryId = selectedFollowUp.enquiryId || selectedFollowUp.enquiry?.id || "";
      const queryParams = new URLSearchParams({
        conversion: "1",
        followUpId: selectedFollowUp.id,
        enquiryId,
        name: selectedFollowUp.customer?.name || "",
        phone: selectedFollowUp.customer?.phone || "",
        businessType: selectedFollowUp.enquiry?.businessType || "",
        comment,
        followUpDate: actionFollowUpDate,
      });

      router.push(`/sub-agents/add?${queryParams.toString()}`);
      return;
    }

    if (selectedOutcome === "CONTINUE" && !actionNextDate) {
      onError("Please select the next follow-up date.");
      return;
    }

    if (selectedOutcome === "CASE_LOST" && !lostReason.trim()) {
      onError("Please enter the lost reason.");
      return;
    }

    if (selectedOutcome === "CANCELLED" && !cancellationReason.trim()) {
      onError("Please enter the cancellation reason.");
      return;
    }

    try {
      setSavingAction(true);
      onError("");

      const payload = {
        id: selectedFollowUp.id,
        userId,
        outcome: selectedOutcome,
        comment,
        ...(actionFollowUpDate && { followUpDate: actionFollowUpDate }),
        ...(selectedOutcome === "CONTINUE" && { nextFollowUpDate: actionNextDate }),
        ...(selectedOutcome === "CASE_LOST" && { lostReason: lostReason.trim() }),
        ...(selectedOutcome === "CANCELLED" && { cancellationReason: cancellationReason.trim() }),
      };

      const response = await fetch("/api/follow-ups", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to update follow-up.");
      }

      const convertedCustomerId = selectedFollowUp.customer?.id || selectedFollowUp.customerId;
      if (selectedOutcome === "BUSINESS_CLOSED" && convertedCustomerId) {
        router.push(`/policies/add?customerId=${encodeURIComponent(convertedCustomerId)}`);
        return;
      }

      onSuccess(data.message || "Follow-up updated successfully.");
    } catch (err) {
      console.error("UPDATE FOLLOW UP ERROR:", err);
      onError(err instanceof Error ? err.message : "Unable to update follow-up.");
    } finally {
      setSavingAction(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Update Follow-up
              </p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">
                {selectedOutcome === "BUSINESS_CLOSED" && leadType === "SUB_AGENT"
                  ? "Create Sub Agent"
                  : getOutcomeName(selectedOutcome)}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {selectedFollowUp.customer?.name || "Customer"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={savingAction}
              className="rounded-lg bg-gray-100 px-3 py-2 font-bold text-gray-600 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="block text-sm font-bold text-gray-700">Follow-up Remarks *</label>
            <textarea
              rows={4}
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500"
              placeholder="Enter follow-up remarks..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700">Follow-up Date</label>
            <input
              type="date"
              value={actionFollowUpDate}
              onChange={(e) => setActionFollowUpDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500"
            />
          </div>

          {selectedOutcome === "CONTINUE" && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <label className="block text-sm font-bold text-blue-900">Next Follow-up Date *</label>
              <input
                type="date"
                value={actionNextDate}
                onChange={(e) => setActionNextDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm text-gray-900"
              />
            </div>
          )}

          {selectedOutcome === "BUSINESS_CLOSED" && leadType === "CUSTOMER" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-bold text-green-800">✅ Customer Business Converted</p>
              <p className="mt-1 text-sm text-green-700">
                After confirmation, the Add Policy page will open.
              </p>
            </div>
          )}

          {selectedOutcome === "BUSINESS_CLOSED" && leadType === "SUB_AGENT" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="font-bold text-violet-800">🤝 Continue to Sub-Agent Creation</p>
              <p className="mt-1 text-sm text-violet-700">
                The enquiry will NOT be marked converted now. It will be converted only after the Sub-Agent is successfully created.
              </p>
              <p className="mt-2 text-xs font-bold text-violet-800">
                If you cancel or go back, this follow-up remains pending and you can try again later.
              </p>
            </div>
          )}

          {selectedOutcome === "CASE_LOST" && (
            <div>
              <label className="block text-sm font-bold text-red-700">Lost Reason *</label>
              <textarea
                rows={3}
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-gray-900"
                placeholder="Why was this case lost?"
              />
            </div>
          )}

          {selectedOutcome === "CANCELLED" && (
            <div>
              <label className="block text-sm font-bold text-red-700">Cancellation Reason *</label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-gray-900"
                placeholder="Enter cancellation reason..."
              />
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={savingAction}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-bold text-gray-700 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={saveAction}
            disabled={savingAction}
            className={`rounded-xl px-5 py-2.5 font-bold text-white disabled:opacity-50 ${
              selectedOutcome === "BUSINESS_CLOSED"
                ? leadType === "SUB_AGENT"
                  ? "bg-violet-700"
                  : "bg-green-600"
                : selectedOutcome === "CASE_LOST"
                ? "bg-red-600"
                : selectedOutcome === "CANCELLED"
                ? "bg-gray-800"
                : "bg-blue-600"
            }`}
          >
            {savingAction
              ? "Saving..."
              : selectedOutcome === "BUSINESS_CLOSED"
              ? leadType === "SUB_AGENT"
                ? "Continue to Sub-Agent Creation"
                : "✓ Confirm & Add Policy"
              : selectedOutcome === "CASE_LOST"
              ? "Confirm Case Lost"
              : selectedOutcome === "CANCELLED"
              ? "Confirm Cancellation"
              : "Save Next Follow-up"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}