"use client";

import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type StaffRole =
  | "STAFF"
  | "SUPERVISOR";

type Supervisor = {
  id: string;
  staffCode?: string;
  name?: string;
  staffRole?: string;
  designation?: string | null;
  isActive?: boolean;
};

type StaffApiResponse = {
  success?: boolean;
  message?: string;
  staff?: Supervisor[];
};

type AccessLevel =
  | "NONE"
  | "VIEW"
  | "EDIT"
  | "FULL";

type PermissionGroupKey =
  | "CUSTOMERS"
  | "ENQUIRIES"
  | "FOLLOW_UPS"
  | "POLICIES"
  | "RENEWALS"
  | "SUB_AGENTS"
  | "ATTENDANCE"
  | "MANAGEMENT";

type PermissionLevels = Record<
  PermissionGroupKey,
  AccessLevel
>;

type PermissionGroup = {
  key: PermissionGroupKey;
  title: string;
  icon: string;
  description: string;
};

/* -------------------------------------------------------------------------- */
/* SIMPLE PERMISSION GROUPS                                                   */
/* -------------------------------------------------------------------------- */

const permissionGroups: PermissionGroup[] = [
  {
    key: "CUSTOMERS",
    title: "Customers & Leads",
    icon: "👥",
    description:
      "Customer records, telecalling and customer follow-up.",
  },
  {
    key: "ENQUIRIES",
    title: "Enquiries",
    icon: "📞",
    description:
      "View, create and update enquiries.",
  },
  {
    key: "FOLLOW_UPS",
    title: "Follow-Ups",
    icon: "📅",
    description:
      "Manage customer and enquiry follow-ups.",
  },
  {
    key: "POLICIES",
    title: "Policies",
    icon: "📄",
    description:
      "View, create and edit policy records.",
  },
  {
    key: "RENEWALS",
    title: "Renewals",
    icon: "🔄",
    description:
      "Renewal calling, follow-up and record updates.",
  },
  {
    key: "SUB_AGENTS",
    title: "Sub Agents",
    icon: "🤝",
    description:
      "View and manage assigned sub-agents.",
  },
  {
    key: "ATTENDANCE",
    title: "Attendance",
    icon: "🕒",
    description:
      "Staff attendance access, history and requests.",
  },
  {
    key: "MANAGEMENT",
    title: "Management",
    icon: "⚙️",
    description:
      "Work assignment, staff performance and team management.",
  },
];

/* -------------------------------------------------------------------------- */
/* DEFAULT ACCESS                                                             */
/* -------------------------------------------------------------------------- */

const staffDefaultAccess: PermissionLevels = {
  CUSTOMERS: "EDIT",
  ENQUIRIES: "EDIT",
  FOLLOW_UPS: "EDIT",
  POLICIES: "VIEW",
  RENEWALS: "EDIT",
  SUB_AGENTS: "NONE",
  ATTENDANCE: "FULL",
  MANAGEMENT: "NONE",
};

const supervisorDefaultAccess: PermissionLevels = {
  CUSTOMERS: "FULL",
  ENQUIRIES: "FULL",
  FOLLOW_UPS: "FULL",
  POLICIES: "FULL",
  RENEWALS: "FULL",
  SUB_AGENTS: "EDIT",
  ATTENDANCE: "FULL",
  MANAGEMENT: "FULL",
};

/* -------------------------------------------------------------------------- */
/* ACCESS LABELS                                                              */
/* -------------------------------------------------------------------------- */

const accessLevelLabels: Record<
  AccessLevel,
  string
> = {
  NONE: "No Access",
  VIEW: "View Only",
  EDIT: "View + Add/Edit",
  FULL: "Full Access",
};

/* -------------------------------------------------------------------------- */
/* LEGACY PERMISSION MAPPING                                                  */
/* -------------------------------------------------------------------------- */

/*
 * The current project already uses detailed permission keys in some places.
 * This mapping keeps the new simple UI compatible with those existing keys.
 *
 * IMPORTANT:
 * The current /api/staff POST route you shared does not yet save permissions
 * to the database. The payload below still sends them so the API can be
 * connected to storage next without changing this page again.
 */

