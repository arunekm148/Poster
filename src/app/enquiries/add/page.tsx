"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type LeadType = "CUSTOMER" | "SUB_AGENT";

type Customer = {
  id: string;
  name?: string | null;
  phone?: string | null;
  isActive?: boolean;
};

type CustomerApiResponse = {
  success?: boolean;
  message?: string;
  customers?: Customer[];
  data?: Customer[] | Customer;
  customer?: Customer;
};

type EnquiryApiResponse = {
  success?: boolean;
  message?: string;
  enquiry?: { id?: string };
  data?: { id?: string };
};

function getLoggedInUserId() {
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
      // Ignore invalid local storage.
    }
  }

  return "";
}

function todayForInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export default function AddEnquiryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="font-bold text-slate-500">Loading enquiry...</p>
        </main>
      }
    >
      <AddEnquiryContent />
    </Suspense>
  );
}

function AddEnquiryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState("");
  const [name, setName] = useState(searchParams.get("name") || "");
  const [phone, setPhone] = useState(
    normalizePhone(searchParams.get("phone") || "")
  );
  const [businessType, setBusinessType] = useState(
    searchParams.get("businessType") || ""
  );
  const [leadType, setLeadType] = useState<LeadType>(
    searchParams.get("leadType") === "SUB_AGENT" ? "SUB_AGENT" : "CUSTOMER"
  );

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
  }, []);

  const canSave = useMemo(
    () =>
      Boolean(
        name.trim() &&
          /^[6-9]\d{9}$/.test(phone) &&
          businessType &&
          !saving
      ),
    [name, phone, businessType, saving]
  );

  async function findExistingCustomer(
    activeUserId: string,
    cleanPhone: string
  ) {
    const response = await fetch(
      `/api/customers?userId=${encodeURIComponent(activeUserId)}&limit=500`,
      {
        cache: "no-store",
        credentials: "include",
      }
    );

    if (!response.ok) return null;

    let data: CustomerApiResponse | Customer[] = [];

    try {
      data = await response.json();
    } catch {
      return null;
    }

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data.customers)
        ? data.customers
        : Array.isArray(data.data)
          ? data.data
          : [];

    return (
      list.find(
        (customer) =>
          normalizePhone(String(customer.phone || "")) === cleanPhone &&
          customer.isActive !== false
      ) || null
    );
  }

  async function createLightCustomer(
    activeUserId: string,
    cleanName: string,
    cleanPhone: string
  ) {
    const response = await fetch("/api/customers", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: activeUserId,
        name: cleanName,
        phone: cleanPhone,
        sourceType: "SELF",
        isActive: true,
      }),
    });

    let data: CustomerApiResponse = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Unable to prepare enquiry contact.");
    }

    const directData =
      data.data && !Array.isArray(data.data)
        ? data.data
        : undefined;

    const customerId =
      data.customer?.id ||
      directData?.id;

    if (!customerId) {
      throw new Error("Customer ID was not returned by the server.");
    }

    return customerId;
  }

  async function saveEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const activeUserId = userId || getLoggedInUserId();

      if (!activeUserId) {
        throw new Error(
          "Agent login information not found. Please login again."
        );
      }

      const cleanName = name.trim();
      const cleanPhone = normalizePhone(phone);

      if (!cleanName) {
        throw new Error("Please enter name.");
      }

      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        throw new Error("Please enter a valid 10 digit mobile number.");
      }

      if (!businessType) {
        throw new Error("Please select business type.");
      }

      const existingCustomer = await findExistingCustomer(
        activeUserId,
        cleanPhone
      );

      const customerId =
        existingCustomer?.id ||
        (await createLightCustomer(
          activeUserId,
          cleanName,
          cleanPhone
        ));

      const marker =
        leadType === "SUB_AGENT"
          ? "[LEAD_TYPE:SUB_AGENT]"
          : "[LEAD_TYPE:CUSTOMER]";

      const response = await fetch("/api/enquiries", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: activeUserId,
          customerId,
          businessType,
          requirement:
            leadType === "SUB_AGENT"
              ? "Sub-Agent Lead"
              : null,
          remarks: marker,
          enquiryDate: todayForInput(),
          nextFollowUpDate: null,
        }),
      });

      let data: EnquiryApiResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to create enquiry.");
      }

      setSuccess("Enquiry saved successfully.");

      const enquiryId =
        data.enquiry?.id ||
        data.data?.id ||
        "";

      window.setTimeout(() => {
        if (enquiryId) {
          router.push(`/enquiries/${enquiryId}`);
          return;
        }

        router.push("/enquiries");
      }, 500);
    } catch (err) {
      console.error("SAVE ENQUIRY ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create enquiry."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={() => router.push("/enquiries")}
          className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
        >
          ← Back to Enquiries
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">
            Quick Lead Entry
          </p>

          <h1 className="mt-1 text-2xl font-black">
            New Enquiry
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Enter only the basic lead information. More details can be added later.
          </p>

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

          <form onSubmit={saveEnquiry} className="mt-6 space-y-5">
            <Field label="Name *">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer / lead name"
                className={inputClass}
              />
            </Field>

            <Field label="Mobile Number *">
              <input
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(event) =>
                  setPhone(normalizePhone(event.target.value))
                }
                placeholder="10 digit mobile number"
                className={inputClass}
              />
            </Field>

            <Field label="Business Type *">
              <select
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                className={inputClass}
              >
                <option value="">Select Business Type</option>
                <option value="HEALTH">Health Insurance</option>
                <option value="MOTOR">Motor Insurance</option>
                <option value="LIFE">Life Insurance</option>
                <option value="GENERAL">General Insurance</option>
                <option value="INVESTMENT">Investment</option>
                <option value="LOAN">Loan</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>

            <div>
              <label className="mb-2 block text-sm font-black text-slate-800">
                Lead Type *
              </label>

              <div className="grid grid-cols-2 gap-3">
                <LeadTypeButton
                  active={leadType === "CUSTOMER"}
                  title="Customer"
                  icon="👤"
                  onClick={() => setLeadType("CUSTOMER")}
                />

                <LeadTypeButton
                  active={leadType === "SUB_AGENT"}
                  title="Sub Agent"
                  icon="🤝"
                  onClick={() => setLeadType("SUB_AGENT")}
                />
              </div>

              {leadType === "SUB_AGENT" && (
                <p className="mt-2 rounded-xl bg-violet-50 p-3 text-xs font-semibold text-violet-700">
                  This lead can later be converted to a Sub Agent from the enquiry page.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSave}
              className="w-full rounded-xl bg-blue-700 px-5 py-3.5 font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Enquiry"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function LeadTypeButton({
  active,
  title,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
          : "border-slate-200 bg-white hover:border-blue-300"
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <p className="mt-2 font-black">{title}</p>
    </button>
  );
}
