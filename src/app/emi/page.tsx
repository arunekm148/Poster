"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AgentUser = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  role?: string;
};

type Customer = {
  id?: string;
  customerId?: string;
  name?: string;
  phone?: string;
};

type EmiInstallment = {
  id: string;
  policyId?: string;
  installmentNumber?: number;
  dueDate?: string | null;
  amount?: number | string | null;
  status?: string | null;
  collectedDate?: string | null;
  collectedAmount?: number | string | null;
  remarks?: string | null;
};

type Policy = {
  id: string;
  customerId?: string;
  policyNumber?: string;
  companyName?: string;
  productName?: string | null;
  policyType?: string | null;
  premium?: number | string | null;
  sumInsured?: number | string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  paymentType?: string | null;
  financier?: string | null;
  financedAmount?: number | string | null;
  emiAmount?: number | string | null;
  emiTenure?: number | null;
  firstEmiDate?: string | null;
  isActive?: boolean;
  customer?: Customer;
  installments?: EmiInstallment[];
};

type EmiRow = EmiInstallment & {
  policy: Policy;
};

type FilterType =
  | "MONTH"
  | "TODAY"
  | "OVERDUE"
  | "COLLECTED";

type GroupedCustomer = {
  key: string;
  customer: Customer;
  rows: EmiRow[];
};