function buildLegacyPermissions(
  levels: PermissionLevels
): string[] {
  const permissions: string[] = [];

  function add(
    ...keys: string[]
  ) {
    permissions.push(...keys);
  }

  /* CUSTOMERS */

  if (
    levels.CUSTOMERS === "VIEW"
  ) {
    add(
      "VIEW_ASSIGNED_CUSTOMERS"
    );
  }

  if (
    levels.CUSTOMERS === "EDIT"
  ) {
    add(
      "TELECALLING",
      "VIEW_ASSIGNED_CUSTOMERS",
      "CUSTOMER_FOLLOW_UP"
    );
  }

  if (
    levels.CUSTOMERS === "FULL"
  ) {
    add(
      "TELECALLING",
      "VIEW_ASSIGNED_CUSTOMERS",
      "CUSTOMER_FOLLOW_UP",
      "VIEW_ALL_CUSTOMERS"
    );
  }

  /* ENQUIRIES */

  if (
    levels.ENQUIRIES === "VIEW"
  ) {
    add(
      "VIEW_ENQUIRIES",
      "ASSIGNED_ENQUIRIES_ONLY"
    );
  }

  if (
    levels.ENQUIRIES === "EDIT"
  ) {
    add(
      "VIEW_ENQUIRIES",
      "ADD_ENQUIRY",
      "EDIT_ENQUIRY",
      "ASSIGNED_ENQUIRIES_ONLY"
    );
  }

  if (
    levels.ENQUIRIES === "FULL"
  ) {
    add(
      "VIEW_ENQUIRIES",
      "ADD_ENQUIRY",
      "EDIT_ENQUIRY"
    );
  }

  /* FOLLOW UPS */

  if (
    levels.FOLLOW_UPS === "VIEW"
  ) {
    add(
      "VIEW_FOLLOW_UPS",
      "ASSIGNED_FOLLOW_UPS_ONLY"
    );
  }

  if (
    levels.FOLLOW_UPS === "EDIT"
  ) {
    add(
      "VIEW_FOLLOW_UPS",
      "ADD_FOLLOW_UP",
      "EDIT_FOLLOW_UP",
      "ASSIGNED_FOLLOW_UPS_ONLY"
    );
  }

  if (
    levels.FOLLOW_UPS === "FULL"
  ) {
    add(
      "VIEW_FOLLOW_UPS",
      "ADD_FOLLOW_UP",
      "EDIT_FOLLOW_UP"
    );
  }

  /* POLICIES */

  if (
    levels.POLICIES === "VIEW"
  ) {
    add(
      "VIEW_POLICIES"
    );
  }

  if (
    levels.POLICIES === "EDIT" ||
    levels.POLICIES === "FULL"
  ) {
    add(
      "VIEW_POLICIES",
      "CREATE_POLICY",
      "EDIT_POLICY"
    );
  }

  /* RENEWALS */

  if (
    levels.RENEWALS === "VIEW"
  ) {
    add(
      "VIEW_ALL_RENEWALS"
    );
  }

  if (
    levels.RENEWALS === "EDIT"
  ) {
    add(
      "RENEWAL_CALLING",
      "RENEWAL_FOLLOW_UP",
      "EDIT_RENEWAL"
    );
  }

  if (
    levels.RENEWALS === "FULL"
  ) {
    add(
      "RENEWAL_CALLING",
      "RENEWAL_FOLLOW_UP",
      "VIEW_ALL_RENEWALS",
      "EDIT_RENEWAL"
    );
  }

  /* SUB AGENTS */

  if (
    levels.SUB_AGENTS === "VIEW"
  ) {
    add(
      "VIEW_SUB_AGENTS"
    );
  }

  if (
    levels.SUB_AGENTS === "EDIT" ||
    levels.SUB_AGENTS === "FULL"
  ) {
    add(
      "VIEW_SUB_AGENTS",
      "ADD_SUB_AGENT",
      "EDIT_SUB_AGENT"
    );
  }

  /* ATTENDANCE */

  if (
    levels.ATTENDANCE !== "NONE"
  ) {
    add(
      "ATTENDANCE_ACCESS"
    );
  }

  /* MANAGEMENT */

  if (
    levels.MANAGEMENT === "VIEW"
  ) {
    add(
      "VIEW_STAFF_PERFORMANCE"
    );
  }

  if (
    levels.MANAGEMENT === "EDIT"
  ) {
    add(
      "ASSIGN_WORK",
      "REASSIGN_WORK",
      "VIEW_STAFF_PERFORMANCE"
    );
  }

  if (
    levels.MANAGEMENT === "FULL"
  ) {
    add(
      "ASSIGN_WORK",
      "REASSIGN_WORK",
      "VIEW_STAFF_PERFORMANCE",
      "MANAGE_STAFF"
    );
  }

  /* GENERAL STAFF COMMUNICATION ACCESS */

  if (
    levels.CUSTOMERS !== "NONE" ||
    levels.ENQUIRIES !== "NONE" ||
    levels.FOLLOW_UPS !== "NONE" ||
    levels.RENEWALS !== "NONE"
  ) {
    add(
      "WHATSAPP_ACCESS",
      "CALL_ACCESS"
    );
  }

  return Array.from(
    new Set(
      permissions
    )
  );
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

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

  if (
    direct?.trim()
  ) {
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
        localStorage.setItem(
          "userId",
          id
        );

        return id;
      }
    } catch {
      // Ignore invalid localStorage.
    }
  }

  return "";
}

