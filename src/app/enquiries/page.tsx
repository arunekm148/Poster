"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Customer = {
  id?: string;
  customerId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Enquiry = {
  id: string;
  enquiryId?: string | null;
  businessType?: string | null;
  requirement?: string | null;
  remarks?: string | null;
  status?: string | null;
  enquiryDate?: string | null;
  nextFollowUpDate?: string | null;
  customer?: Customer | null;
};

type LeadType = "CUSTOMER" | "SUB_AGENT";
type SummaryFilter = "ALL" | "OPEN" | "FOLLOW_UP" | "CONVERTED";

type EnquiryApiResponse = {
  success?: boolean;
  message?: string;
  enquiries?: Enquiry[];
  data?: Enquiry[];
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
      // Ignore invalid JSON in local storage
    }
  }

  return "";
}

function normalizeStatus(status?: string | null): string {
  return String(status || "NEW").trim().toUpperCase();
}

function getStatusLabel(status?: string | null): string {
  const value = normalizeStatus(status);
  switch (value) {
    case "NEW": return "New";
    case "OPEN": return "Open";
    case "FOLLOW_UP":
    case "FOLLOWUP": return "Follow-up";
    case "PENDING": return "Pending";
    case "CONVERTED": return "Converted";
    case "LOST": return "Lost";
    case "CLOSED": return "Closed";
    case "CANCELLED": return "Cancelled";
    default:
      return value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function getStatusStyle(status?: string | null): string {
  const value = normalizeStatus(status);
  if (value === "CONVERTED") return "bg-emerald-100 text-emerald-800";
  if (["FOLLOW_UP", "FOLLOWUP", "PENDING"].includes(value)) return "bg-orange-100 text-orange-800";
  if (["LOST", "CLOSED", "CANCELLED"].includes(value)) return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-800";
}

function getLeadType(enquiry: Enquiry): LeadType {
  const marker = `${enquiry.remarks || ""} ${enquiry.requirement || ""}`.toUpperCase();
  return marker.includes("SUB_AGENT") || marker.includes("SUB-AGENT") ? "SUB_AGENT" : "CUSTOMER";
}

function cleanPhoneNumber(value?: string | null): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
}

function matchesSummaryFilter(enquiry: Enquiry, filter: SummaryFilter): boolean {
  if (filter === "ALL") return true;
  const status = normalizeStatus(enquiry.status);
  if (filter === "OPEN") return status === "NEW" || status === "OPEN";
  if (filter === "FOLLOW_UP") return ["FOLLOW_UP", "FOLLOWUP", "PENDING"].includes(status);
  return status === "CONVERTED";
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("ALL");

  useEffect(() => {
    void loadEnquiries();
  }, []);

  async function loadEnquiries() {
    try {
      setLoading(true);
      setError("");

      const userId = getLoggedInUserId();
      if (!userId) {
        throw new Error("Logged-in user information was not found. Please login again.");
      }

      const response = await fetch(`/api/enquiries?userId=${encodeURIComponent(userId)}`, {
        cache: "no-store",
        credentials: "include",
      });

      const data: EnquiryApiResponse = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to load enquiries.");
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.enquiries)
        ? data.enquiries
        : Array.isArray(data.data)
        ? data.data
        : [];

      setEnquiries(list);
    } catch (err) {
      console.error("LOAD ENQUIRIES ERROR:", err);
      setEnquiries([]);
      setError(err instanceof Error ? err.message : "Unable to load enquiries.");
    } finally {
      setLoading(false);
    }
  }

  // Optimized single-pass memoization for summary counts and filtered list
  const { counts, filteredEnquiries } = useMemo(() => {
    const query = search.trim().toLowerCase();
    const countsMap = { open: 0, followUp: 0, converted: 0 };

    const filtered = enquiries.filter((enquiry) => {
      const status = normalizeStatus(enquiry.status);

      if (status === "NEW" || status === "OPEN") countsMap.open++;
      if (["FOLLOW_UP", "FOLLOWUP", "PENDING"].includes(status)) countsMap.followUp++;
      if (status === "CONVERTED") countsMap.converted++;

      if (!matchesSummaryFilter(enquiry, summaryFilter)) return false;
      if (!query) return true;

      const customer = enquiry.customer;
      return [
        enquiry.enquiryId,
        customer?.name,
        customer?.phone,
        enquiry.businessType,
        enquiry.status,
        getLeadType(enquiry),
      ].some((val) => String(val || "").toLowerCase().includes(query));
    });

    return { counts: countsMap, filteredEnquiries: filtered };
  }, [enquiries, search, summaryFilter]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">Sales Management</p>
            <h1 className="mt-1 text-3xl font-black">Enquiries</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Quick leads, follow-ups and conversions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/follow-ups"
              className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-800 hover:bg-orange-100"
            >
              📞 Follow-ups
            </Link>

            <Link
              href="/enquiries/import"
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 hover:bg-emerald-100"
            >
              📊 Import Excel
            </Link>

            <Link
              href="/enquiries/add"
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-blue-800"
            >
              + New Enquiry
            </Link>
          </div>
        </div>

        {!loading && (
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Total"
              value={enquiries.length}
              icon="📥"
              active={summaryFilter === "ALL"}
              onClick={() => setSummaryFilter("ALL")}
            />
            <SummaryCard
              label="Open / New"
              value={counts.open}
              icon="🆕"
              active={summaryFilter === "OPEN"}
              onClick={() => setSummaryFilter("OPEN")}
            />
            <SummaryCard
              label="Follow-up"
              value={counts.followUp}
              icon="📞"
              active={summaryFilter === "FOLLOW_UP"}
              onClick={() => setSummaryFilter("FOLLOW_UP")}
            />
            <SummaryCard
              label="Converted"
              value={counts.converted}
              icon="✅"
              active={summaryFilter === "CONVERTED"}
              onClick={() => setSummaryFilter("CONVERTED")}
            />
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (summaryFilter !== "ALL") setSummaryFilter("ALL");
            }}
            placeholder="Search name, phone, business type..."
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 font-semibold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border bg-white p-10 text-center font-bold text-slate-500">
            Loading enquiries...
          </div>
        )}

        {!loading && !error && filteredEnquiries.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📥</div>
            <h2 className="mt-3 text-lg font-black">No Enquiries Found</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {summaryFilter !== "ALL"
                ? "No entries match this active status card filter."
                : "Get started by adding a new enquiry lead."}
            </p>
            {summaryFilter !== "ALL" ? (
              <button
                type="button"
                onClick={() => setSummaryFilter("ALL")}
                className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200"
              >
                Clear Card Filter
              </button>
            ) : (
              <Link
                href="/enquiries/add"
                className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-800"
              >
                + New Enquiry
              </Link>
            )}
          </div>
        )}

        {!loading && filteredEnquiries.length > 0 && (
          <div className="space-y-3">
            {filteredEnquiries.map((enquiry) => (
              <EnquiryCard key={enquiry.id} enquiry={enquiry} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const customer = enquiry.customer;
  const customerId = customer?.id || "";
  const name = customer?.name || "Lead";
  const phone = customer?.phone || "";
  const whatsapp = cleanPhoneNumber(phone);
  const leadType = getLeadType(enquiry);

  const addFollowUpHref =
    `/follow-ups/add?enquiryId=${encodeURIComponent(enquiry.id)}` +
    `&customerId=${encodeURIComponent(customerId)}` +
    `&name=${encodeURIComponent(name)}` +
    `&phone=${encodeURIComponent(phone)}` +
    `&businessType=${encodeURIComponent(enquiry.businessType || "")}`;

  const convertSubAgentHref =
    `/sub-agents/add?name=${encodeURIComponent(name)}` +
    `&phone=${encodeURIComponent(phone)}` +
    `&businessType=${encodeURIComponent(enquiry.businessType || "")}` +
    `&enquiryId=${encodeURIComponent(enquiry.id)}`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                leadType === "SUB_AGENT" ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {leadType === "SUB_AGENT" ? "🤝 Sub Agent Lead" : "👤 Customer Lead"}
            </span>

            {enquiry.businessType && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                {enquiry.businessType}
              </span>
            )}
          </div>

          <h2 className="mt-2 text-xl font-black">{name}</h2>

          {phone && <p className="mt-1 text-sm font-bold text-slate-600">📱 {phone}</p>}
        </div>

        <span className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${getStatusStyle(enquiry.status)}`}>
          {getStatusLabel(enquiry.status)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100"
          >
            📞 Call
          </a>
        )}

        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
          >
            WhatsApp
          </a>
        )}

        <Link
          href={`/enquiries/${enquiry.id}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-100"
        >
          👁 View Enquiry
        </Link>

        {customerId &&
          !["CONVERTED", "LOST", "CLOSED", "CANCELLED"].includes(normalizeStatus(enquiry.status)) && (
            <Link
              href={addFollowUpHref}
              className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-black text-white hover:bg-orange-700"
            >
              📅 + Add Follow-up
            </Link>
          )}

        {leadType === "SUB_AGENT" && normalizeStatus(enquiry.status) !== "CONVERTED" && (
          <Link
            href={convertSubAgentHref}
            className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white hover:bg-violet-800"
          >
            🤝 Convert to Sub Agent
          </Link>
        )}
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${
        active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      <div className="text-xl">{icon}</div>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-blue-700">{value}</p>
    </button>
  );
}