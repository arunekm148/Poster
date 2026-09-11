"use client";

import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type StaffRole =
  | "STAFF"
  | "SUPERVISOR";

type WorkMode =
  | "OFFICE"
  | "WORK_FROM_HOME"
  | "HYBRID"
  | "FIELD";

type Supervisor = {
  id: string;
  staffCode?: string;
  name?: string;
  staffRole?: string;
  isActive?: boolean;
};

type Office = {
  id: string;
  code: string;
  name: string;
  isHeadOffice?: boolean;
  isActive?: boolean;
};

function getLoggedInUserId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const direct =
    localStorage.getItem(
      "userId"
    );

  if (direct?.trim()) {
    return direct.trim();
  }

  for (
    const key of [
      "agentUser",
      "user",
    ]
  ) {
    const stored =
      localStorage.getItem(
        key
      );

    if (!stored) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          stored
        );

      const id =
        String(
          parsed?.userId ||
            parsed?.id ||
            ""
        ).trim();

      if (id) {
        return id;
      }
    } catch {
      //
    }
  }

  return "";
}

function todayForInput() {
  const now =
    new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function AddStaffPage() {
  const router =
    useRouter();

  const [
    userId,
    setUserId,
  ] =
    useState("");

  const [
    offices,
    setOffices,
  ] =
    useState<Office[]>([]);

  const [
    officeId,
    setOfficeId,
  ] =
    useState("");

  const [
    staffCode,
    setStaffCode,
  ] =
    useState("");

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    phone,
    setPhone,
  ] =
    useState("");

  const [
    whatsapp,
    setWhatsapp,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    staffRole,
    setStaffRole,
  ] =
    useState<StaffRole>(
      "STAFF"
    );

  const [
    workMode,
    setWorkMode,
  ] =
    useState<WorkMode>(
      "OFFICE"
    );

  const [
    designation,
    setDesignation,
  ] =
    useState("");

  const [
    department,
    setDepartment,
  ] =
    useState("");

  const [
    supervisorId,
    setSupervisorId,
  ] =
    useState("");

  const [
    supervisors,
    setSupervisors,
  ] =
    useState<
      Supervisor[]
    >([]);

  const [
    joiningDate,
    setJoiningDate,
  ] =
    useState(
      todayForInput()
    );

  const [
    address,
    setAddress,
  ] =
    useState("");

  const [
    district,
    setDistrict,
  ] =
    useState("");

  const [
    state,
    setState,
  ] =
    useState("");

  const [
    pincode,
    setPincode,
  ] =
    useState("");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    loginEnabled,
    setLoginEnabled,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    const activeUserId =
      getLoggedInUserId();

    if (!activeUserId) {
      setError(
        "Logged-in Agent information was not found."
      );
      return;
    }

    setUserId(
      activeUserId
    );

    async function load() {
      try {
        const [
          staffResponse,
          officeResponse,
        ] =
          await Promise.all([
            fetch(
              `/api/staff?userId=${encodeURIComponent(
                activeUserId
              )}`,
              {
                cache: "no-store",
              }
            ),

            fetch(
              `/api/staff/offices?userId=${encodeURIComponent(
                activeUserId
              )}`,
              {
                cache: "no-store",
              }
            ),
          ]);

        const staffJson =
          await staffResponse.json();

        const officeJson =
          await officeResponse.json();

        if (
          Array.isArray(
            staffJson.staff
          )
        ) {
          setSupervisors(
            staffJson.staff.filter(
              (
                item:
                  Supervisor
              ) =>
                item.isActive !==
                  false &&
                item.staffRole ===
                  "SUPERVISOR"
            )
          );
        }

        if (
          Array.isArray(
            officeJson.offices
          )
        ) {
          const active =
            officeJson.offices.filter(
              (
                item:
                  Office
              ) =>
                item.isActive !==
                false
            );

          setOffices(active);

          const head =
            active.find(
              (
                item:
                  Office
              ) =>
                item.isHeadOffice
            );

          if (head) {
            setOfficeId(
              head.id
            );
          }
        }
      } catch {
        //
      }
    }

    void load();
  }, []);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (
        (workMode ===
          "OFFICE" ||
          workMode ===
            "HYBRID") &&
        !officeId
      ) {
        throw new Error(
          "Please select an office."
        );
      }

      const response =
        await fetch(
          "/api/staff",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId,

                officeId:
                  officeId ||
                  null,

                staffCode,
                name,
                phone,
                whatsapp,
                email,
                password,

                staffRole,
                workMode,

                supervisorId:
                  staffRole ===
                  "SUPERVISOR"
                    ? null
                    : supervisorId ||
                      null,

                designation,
                department,

                joiningDate,

                address,
                district,
                state,
                pincode,

                notes,

                loginEnabled,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.success ===
          false
      ) {
        throw new Error(
          data.message ||
            "Unable to create staff."
        );
      }

      router.push(
        "/staff"
      );

      router.refresh();
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create staff."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">

          <div className="flex items-center gap-3">

            <Link
              href="/staff"
              className="flex h-11 w-11 items-center justify-center rounded-xl border font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                Team Management
              </p>

              <h1 className="text-2xl font-black">
                Add Staff
              </h1>

            </div>

          </div>

          <Link
            href="/staff/offices"
            className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-cyan-800"
          >
            + Add Office
          </Link>

        </div>

      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5"
        >

          <div className="grid gap-5 lg:grid-cols-2">

            <SectionCard
              title="👤 Staff Information"
              description="Basic staff, reporting and office assignment."
            >

              <div className="space-y-4">

                <Field label="Staff Code *">
                  <input
                    value={
                      staffCode
                    }
                    onChange={(
                      e
                    ) =>
                      setStaffCode(
                        e.target.value.toUpperCase()
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Staff Name *">
                  <input
                    value={
                      name
                    }
                    onChange={(
                      e
                    ) =>
                      setName(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Mobile Number *">
                  <input
                    value={
                      phone
                    }
                    maxLength={10}
                    onChange={(
                      e
                    ) =>
                      setPhone(
                        e.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            10
                          )
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="WhatsApp Number">
                  <input
                    value={
                      whatsapp
                    }
                    maxLength={10}
                    onChange={(
                      e
                    ) =>
                      setWhatsapp(
                        e.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(
                            0,
                            10
                          )
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={
                      email
                    }
                    onChange={(
                      e
                    ) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Staff Role *">
                  <select
                    value={
                      staffRole
                    }
                    onChange={(
                      e
                    ) =>
                      setStaffRole(
                        e.target
                          .value as StaffRole
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="STAFF">
                      Staff
                    </option>

                    <option value="SUPERVISOR">
                      Supervisor
                    </option>
                  </select>
                </Field>

                <Field label="Work Mode *">
                  <select
                    value={
                      workMode
                    }
                    onChange={(
                      e
                    ) =>
                      setWorkMode(
                        e.target
                          .value as WorkMode
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="OFFICE">
                      Office
                    </option>

                    <option value="WORK_FROM_HOME">
                      Work From Home
                    </option>

                    <option value="HYBRID">
                      Hybrid — Office / Home / Field
                    </option>

                    <option value="FIELD">
                      Field / Out Duty
                    </option>
                  </select>
                </Field>

                <Field
                  label={
                    workMode ===
                      "OFFICE" ||
                    workMode ===
                      "HYBRID"
                      ? "Assigned Office *"
                      : "Assigned Office"
                  }
                >
                  <select
                    value={
                      officeId
                    }
                    onChange={(
                      e
                    ) =>
                      setOfficeId(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option value="">
                      Select Office
                    </option>

                    {offices.map(
                      (
                        office
                      ) => (
                        <option
                          key={
                            office.id
                          }
                          value={
                            office.id
                          }
                        >
                          {office.code} -{" "}
                          {office.name}
                          {office.isHeadOffice
                            ? " (Main Branch)"
                            : ""}
                        </option>
                      )
                    )}
                  </select>

                  <div className="mt-3 flex flex-wrap items-center gap-3">

                    {!offices.length && (
                      <p className="text-xs font-bold text-red-600">
                        No office found. Create an office first.
                      </p>
                    )}

                    <Link
                      href="/staff/offices"
                      className="inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-cyan-800"
                    >
                      + Add Office
                    </Link>

                  </div>
                </Field>

                <Field label="Supervisor">
                  <select
                    value={
                      supervisorId
                    }
                    disabled={
                      staffRole ===
                      "SUPERVISOR"
                    }
                    onChange={(
                      e
                    ) =>
                      setSupervisorId(
                        e.target.value
                      )
                    }
                    className={`${inputClass} disabled:bg-slate-100`}
                  >
                    <option value="">
                      No Supervisor
                    </option>

                    {supervisors.map(
                      (
                        item
                      ) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {item.staffCode} -{" "}
                          {item.name}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field label="Designation">
                  <input
                    value={
                      designation
                    }
                    onChange={(
                      e
                    ) =>
                      setDesignation(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Department">
                  <input
                    value={
                      department
                    }
                    onChange={(
                      e
                    ) =>
                      setDepartment(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

              </div>

            </SectionCard>

            <SectionCard
              title="🔐 Login & Address"
              description="Login and contact information."
            >

              <div className="space-y-4">

                <Field label="Login Password">

                  <div className="flex gap-2">

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        e
                      ) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      className={`${inputClass} flex-1`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      className="rounded-xl border px-4 font-black"
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>

                  </div>

                </Field>

                <label className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">

                  <input
                    type="checkbox"
                    checked={
                      loginEnabled
                    }
                    onChange={(
                      e
                    ) =>
                      setLoginEnabled(
                        e.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                  <span className="font-black">
                    Enable Staff Login
                  </span>

                </label>

                <Field label="Joining Date">
                  <input
                    type="date"
                    value={
                      joiningDate
                    }
                    onChange={(
                      e
                    ) =>
                      setJoiningDate(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Address">
                  <textarea
                    rows={3}
                    value={
                      address
                    }
                    onChange={(
                      e
                    ) =>
                      setAddress(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="District">
                  <input
                    value={
                      district
                    }
                    onChange={(
                      e
                    ) =>
                      setDistrict(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="State">
                  <input
                    value={
                      state
                    }
                    onChange={(
                      e
                    ) =>
                      setState(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Pincode">
                  <input
                    value={
                      pincode
                    }
                    maxLength={6}
                    onChange={(
                      e
                    ) =>
                      setPincode(
                        e.target.value
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
                    className={
                      inputClass
                    }
                  />
                </Field>

                <Field label="Notes">
                  <textarea
                    rows={3}
                    value={
                      notes
                    }
                    onChange={(
                      e
                    ) =>
                      setNotes(
                        e.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>

              </div>

            </SectionCard>

          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
              ⚠️ {error}
            </div>
          )}

          <div className="flex justify-end gap-3 rounded-2xl border bg-white p-4">

            <Link
              href="/staff"
              className="rounded-xl border px-6 py-3 font-black"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                saving
              }
              className="rounded-xl bg-blue-700 px-7 py-3 font-black text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Create Staff"}
            </button>

          </div>

        </form>

      </section>

    </main>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">

      <h2 className="text-lg font-black">
        {title}
      </h2>

      <p className="mb-5 mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>

      {children}

    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-black">
        {label}
      </label>

      {children}

    </div>
  );
}