function todayForInput() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function isSupervisorRecord(
  item: Supervisor
): boolean {
  if (
    String(
      item.staffRole ||
        ""
    ).toUpperCase() ===
    "SUPERVISOR"
  ) {
    return true;
  }

  return String(
    item.designation ||
      ""
  )
    .toLowerCase()
    .includes(
      "supervisor"
    );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AddStaffPage() {
  const router =
    useRouter();

  const [
    userId,
    setUserId,
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
    joiningDate,
    setJoiningDate,
  ] =
    useState(
      todayForInput()
    );

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
    accessLevels,
    setAccessLevels,
  ] =
    useState<PermissionLevels>(
      staffDefaultAccess
    );

  const [
    supervisors,
    setSupervisors,
  ] =
    useState<
      Supervisor[]
    >([]);

  const [
    loadingSupervisors,
    setLoadingSupervisors,
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

  /* ------------------------------------------------------------------------ */
  /* DERIVED PERMISSIONS                                                      */
  /* ------------------------------------------------------------------------ */

  const permissions =
    useMemo(
      () =>
        buildLegacyPermissions(
          accessLevels
        ),
      [
        accessLevels,
      ]
    );

  const enabledGroupCount =
    useMemo(
      () =>
        Object.values(
          accessLevels
        ).filter(
          (
            level
          ) =>
            level !==
            "NONE"
        ).length,
      [
        accessLevels,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* INITIAL LOAD                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const activeUserId =
      getLoggedInUserId();

    if (
      !activeUserId
    ) {
      setError(
        "Logged-in Agent information was not found. Please login again."
      );

      setLoadingSupervisors(
        false
      );

      return;
    }

    setUserId(
      activeUserId
    );

    void loadSupervisors(
      activeUserId
    );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOAD SUPERVISORS                                                         */
  /* ------------------------------------------------------------------------ */

  async function loadSupervisors(
    activeUserId: string
  ) {
    try {
      setLoadingSupervisors(
        true
      );

      const response =
        await fetch(
          `/api/staff?userId=${encodeURIComponent(
            activeUserId
          )}`,
          {
            cache:
              "no-store",

            credentials:
              "include",
          }
        );

      let data:
        StaffApiResponse = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        data.success ===
          false
      ) {
        throw new Error(
          data.message ||
            "Unable to load supervisors."
        );
      }

      const list =
        Array.isArray(
          data.staff
        )
          ? data.staff
          : [];

      setSupervisors(
        list.filter(
          (
            item
          ) =>
            item.isActive !==
              false &&
            isSupervisorRecord(
              item
            )
        )
      );
    } catch (
      err
    ) {
      console.error(
        "LOAD SUPERVISORS ERROR:",
        err
      );

      setSupervisors(
        []
      );
    } finally {
      setLoadingSupervisors(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ROLE CHANGE                                                              */
  /* ------------------------------------------------------------------------ */

  function handleRoleChange(
    value: StaffRole
  ) {
    setStaffRole(
      value
    );

    if (
      value ===
      "SUPERVISOR"
    ) {
      setSupervisorId(
        ""
      );

      setAccessLevels(
        supervisorDefaultAccess
      );

      return;
    }

    setAccessLevels(
      staffDefaultAccess
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ACCESS CHANGE                                                            */
  /* ------------------------------------------------------------------------ */

  function updateAccessLevel(
    key:
      PermissionGroupKey,
    level:
      AccessLevel
  ) {
    setAccessLevels(
      (
        current
      ) => ({
        ...current,

        [key]:
          level,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE                                                                     */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      saving
    ) {
      return;
    }

    try {
      setSaving(
        true
      );

      setError(
        ""
      );

      const activeUserId =
        userId ||
        getLoggedInUserId();

      if (
        !activeUserId
      ) {
        throw new Error(
          "Logged-in Agent information was not found."
        );
      }

      const cleanCode =
        staffCode
          .trim()
          .toUpperCase();

      const cleanName =
        name.trim();

      const cleanPhone =
        phone.replace(
          /\D/g,
          ""
        );

      const cleanWhatsapp =
        whatsapp.replace(
          /\D/g,
          ""
        );

      if (
        !cleanCode
      ) {
        throw new Error(
          "Staff code is required."
        );
      }

      if (
        !cleanName
      ) {
        throw new Error(
          "Staff name is required."
        );
      }

      if (
        !/^[6-9]\d{9}$/.test(
          cleanPhone
        )
      ) {
        throw new Error(
          "Please enter a valid 10 digit mobile number."
        );
      }

      if (
        loginEnabled &&
        password.length <
          6
      ) {
        throw new Error(
          "Password must contain at least 6 characters."
        );
      }

      if (
        cleanWhatsapp &&
        !/^[6-9]\d{9}$/.test(
          cleanWhatsapp
        )
      ) {
        throw new Error(
          "Please enter a valid WhatsApp number."
        );
      }

      if (
        pincode &&
        !/^\d{6}$/.test(
          pincode
        )
      ) {
        throw new Error(
          "Please enter a valid 6 digit pincode."
        );
      }

      if (
        accessLevels.ATTENDANCE ===
        "NONE"
      ) {
        throw new Error(
          "Attendance access should remain enabled for staff login."
        );
      }

      const payload = {
        userId:
          activeUserId,

        staffCode:
          cleanCode,

        name:
          cleanName,

        phone:
          cleanPhone,

        whatsapp:
          cleanWhatsapp ||
          null,

        email:
          email
            .trim()
            .toLowerCase() ||
          null,

        password,

        staffRole,

        designation:
          designation.trim() ||
          null,

        department:
          department.trim() ||
          null,

        supervisorId:
          staffRole ===
          "SUPERVISOR"
            ? null
            : supervisorId ||
              null,

        address:
          address.trim() ||
          null,

        district:
          district.trim() ||
          null,

        state:
          state.trim() ||
          null,

        pincode:
          pincode.trim() ||
          null,

        joiningDate:
          joiningDate ||
          null,

        notes:
          notes.trim() ||
          null,

        loginEnabled,

        /*
         * Simple access levels for the
         * new permission UI.
         */
        permissionLevels:
          accessLevels,

        /*
         * Existing permission keys kept
         * for backward compatibility.
         */
        permissions,
      };

      const response =
        await fetch(
          "/api/staff",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

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
      err
    ) {
      console.error(
        "CREATE STAFF ERROR:",
        err
      );

      setError(
        err instanceof
        Error
          ? err.message
          : "Unable to create staff."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white shadow-sm">

        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5">

          <Link
            href="/staff"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-black"
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

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Create staff login, reporting hierarchy and simple work access.
            </p>

          </div>

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

            {/* STAFF INFORMATION */}

            <SectionCard
              title="👤 Staff Information"
              description="Basic staff and reporting information."
            >

              <div className="space-y-4">

                <Field label="Staff Code *">

                  <input
                    value={
                      staffCode
                    }
                    onChange={(
                      event
                    ) =>
                      setStaffCode(
                        event.target.value
                          .toUpperCase()
                      )
                    }
                    placeholder="Example: STF001"
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
                      event
                    ) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Enter staff name"
                    className={
                      inputClass
                    }
                  />

                </Field>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field label="Mobile Number *">

                    <input
                      inputMode="numeric"
                      maxLength={10}
                      value={
                        phone
                      }
                      onChange={(
                        event
                      ) =>
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
                        )
                      }
                      placeholder="10 digit mobile"
                      className={
                        inputClass
                      }
                    />

                  </Field>

                  <Field label="WhatsApp Number">

                    <input
                      inputMode="numeric"
                      maxLength={10}
                      value={
                        whatsapp
                      }
                      onChange={(
                        event
                      ) =>
                        setWhatsapp(
                          event.target.value
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
                      placeholder="Optional"
                      className={
                        inputClass
                      }
                    />

                  </Field>

                </div>

                <Field label="Email">

                  <input
                    type="email"
                    value={
                      email
                    }
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="Optional"
                    className={
                      inputClass
                    }
                  />

                </Field>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field label="Staff Role *">

                    <select
                      value={
                        staffRole
                      }
                      onChange={(
                        event
                      ) =>
                        handleRoleChange(
                          event.target
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

                  <Field label="Supervisor">

                    <select
                      value={
                        supervisorId
                      }
                      onChange={(
                        event
                      ) =>
                        setSupervisorId(
                          event.target.value
                        )
                      }
                      disabled={
                        staffRole ===
                        "SUPERVISOR"
                      }
                      className={`${inputClass} disabled:bg-slate-100`}
                    >

                      <option value="">
                        {staffRole ===
                        "SUPERVISOR"
                          ? "Not required"
                          : "No Supervisor"}
                      </option>

                      {supervisors.map(
                        (
                          supervisor
                        ) => (
                          <option
                            key={
                              supervisor.id
                            }
                            value={
                              supervisor.id
                            }
                          >
                            {supervisor.staffCode
                              ? `${supervisor.staffCode} - `
                              : ""}
                            {supervisor.name}
                          </option>
                        )
                      )}

                    </select>

                    {loadingSupervisors && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Loading supervisors...
                      </p>
                    )}

                  </Field>

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <Field label="Designation">

                    <input
                      value={
                        designation
                      }
                      onChange={(
                        event
                      ) =>
                        setDesignation(
                          event.target.value
                        )
                      }
                      placeholder="Sales Executive"
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
                        event
                      ) =>
                        setDepartment(
                          event.target.value
                        )
                      }
                      placeholder="Sales / Renewal"
                      className={
                        inputClass
                      }
                    />

                  </Field>

                </div>

              </div>

            </SectionCard>

            {/* LOGIN */}

            <SectionCard
              title="🔐 Login & Office"
              description="Staff login and basic office information."
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
                        event
                      ) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      minLength={6}
                      placeholder={
                        loginEnabled
                          ? "Minimum 6 characters"
                          : "Not required when login is disabled"
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
                      className="rounded-xl border border-slate-300 bg-white px-4 font-black"
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>

                  </div>

                </Field>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                  <input
                    type="checkbox"
                    checked={
                      loginEnabled
                    }
                    onChange={(
                      event
                    ) =>
                      setLoginEnabled(
                        event.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                  <div>

                    <p className="font-black text-emerald-900">
                      Enable Staff Login
                    </p>

                    <p className="text-xs font-semibold text-emerald-700">
                      Staff can login using mobile number and password.
                    </p>

                  </div>

                </label>

                <Field label="Joining Date">

                  <input
                    type="date"
                    value={
                      joiningDate
                    }
                    onChange={(
                      event
                    ) =>
                      setJoiningDate(
                        event.target.value
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
                      event
                    ) =>
                      setAddress(
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />

                </Field>

                <div className="grid gap-4 sm:grid-cols-3">

                  <Field label="District">

                    <input
                      value={
                        district
                      }
                      onChange={(
                        event
                      ) =>
                        setDistrict(
                          event.target.value
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
                        event
                      ) =>
                        setState(
                          event.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                    />

                  </Field>

                  <Field label="Pincode">

                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={
                        pincode
                      }
                      onChange={(
                        event
                      ) =>
                        setPincode(
                          event.target.value
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

                </div>

                <Field label="Notes">

                  <textarea
                    rows={3}
                    value={
                      notes
                    }
                    onChange={(
                      event
                    ) =>
                      setNotes(
                        event.target.value
                      )
                    }
                    placeholder="Optional internal notes"
                    className={
                      inputClass
                    }
                  />

                </Field>

              </div>

            </SectionCard>

          </div>

          {/* SIMPLE ACCESS */}

          <SectionCard
            title="🔒 Work Access"
            description="Choose one simple access level for each work area."
          >

            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>

                  <p className="font-black text-blue-950">
                    {staffRole ===
                    "SUPERVISOR"
                      ? "Supervisor Access"
                      : "Staff Access"}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    Agent data remains isolated. Management access is normally disabled for regular staff.
                  </p>

                </div>

                <div className="rounded-full bg-blue-700 px-4 py-2 text-sm font-black text-white">
                  {enabledGroupCount} of 8 Areas
                </div>

              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {permissionGroups.map(
                (
                  group
                ) => (
                  <AccessCard
                    key={
                      group.key
                    }
                    group={
                      group
                    }
                    level={
                      accessLevels[
                        group.key
                      ]
                    }
                    onChange={(
                      level
                    ) =>
                      updateAccessLevel(
                        group.key,
                        level
                      )
                    }
                  />
                )
              )}

            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>

                  <p className="font-black text-emerald-900">
                    ✅ Access Summary
                  </p>

                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    {enabledGroupCount} work areas enabled • {permissions.length} existing permission keys generated
                  </p>

                </div>

                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-900">
                  {staffRole ===
                  "SUPERVISOR"
                    ? "Supervisor"
                    : "Staff"}
                </span>

              </div>

            </div>

          </SectionCard>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* ACTION */}

          <div className="flex flex-wrap justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <Link
              href="/staff"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-black text-slate-700"
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

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

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

      <label className="mb-2 block text-sm font-black text-slate-800">
        {label}
      </label>

      {children}

    </div>
  );
}

function AccessCard({
  group,
  level,
  onChange,
}: {
  group:
    PermissionGroup;

  level:
    AccessLevel;

  onChange:
    (
      level:
        AccessLevel
    ) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-start gap-3">

        <div className="text-2xl">
          {group.icon}
        </div>

        <div className="min-w-0 flex-1">

          <h3 className="font-black text-slate-950">
            {group.title}
          </h3>

          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {group.description}
          </p>

        </div>

      </div>

      <select
        value={
          level
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .value as
              AccessLevel
          )
        }
        className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:border-blue-500"
      >

        {(
          Object.keys(
            accessLevelLabels
          ) as
            AccessLevel[]
        ).map(
          (
            value
          ) => (
            <option
              key={
                value
              }
              value={
                value
              }
            >
              {
                accessLevelLabels[
                  value
                ]
              }
            </option>
          )
        )}

      </select>

      <div className="mt-3">

        <span
          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
            level ===
            "NONE"
              ? "bg-slate-200 text-slate-600"
              : level ===
                "VIEW"
              ? "bg-blue-100 text-blue-700"
              : level ===
                "EDIT"
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {
            accessLevelLabels[
              level
            ]
          }
        </span>

      </div>

    </div>
  );
}
