"use client";

import Link from "next/link";
import { useState } from "react";

type Period =
  | "TODAY"
  | "MONTH"
  | "CUSTOM";

function indiaToday() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

export default function StaffReportsPage() {
  const today =
    indiaToday();

  const [period, setPeriod] =
    useState<Period>("TODAY");

  const [fromDate, setFromDate] =
    useState(today);

  const [toDate, setToDate] =
    useState(today);

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-5">
          <Link
            href="/reports"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 font-black"
          >
            ←
          </Link>

          <div>
            <p className="text-xs font-black uppercase text-blue-700">
              Reports
            </p>

            <h1 className="text-2xl font-black">
              Staff Reports
            </h1>

            <p className="text-sm font-semibold text-slate-500">
              Staff-wise business and productivity report.
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">
            Report Period
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterButton
              active={period === "TODAY"}
              onClick={() =>
                setPeriod("TODAY")
              }
            >
              Today
            </FilterButton>

            <FilterButton
              active={period === "MONTH"}
              onClick={() =>
                setPeriod("MONTH")
              }
            >
              This Month
            </FilterButton>

            <FilterButton
              active={period === "CUSTOM"}
              onClick={() =>
                setPeriod("CUSTOM")
              }
            >
              Custom Range
            </FilterButton>
          </div>

          {period === "CUSTOM" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-300 px-4 py-2"
              />

              <input
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-300 px-4 py-2"
              />
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card
            title="Active Staff"
            value="—"
          />

          <Card
            title="Policies"
            value="—"
          />

          <Card
            title="Premium"
            value="—"
          />

          <Card
            title="Renewals"
            value="—"
          />

          <Card
            title="Customers"
            value="—"
          />

          <Card
            title="New Business"
            value="—"
          />

          <Card
            title="Present"
            value="—"
          />

          <Card
            title="Late"
            value="—"
          />
        </div>

        <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-black">
            Staff-wise Business
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            Each Staff member will show policy count, premium,
            renewals, customers, enquiries, attendance and conversion
            performance here.
          </p>
        </div>
      </section>
    </main>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-xs font-black ${
        active
          ? "bg-blue-700 text-white"
          : "border border-slate-300 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}