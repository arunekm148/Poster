"use client";

import Link from "next/link";

const reports = [
  {
    href: "/reports/policies",
    icon: "📄",
    title: "Policy Reports",
    description:
      "Today, monthly, date range, Staff-wise, Sub-Agent-wise, policy type, company, premium and renewal business.",
  },
  {
    href: "/reports/companies",
    icon: "🏢",
    title: "Company Reports",
    description:
      "Insurance company-wise policy count, premium and product mix.",
  },
  {
    href: "/reports/customers",
    icon: "🧑‍💼",
    title: "Customer Reports",
    description:
      "Customer additions, policies, source and activity summaries.",
  },
  {
    href: "/reports/renewals",
    icon: "🔁",
    title: "Renewal Reports",
    description:
      "Due today, next 7 days, next 30 days, overdue and renewed policies.",
  },
  {
    href: "/reports/attendance",
    icon: "🕘",
    title: "Attendance Reports",
    description:
      "Daily and monthly Staff attendance, late, absent, leave and working time.",
  },
  {
    href: "/reports/enquiries",
    icon: "📞",
    title: "Enquiry Reports",
    description:
      "Enquiries, follow-ups, conversions and Staff/Sub-Agent performance.",
  },
  {
    href: "/reports/income",
    icon: "₹",
    title: "Income Reports",
    description:
      "Premium, commission, margin and business income analysis.",
  },
];

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16 text-slate-950">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white font-black shadow-sm transition hover:bg-slate-50"
            >
              ←
            </Link>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Management
              </p>

              <h1 className="text-2xl font-black">
                Reports
              </h1>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Business and operational reports.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        {/* HERO */}
        <div className="rounded-3xl bg-blue-800 p-6 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
            Agents India
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Complete Reports Centre
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-semibold text-blue-100">
            Policy, Staff-wise, Sub-Agent-wise, company,
            customer, renewal, attendance, enquiry and
            income reporting from one place.
          </p>
        </div>

        {/* REPORT CARDS */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <Link
              key={report.href}
              href={report.href}
              className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl transition group-hover:bg-blue-50">
                {report.icon}
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-950">
                {report.title}
              </h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {report.description}
              </p>

              <p className="mt-4 text-xs font-black text-blue-700">
                Open Report →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}