type FollowUpForm = {
  installment: EmiRow;
  comment: string;
  followUpDate: string;
  nextFollowUpDate: string;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getDateOnly(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function dateInputValue(date = new Date()) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(
  value?: number | string | null
) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "₹0";
  }

  return `₹${number.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

function numberValue(
  value?: number | string | null
) {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function normalizePhone(phone?: string) {
  const digits = String(phone || "")
    .replace(/\D/g, "");

  if (!digits) return "";

  if (
    digits.startsWith("91") &&
    digits.length >= 12
  ) {
    return digits;
  }

  return `91${digits}`;
}

function isSameMonth(
  value: string | null | undefined,
  reference: Date
) {
  const date = getDateOnly(value);

  if (!date) return false;

  return (
    date.getFullYear() ===
      reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

function getStatus(
  item: EmiRow,
  today: Date
) {
  const originalStatus = String(
    item.status || ""
  ).toUpperCase();

  if (
    originalStatus === "COLLECTED" ||
    Boolean(item.collectedDate)
  ) {
    return "COLLECTED";
  }

  const dueDate = getDateOnly(
    item.dueDate
  );

  if (!dueDate) {
    return "PENDING";
  }

  if (
    dueDate.getTime() === today.getTime()
  ) {
    return "TODAY";
  }

  if (dueDate < today) {
    return "OVERDUE";
  }

  return "UPCOMING";
}

function statusLabel(status: string) {
  if (status === "TODAY") {
    return "Due Today";
  }

  if (status === "OVERDUE") {
    return "Overdue";
  }

  if (status === "UPCOMING") {
    return "Upcoming";
  }

  if (status === "COLLECTED") {
    return "Collected";
  }

  return "Pending";
}

function statusClass(status: string) {
  if (status === "TODAY") {
    return "border-orange-300 bg-orange-100 text-orange-900";
  }

  if (status === "OVERDUE") {
    return "border-red-300 bg-red-100 text-red-800";
  }

  if (status === "UPCOMING") {
    return "border-blue-200 bg-blue-100 text-blue-800";
  }

  if (status === "COLLECTED") {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  return "border-slate-300 bg-slate-100 text-slate-800";
}

function customerKey(
  customer?: Customer
) {
  return (
    customer?.id ||
    customer?.customerId ||
    `${customer?.phone || "unknown"}-${
      customer?.name || "customer"
    }`
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function EmiPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<AgentUser | null>(null);

  const [policies, setPolicies] =
    useState<Policy[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [dataLoading, setDataLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<FilterType>("MONTH");

  const [
    collectingId,
    setCollectingId,
  ] = useState<string | null>(null);

  const [
    followUpSaving,
    setFollowUpSaving,
  ] = useState(false);

  const [
    followUpForm,
    setFollowUpForm,
  ] = useState<FollowUpForm | null>(
    null
  );

  /*
   * Customer cards are collapsed by
   * default. This prevents all future
   * EMIs from filling the page.
   */
  const [
    expandedCustomers,
    setExpandedCustomers,
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    showFutureCustomers,
    setShowFutureCustomers,
  ] = useState<Set<string>>(
    new Set()
  );

  /* ------------------------------------------------------------------------ */
  /* DATE                                                                     */
  /* ------------------------------------------------------------------------ */

  const today = useMemo(() => {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }, []);

  const monthName = useMemo(() => {
    return today.toLocaleDateString(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );
  }, [today]);

  /* ------------------------------------------------------------------------ */
  /* LOAD POLICIES                                                            */
  /* ------------------------------------------------------------------------ */

  const loadPolicies = useCallback(
    async (userId: string) => {
      try {
        setDataLoading(true);
        setError("");

        const response = await fetch(
          `/api/policies?userId=${encodeURIComponent(
            userId
          )}`,
          {
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to load EMI information."
          );
        }

        const policyList =
          Array.isArray(data.policies)
            ? data.policies
            : Array.isArray(data.data)
            ? data.data
            : [];

        setPolicies(policyList);
      } catch (err) {
        console.error(
          "LOAD EMI ERROR:",
          err
        );

        setPolicies([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load EMI information."
        );
      } finally {
        setDataLoading(false);
      }
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* LOAD USER                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "agentUser"
        );

      if (!savedUser) {
        router.replace("/login");
        return;
      }

      const parsedUser: AgentUser =
        JSON.parse(savedUser);

      if (!parsedUser?.id) {
        localStorage.removeItem(
          "agentUser"
        );

        localStorage.removeItem(
          "userId"
        );

        router.replace("/login");
        return;
      }

      setUser(parsedUser);

      localStorage.setItem(
        "userId",
        parsedUser.id
      );

      loadPolicies(parsedUser.id);
    } catch (err) {
      console.error(
        "LOAD USER ERROR:",
        err
      );

      localStorage.removeItem(
        "agentUser"
      );

      localStorage.removeItem(
        "userId"
      );

      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router, loadPolicies]);

  /* ------------------------------------------------------------------------ */
  /* ALL INSTALLMENTS                                                         */
  /* ------------------------------------------------------------------------ */

  const allInstallments =
    useMemo<EmiRow[]>(() => {
      return policies.flatMap(
        (policy) => {
          const installments =
            Array.isArray(
              policy.installments
            )
              ? policy.installments
              : [];

          return installments.map(
            (installment) => ({
              ...installment,
              policy,
            })
          );
        }
      );
    }, [policies]);

  /* ------------------------------------------------------------------------ */
  /* MONTH DATA                                                               */
  /* ------------------------------------------------------------------------ */

  const monthInstallments =
    useMemo(() => {
      return allInstallments.filter(
        (item) =>
          isSameMonth(
            item.dueDate,
            today
          )
      );
    }, [allInstallments, today]);

  const dueToday = useMemo(() => {
    return monthInstallments.filter(
      (item) =>
        getStatus(item, today) ===
        "TODAY"
    );
  }, [monthInstallments, today]);

  /*
   * Overdue is intentionally all
   * outstanding overdue installments,
   * including older months.
   */
  const overdue = useMemo(() => {
    return allInstallments.filter(
      (item) =>
        getStatus(item, today) ===
        "OVERDUE"
    );
  }, [allInstallments, today]);

  const collectedThisMonth =
    useMemo(() => {
      return monthInstallments.filter(
        (item) =>
          getStatus(item, today) ===
          "COLLECTED"
      );
    }, [monthInstallments, today]);

  const pendingThisMonth =
    useMemo(() => {
      return monthInstallments.filter(
        (item) =>
          getStatus(item, today) !==
          "COLLECTED"
      );
    }, [monthInstallments, today]);

  const futureInstallments =
    useMemo(() => {
      return allInstallments
        .filter((item) => {
          const dueDate =
            getDateOnly(item.dueDate);

          if (!dueDate) return false;

          return (
            dueDate >
              today &&
            !isSameMonth(
              item.dueDate,
              today
            ) &&
            getStatus(
              item,
              today
            ) !== "COLLECTED"
          );
        })
        .sort((a, b) => {
          const dateA =
            getDateOnly(a.dueDate)
              ?.getTime() || 0;

          const dateB =
            getDateOnly(b.dueDate)
              ?.getTime() || 0;

          return dateA - dateB;
        });
    }, [allInstallments, today]);

  /* ------------------------------------------------------------------------ */
  /* AMOUNTS                                                                  */
  /* ------------------------------------------------------------------------ */

  const monthAmount = useMemo(
    () =>
      monthInstallments.reduce(
        (total, item) =>
          total +
          numberValue(item.amount),
        0
      ),
    [monthInstallments]
  );

  const dueTodayAmount = useMemo(
    () =>
      dueToday.reduce(
        (total, item) =>
          total +
          numberValue(item.amount),
        0
      ),
    [dueToday]
  );

  const overdueAmount = useMemo(
    () =>
      overdue.reduce(
        (total, item) =>
          total +
          numberValue(item.amount),
        0
      ),
    [overdue]
  );

  const collectedMonthAmount =
    useMemo(
      () =>
        collectedThisMonth.reduce(
          (total, item) =>
            total +
            numberValue(
              item.collectedAmount ||
                item.amount
            ),
          0
        ),
      [collectedThisMonth]
    );

  const pendingMonthAmount =
    useMemo(
      () =>
        pendingThisMonth.reduce(
          (total, item) =>
            total +
            numberValue(item.amount),
          0
        ),
      [pendingThisMonth]
    );

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredInstallments =
    useMemo<EmiRow[]>(() => {
      let list: EmiRow[] = [];

      if (filter === "MONTH") {
        list = [...monthInstallments];
      }

      if (filter === "TODAY") {
        list = [...dueToday];
      }

      if (filter === "OVERDUE") {
        list = [...overdue];
      }

      if (filter === "COLLECTED") {
        list = [
          ...collectedThisMonth,
        ];
      }

      const searchText = search
        .trim()
        .toLowerCase();

      if (searchText) {
        list = list.filter(
          (item) => {
            const customer =
              item.policy.customer;

            return [
              customer?.name,
              customer?.phone,
              customer?.customerId,
              item.policy.policyNumber,
              item.policy.companyName,
              item.policy.productName,
            ].some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(searchText)
            );
          }
        );
      }

      return list.sort((a, b) => {
        const nameA = String(
          a.policy.customer?.name ||
            ""
        ).toLowerCase();

        const nameB = String(
          b.policy.customer?.name ||
            ""
        ).toLowerCase();

        const nameCompare =
          nameA.localeCompare(nameB);

        if (nameCompare !== 0) {
          return nameCompare;
        }

        const dateA =
          getDateOnly(a.dueDate)
            ?.getTime() || 0;

        const dateB =
          getDateOnly(b.dueDate)
            ?.getTime() || 0;

        if (dateA !== dateB) {
          return dateA - dateB;
        }

        return (
          Number(
            a.installmentNumber || 0
          ) -
          Number(
            b.installmentNumber || 0
          )
        );
      });
    }, [
      filter,
      monthInstallments,
      dueToday,
      overdue,
      collectedThisMonth,
      search,
    ]);

  /* ------------------------------------------------------------------------ */
  /* GROUP CUSTOMERS                                                          */
  /* ------------------------------------------------------------------------ */

  const groupedCustomers =
    useMemo<GroupedCustomer[]>(
      () => {
        const map = new Map<
          string,
          GroupedCustomer
        >();

        for (
          const row of
          filteredInstallments
        ) {
          const customer =
            row.policy.customer || {};

          const key =
            customerKey(customer);

          const existing =
            map.get(key);

          if (existing) {
            existing.rows.push(row);
          } else {
            map.set(key, {
              key,
              customer,
              rows: [row],
            });
          }
        }

        return Array.from(
          map.values()
        ).sort((a, b) =>
          String(
            a.customer.name || ""
          ).localeCompare(
            String(
              b.customer.name || ""
            )
          )
        );
      },
      [filteredInstallments]
    );

  /* ------------------------------------------------------------------------ */
  /* CUSTOMER HELPERS                                                         */
  /* ------------------------------------------------------------------------ */

  function getCustomerRows(
    customer: Customer
  ) {
    const key =
      customerKey(customer);

    return allInstallments.filter(
      (row) =>
        customerKey(
          row.policy.customer
        ) === key
    );
  }

  function getCustomerFutureRows(
    customer: Customer
  ) {
    const key =
      customerKey(customer);

    return futureInstallments.filter(
      (row) =>
        customerKey(
          row.policy.customer
        ) === key
    );
  }

  function toggleCustomer(
    key: string
  ) {
    setExpandedCustomers(
      (current) => {
        const next =
          new Set(current);

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }

        return next;
      }
    );
  }

  function toggleFuture(
    key: string
  ) {
    setShowFutureCustomers(
      (current) => {
        const next =
          new Set(current);

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }

        return next;
      }
    );
  }

  /* ------------------------------------------------------------------------ */
  /* MARK COLLECTED                                                           */
  /* ------------------------------------------------------------------------ */

  async function markCollected(
    item: EmiRow
  ) {
    if (!user?.id) return;

    const amount =
      window.prompt(
        "Enter collected amount",
        String(item.amount || "")
      );

    if (amount === null) return;

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      window.alert(
        "Please enter a valid collected amount."
      );

      return;
    }

    const collectedDate =
      window.prompt(
        "Collection date (YYYY-MM-DD)",
        dateInputValue()
      );

    if (collectedDate === null) {
      return;
    }

    try {
      setCollectingId(item.id);
      setError("");
      setSuccessMessage("");

      const response =
        await fetch(
          `/api/emi-installments/${item.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              status: "COLLECTED",
              collectedAmount:
                numericAmount,
              collectedDate,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to mark EMI as collected."
        );
      }

      setSuccessMessage(
        `Installment #${
          item.installmentNumber ||
          ""
        } marked as collected successfully.`
      );

      await loadPolicies(
        user.id
      );
    } catch (err) {
      console.error(
        "COLLECT EMI ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark EMI as collected."
      );
    } finally {
      setCollectingId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* FOLLOW UP                                                                */
  /* ------------------------------------------------------------------------ */

  function openFollowUp(
    item: EmiRow
  ) {
    setFollowUpForm({
      installment: item,
      comment: "",
      followUpDate:
        dateInputValue(),
      nextFollowUpDate: "",
    });
  }

  async function saveFollowUp() {
    if (
      !user?.id ||
      !followUpForm
    ) {
      return;
    }

    const customerId =
      followUpForm.installment
        .policy.customer?.id;

    if (!customerId) {
      setError(
        "Customer ID is missing for this EMI."
      );

      return;
    }

    if (
      !followUpForm.comment.trim()
    ) {
      window.alert(
        "Please enter follow-up comment."
      );

      return;
    }

    if (
      !followUpForm.followUpDate
    ) {
      window.alert(
        "Please select follow-up date."
      );

      return;
    }

    try {
      setFollowUpSaving(true);
      setError("");
      setSuccessMessage("");

      const response =
        await fetch(
          "/api/emi-follow-ups",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              customerId,
              policyId:
                followUpForm
                  .installment
                  .policy.id,
              installmentId:
                followUpForm
                  .installment.id,
              comment:
                followUpForm.comment.trim(),
              followUpDate:
                followUpForm
                  .followUpDate,
              nextFollowUpDate:
                followUpForm
                  .nextFollowUpDate ||
                null,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to save EMI follow-up."
        );
      }

      setSuccessMessage(
        "EMI follow-up saved successfully."
      );

      setFollowUpForm(null);
    } catch (err) {
      console.error(
        "SAVE EMI FOLLOW-UP ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save EMI follow-up."
      );
    } finally {
      setFollowUpSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl">
            💳
          </div>

          <p className="mt-3 font-bold text-slate-900">
            Loading EMI Management...
          </p>

          <p className="mt-1 text-sm font-medium text-slate-600">
            Preparing collection information
          </p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">
      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              ←
            </Link>

            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950 md:text-2xl">
                EMI Management
              </h1>

              <p className="mt-0.5 text-sm font-medium text-slate-700">
                Track monthly collections and manage customer EMI accounts
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() =>
                user.id &&
                loadPolicies(user.id)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50"
            >
              ↻ Refresh
            </button>

            <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5">
              <p className="text-xs font-bold text-slate-600">
                Current Month
              </p>

              <p className="text-sm font-extrabold text-slate-950">
                {monthName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">
        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() =>
              setFilter("MONTH")
            }
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              filter === "MONTH"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                : "border-slate-200 bg-white hover:border-blue-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-slate-700">
                EMI Due This Month
              </p>

              <span className="text-xl">
                🗓️
              </span>
            </div>

            <p className="mt-3 text-3xl font-extrabold text-blue-800">
              {monthInstallments.length}
            </p>

            <p className="mt-1 text-base font-extrabold text-slate-950">
              {formatMoney(
                monthAmount
              )}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-600">
              {monthInstallments.length}{" "}
              installment
              {monthInstallments.length ===
              1
                ? ""
                : "s"}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter("TODAY")
            }
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              filter === "TODAY"
                ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100"
                : "border-slate-200 bg-white hover:border-orange-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-slate-700">
                Due Today
              </p>

              <span className="text-xl">
                📅
              </span>
            </div>

            <p className="mt-3 text-3xl font-extrabold text-orange-700">
              {dueToday.length}
            </p>

            <p className="mt-1 text-base font-extrabold text-slate-950">
              {formatMoney(
                dueTodayAmount
              )}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-600">
              Needs attention today
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter("OVERDUE")
            }
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              filter === "OVERDUE"
                ? "border-red-400 bg-red-50 ring-2 ring-red-100"
                : "border-slate-200 bg-white hover:border-red-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-slate-700">
                Overdue
              </p>

              <span className="text-xl">
                ⚠️
              </span>
            </div>

            <p className="mt-3 text-3xl font-extrabold text-red-700">
              {overdue.length}
            </p>

            <p className="mt-1 text-base font-extrabold text-red-800">
              {formatMoney(
                overdueAmount
              )}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-600">
              Pending from due dates
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "COLLECTED"
              )
            }
            className={`rounded-2xl border p-4 text-left shadow-sm transition ${
              filter === "COLLECTED"
                ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100"
                : "border-slate-200 bg-white hover:border-emerald-300"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-slate-700">
                Collected This Month
              </p>

              <span className="text-xl">
                ✅
              </span>
            </div>

            <p className="mt-3 text-3xl font-extrabold text-emerald-700">
              {
                collectedThisMonth.length
              }
            </p>

            <p className="mt-1 text-base font-extrabold text-emerald-800">
              {formatMoney(
                collectedMonthAmount
              )}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-600">
              Completed payments
            </p>
          </button>

          <div className="col-span-2 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm lg:col-span-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-slate-700">
                Pending This Month
              </p>

              <span className="text-xl">
                🕘
              </span>
            </div>

            <p className="mt-3 text-3xl font-extrabold text-blue-800">
              {pendingThisMonth.length}
            </p>

            <p className="mt-1 text-base font-extrabold text-slate-950">
              {formatMoney(
                pendingMonthAmount
              )}
            </p>

            <p className="mt-2 text-xs font-semibold text-slate-600">
              Remaining monthly EMI
            </p>
          </div>
        </div>

        {/* SEARCH + FILTER */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label
            htmlFor="emi-search"
            className="text-sm font-extrabold text-slate-900"
          >
            Search customer or policy
          </label>

          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-700">
              🔍
            </span>

            <input
              id="emi-search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search by name, mobile, customer ID, policy number..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-950 placeholder:font-medium placeholder:text-slate-600 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[
              [
                "MONTH",
                "This Month",
                monthInstallments.length,
              ],
              [
                "TODAY",
                "Due Today",
                dueToday.length,
              ],
              [
                "OVERDUE",
                "Overdue",
                overdue.length,
              ],
              [
                "COLLECTED",
                "Collected",
                collectedThisMonth.length,
              ],
            ].map(
              ([
                value,
                label,
                count,
              ]) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() =>
                    setFilter(
                      value as FilterType
                    )
                  }
                  className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                    filter === value
                      ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {String(label)}{" "}
                  <span
                    className={
                      filter ===
                      value
                        ? "text-white"
                        : "text-slate-700"
                    }
                  >
                    {String(count)}
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {/* MESSAGES */}

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            ✅ {successMessage}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* CUSTOMER TITLE */}

        <div className="mt-7 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">
              Customer EMI Accounts
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              {groupedCustomers.length}{" "}
              customer
              {groupedCustomers.length ===
              1
                ? ""
                : "s"}{" "}
              •{" "}
              {
                filteredInstallments.length
              }{" "}
              installment
              {filteredInstallments.length ===
              1
                ? ""
                : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              user.id &&
              loadPolicies(user.id)
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm md:hidden"
          >
            ↻ Refresh
          </button>
        </div>

        {dataLoading && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="text-3xl">
              💳
            </div>

            <p className="mt-3 font-extrabold text-slate-950">
              Loading EMI accounts...
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              Please wait
            </p>
          </div>
        )}{!dataLoading &&
          groupedCustomers.map((group) => {
            const customer = group.customer;

            const customerAllRows =
              getCustomerRows(customer);

            const customerFutureRows =
              getCustomerFutureRows(
                customer
              );

            const customerMonthRows =
              customerAllRows.filter(
                (item) =>
                  isSameMonth(
                    item.dueDate,
                    today
                  )
              );

            const customerMonthCollected =
              customerMonthRows.filter(
                (item) =>
                  getStatus(
                    item,
                    today
                  ) ===
                  "COLLECTED"
              );

            const customerMonthPending =
              customerMonthRows.filter(
                (item) =>
                  getStatus(
                    item,
                    today
                  ) !==
                  "COLLECTED"
              );

            const customerMonthPendingAmount =
              customerMonthPending.reduce(
                (total, item) =>
                  total +
                  numberValue(
                    item.amount
                  ),
                0
              );

            const customerOverdueRows =
              customerAllRows.filter(
                (item) =>
                  getStatus(
                    item,
                    today
                  ) ===
                  "OVERDUE"
              );

            const customerOverdueAmount =
              customerOverdueRows.reduce(
                (total, item) =>
                  total +
                  numberValue(
                    item.amount
                  ),
                0
              );

            const key = group.key;

            const isExpanded =
              expandedCustomers.has(
                key
              );

            const futureExpanded =
              showFutureCustomers.has(
                key
              );

            const phone =
              customer.phone || "";

            const whatsappPhone =
              normalizePhone(
                phone
              );

            return (
              <article
                key={key}
                className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                {/* CUSTOMER SUMMARY */}

                <button
                  type="button"
                  onClick={() =>
                    toggleCustomer(
                      key
                    )
                  }
                  className="w-full p-5 text-left transition hover:bg-slate-50 md:p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-extrabold text-white">
                          {String(
                            customer.name ||
                              "C"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-xl font-extrabold text-slate-950">
                              {customer.name ||
                                "Customer"}
                            </h3>

                            {customer.customerId && (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800">
                                {
                                  customer.customerId
                                }
                              </span>
                            )}
                          </div>

                          {phone && (
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              📱 {phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-bold text-slate-700">
                            This Month
                          </p>

                          <p className="mt-1 text-xl font-extrabold text-slate-950">
                            {
                              customerMonthRows.length
                            }
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                          <p className="text-xs font-bold text-emerald-800">
                            Collected
                          </p>

                          <p className="mt-1 text-xl font-extrabold text-emerald-800">
                            {
                              customerMonthCollected.length
                            }
                          </p>
                        </div>

                        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
                          <p className="text-xs font-bold text-orange-800">
                            Pending
                          </p>

                          <p className="mt-1 text-xl font-extrabold text-orange-800">
                            {
                              customerMonthPending.length
                            }
                          </p>
                        </div>

                        <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                          <p className="text-xs font-bold text-red-800">
                            Month Pending
                          </p>

                          <p className="mt-1 text-lg font-extrabold text-red-800">
                            {formatMoney(
                              customerMonthPendingAmount
                            )}
                          </p>
                        </div>
                      </div>

                      {customerOverdueRows.length >
                        0 && (
                        <div className="mt-3 inline-flex rounded-xl border border-red-300 bg-red-100 px-3 py-2 text-xs font-extrabold text-red-800">
                          ⚠️{" "}
                          {
                            customerOverdueRows.length
                          }{" "}
                          overdue •{" "}
                          {formatMoney(
                            customerOverdueAmount
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 xl:justify-end">
                      <div className="hidden text-right sm:block">
                        <p className="text-xs font-bold text-slate-600">
                          Future EMI
                        </p>

                        <p className="mt-1 text-lg font-extrabold text-slate-950">
                          {
                            customerFutureRows.length
                          }
                        </p>
                      </div>

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm transition ${
                          isExpanded
                            ? "rotate-180"
                            : ""
                        }`}
                      >
                        ▼
                      </div>
                    </div>
                  </div>
                </button>

                {/* EXPANDED CUSTOMER */}

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/80 p-4 md:p-5">
                    {/* CUSTOMER ACTIONS */}

                    <div className="mb-4 flex flex-wrap gap-2">
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-800"
                        >
                          📞 Call
                        </a>
                      )}

                      {whatsappPhone && (
                        <a
                          href={`https://wa.me/${whatsappPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white"
                        >
                          WhatsApp
                        </a>
                      )}

                      {customer.id && (
                        <Link
                          href={`/customers/${customer.id}`}
                          className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-extrabold text-blue-800"
                        >
                          View Customer
                        </Link>
                      )}
                    </div>

                    {/* CURRENT FILTER INSTALLMENTS */}

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="font-extrabold text-slate-950">
                            {filter ===
                            "MONTH"
                              ? `${monthName} Installments`
                              : filter ===
                                "TODAY"
                              ? "Due Today"
                              : filter ===
                                "OVERDUE"
                              ? "Overdue Installments"
                              : "Collected This Month"}
                          </h4>

                          <p className="mt-0.5 text-xs font-semibold text-slate-700">
                            {
                              group.rows.length
                            }{" "}
                            installment
                            {group.rows.length ===
                            1
                              ? ""
                              : "s"}{" "}
                            shown
                          </p>
                        </div>

                        {customerFutureRows.length >
                          0 && (
                          <button
                            type="button"
                            onClick={() =>
                              toggleFuture(
                                key
                              )
                            }
                            className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-extrabold text-slate-900 shadow-sm sm:self-auto"
                          >
                            {futureExpanded
                              ? "Hide Future EMIs ▲"
                              : `Show Future EMIs (${customerFutureRows.length}) ▼`}
                          </button>
                        )}
                      </div>

                      <div className="divide-y divide-slate-200">
                        {group.rows.map(
                          (item) => {
                            const status =
                              getStatus(
                                item,
                                today
                              );

                            return (
                              <div
                                key={
                                  item.id
                                }
                                className="p-4 md:p-5"
                              >
                                <div className="grid gap-4 lg:grid-cols-[110px_150px_140px_1fr_auto] lg:items-center">
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                      Installment
                                    </p>

                                    <p className="mt-1 text-lg font-extrabold text-slate-950">
                                      #
                                      {
                                        item.installmentNumber
                                      }
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                      Due Date
                                    </p>

                                    <p
                                      className={`mt-1 font-extrabold ${
                                        status ===
                                        "OVERDUE"
                                          ? "text-red-800"
                                          : status ===
                                            "TODAY"
                                          ? "text-orange-800"
                                          : "text-slate-950"
                                      }`}
                                    >
                                      {formatDate(
                                        item.dueDate
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                      EMI Amount
                                    </p>

                                    <p className="mt-1 font-extrabold text-slate-950">
                                      {formatMoney(
                                        item.amount
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                      Policy
                                    </p>

                                    <p className="mt-1 font-extrabold text-slate-950">
                                      {item
                                        .policy
                                        .policyNumber ||
                                        "-"}
                                    </p>

                                    <p className="mt-1 text-xs font-semibold text-slate-700">
                                      {[
                                        item
                                          .policy
                                          .companyName,
                                        item
                                          .policy
                                          .productName,
                                      ]
                                        .filter(
                                          Boolean
                                        )
                                        .join(
                                          " • "
                                        ) ||
                                        "Policy details"}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                    <span
                                      className={`rounded-lg border px-3 py-1.5 text-xs font-extrabold ${statusClass(
                                        status
                                      )}`}
                                    >
                                      {statusLabel(
                                        status
                                      )}
                                    </span>

                                    {status !==
                                      "COLLECTED" && (
                                      <>
                                        <button
                                          type="button"
                                          disabled={
                                            collectingId ===
                                            item.id
                                          }
                                          onClick={() =>
                                            markCollected(
                                              item
                                            )
                                          }
                                          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                                        >
                                          {collectingId ===
                                          item.id
                                            ? "Saving..."
                                            : "✓ Collect"}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            openFollowUp(
                                              item
                                            )
                                          }
                                          className="rounded-lg border border-orange-300 bg-orange-100 px-3 py-2 text-xs font-extrabold text-orange-900"
                                        >
                                          Follow-up
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {status ===
                                  "COLLECTED" && (
                                  <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-extrabold text-emerald-800">
                                    ✅ Collected{" "}
                                    {formatMoney(
                                      item.collectedAmount ||
                                        item.amount
                                    )}
                                    {item.collectedDate
                                      ? ` on ${formatDate(
                                          item.collectedDate
                                        )}`
                                      : ""}
                                  </div>
                                )}

                                {item.remarks && (
                                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">
                                    <strong>
                                      Remarks:
                                    </strong>{" "}
                                    {
                                      item.remarks
                                    }
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* FUTURE EMI - HIDDEN UNTIL BUTTON CLICK */}

                    {futureExpanded &&
                      customerFutureRows.length >
                        0 && (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-blue-300 bg-white">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3">
                            <div>
                              <h4 className="font-extrabold text-blue-950">
                                Future EMI Schedule
                              </h4>

                              <p className="mt-0.5 text-xs font-semibold text-blue-800">
                                Not included in
                                this month&apos;s
                                total
                              </p>
                            </div>

                            <span className="rounded-lg bg-blue-200 px-3 py-1.5 text-xs font-extrabold text-blue-900">
                              {
                                customerFutureRows.length
                              }{" "}
                              upcoming
                            </span>
                          </div>

                          <div className="divide-y divide-slate-200">
                            {customerFutureRows.map(
                              (item) => (
                                <div
                                  key={
                                    item.id
                                  }
                                  className="grid gap-4 bg-white p-4 md:grid-cols-[100px_160px_140px_1fr] md:items-center"
                                >
                                  <div>
                                    <p className="text-xs font-bold uppercase text-slate-700">
                                      EMI
                                    </p>

                                    <p className="mt-1 font-extrabold text-slate-950">
                                      #
                                      {
                                        item.installmentNumber
                                      }
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold uppercase text-slate-700">
                                      Due Date
                                    </p>

                                    <p className="mt-1 font-extrabold text-slate-950">
                                      {formatDate(
                                        item.dueDate
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-bold uppercase text-slate-700">
                                      Amount
                                    </p>

                                    <p className="mt-1 font-extrabold text-slate-950">
                                      {formatMoney(
                                        item.amount
                                      )}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-bold uppercase text-slate-700">
                                        Policy
                                      </p>

                                      <p className="mt-1 font-extrabold text-slate-950">
                                        {item
                                          .policy
                                          .policyNumber ||
                                          "-"}
                                      </p>

                                      <p className="mt-1 text-xs font-semibold text-slate-700">
                                        {[
                                          item
                                            .policy
                                            .companyName,
                                          item
                                            .policy
                                            .productName,
                                        ]
                                          .filter(
                                            Boolean
                                          )
                                          .join(
                                            " • "
                                          )}
                                      </p>
                                    </div>

                                    <span className="rounded-lg border border-blue-300 bg-blue-100 px-3 py-1.5 text-xs font-extrabold text-blue-900">
                                      Upcoming
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </article>
            );
          })}

        {/* EMPTY */}

        {!dataLoading &&
          !error &&
          groupedCustomers.length ===
            0 && (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">
                💳
              </div>

              <h3 className="mt-3 text-lg font-extrabold text-slate-950">
                No EMI installments found
              </h3>

              <p className="mt-2 text-sm font-semibold text-slate-700">
                Try another filter or search.
              </p>

              {(search ||
                filter !==
                  "MONTH") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter(
                      "MONTH"
                    );
                  }}
                  className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-extrabold text-white"
                >
                  Back to This Month
                </button>
              )}
            </div>
          )}
      </section>

      {/* FOLLOW-UP MODAL */}

      {followUpForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                  EMI Collection
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                  Follow-up
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  Installment #
                  {followUpForm
                    .installment
                    .installmentNumber ||
                    "-"}{" "}
                  •{" "}
                  {formatMoney(
                    followUpForm
                      .installment.amount
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFollowUpForm(
                    null
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-extrabold text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              <label className="text-sm font-extrabold text-slate-900">
                Follow-up Comment *
              </label>

              <textarea
                rows={4}
                value={
                  followUpForm.comment
                }
                onChange={(event) =>
                  setFollowUpForm({
                    ...followUpForm,
                    comment:
                      event.target
                        .value,
                  })
                }
                placeholder="Example: Customer promised payment tomorrow."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-extrabold text-slate-900">
                  Follow-up Date *
                </label>

                <input
                  type="date"
                  value={
                    followUpForm
                      .followUpDate
                  }
                  onChange={(event) =>
                    setFollowUpForm({
                      ...followUpForm,
                      followUpDate:
                        event.target
                          .value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950"
                />
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-900">
                  Next Follow-up
                </label>

                <input
                  type="date"
                  value={
                    followUpForm
                      .nextFollowUpDate
                  }
                  onChange={(event) =>
                    setFollowUpForm({
                      ...followUpForm,
                      nextFollowUpDate:
                        event.target
                          .value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setFollowUpForm(
                    null
                  )
                }
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-extrabold text-slate-900"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  followUpSaving
                }
                onClick={
                  saveFollowUp
                }
                className="flex-1 rounded-xl bg-blue-700 px-4 py-3 font-extrabold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {followUpSaving
                  ? "Saving..."
                  : "Save Follow-up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-300 bg-white shadow-lg md:hidden">
        <div className="grid h-16 grid-cols-5">
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center font-semibold text-slate-700"
          >
            <span>🏠</span>
            <span className="text-xs">
              Home
            </span>
          </Link>

          <Link
            href="/enquiries"
            className="flex flex-col items-center justify-center font-semibold text-slate-700"
          >
            <span>📥</span>
            <span className="text-xs">
              Enquiry
            </span>
          </Link>

          <Link
            href="/customers/add"
            className="flex flex-col items-center justify-center"
          >
            <div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-2xl font-bold text-white shadow-lg">
              +
            </div>

            <span className="text-xs font-semibold text-slate-700">
              Add
            </span>
          </Link>

          <Link
            href="/emi"
            className="flex flex-col items-center justify-center font-extrabold text-blue-800"
          >
            <span>💳</span>
            <span className="text-xs">
              EMI
            </span>
          </Link>

          <Link
            href="/profile"
            className="flex flex-col items-center justify-center font-semibold text-slate-700"
          >
            <span>👤</span>
            <span className="text-xs">
              Profile
            </span>
          </Link>
        </div>
      </nav>
    </main>
  );
}