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
  isActive?: boolean;
};

type StaffApiResponse = {
  success?: boolean;
  message?: string;
  staff?: Supervisor[];
};

type PermissionItem = {
  key: string;
  label: string;
};

type PermissionGroup = {
  title: string;
  icon: string;
  permissions: PermissionItem[];
};

/* -------------------------------------------------------------------------- */
/* PERMISSIONS                                                                */
/* -------------------------------------------------------------------------- */

const permissionGroups: PermissionGroup[] = [
  {
    title: "Customers & Leads",
    icon: "👥",
    permissions: [
      {
        key: "TELECALLING",
        label: "Telecalling",
      },
      {
        key: "VIEW_ASSIGNED_CUSTOMERS",
        label: "My Assigned Customers",
      },
      {
        key: "CUSTOMER_FOLLOW_UP",
        label: "Customer Follow-Up",
      },
      {
        key: "VIEW_ALL_CUSTOMERS",
        label: "View All Customers",
      },
    ],
  },

  {
    title: "Enquiries",
    icon: "📞",
    permissions: [
      {
        key: "VIEW_ENQUIRIES",
        label: "View Enquiries",
      },
      {
        key: "ADD_ENQUIRY",
        label: "Add Enquiry",
      },
      {
        key: "EDIT_ENQUIRY",
        label: "Edit Enquiry",
      },
      {
        key: "ASSIGNED_ENQUIRIES_ONLY",
        label: "Assigned Enquiries Only",
      },
    ],
  },

  {
    title: "Follow-Ups",
    icon: "📅",
    permissions: [
      {
        key: "VIEW_FOLLOW_UPS",
        label: "View Follow-Ups",
      },
      {
        key: "ADD_FOLLOW_UP",
        label: "Add Follow-Up",
      },
      {
        key: "EDIT_FOLLOW_UP",
        label: "Edit Follow-Up",
      },
      {
        key: "ASSIGNED_FOLLOW_UPS_ONLY",
        label: "Assigned Follow-Ups Only",
      },
    ],
  },

  {
    title: "Renewals",
    icon: "🔄",
    permissions: [
      {
        key: "RENEWAL_CALLING",
        label: "Renewal Calling",
      },
      {
        key: "RENEWAL_FOLLOW_UP",
        label: "Renewal Follow-Up",
      },
      {
        key: "VIEW_ALL_RENEWALS",
        label: "View All Renewals",
      },
      {
        key: "EDIT_RENEWAL",
        label: "Edit Renewal",
      },
    ],
  },

  {
    title: "Policies",
    icon: "📄",
    permissions: [
      {
        key: "VIEW_POLICIES",
        label: "View Policies",
      },
      {
        key: "CREATE_POLICY",
        label: "Create Policy",
      },
      {
        key: "EDIT_POLICY",
        label: "Edit Policy",
      },
    ],
  },

  {
    title: "Sub Agents",
    icon: "🤝",
    permissions: [
      {
        key: "VIEW_SUB_AGENTS",
        label: "View Sub Agents",
      },
      {
        key: "ADD_SUB_AGENT",
        label: "Add Sub Agent",
      },
      {
        key: "EDIT_SUB_AGENT",
        label: "Edit Sub Agent",
      },
    ],
  },

  {
    title: "Management",
    icon: "⚙️",
    permissions: [
      {
        key: "ASSIGN_WORK",
        label: "Assign Work",
      },
      {
        key: "REASSIGN_WORK",
        label: "Reassign Work",
      },
      {
        key: "VIEW_STAFF_PERFORMANCE",
        label: "View Staff Performance",
      },
      {
        key: "MANAGE_STAFF",
        label: "Manage Staff",
      },
    ],
  },

  {
    title: "Other Access",
    icon: "🔐",
    permissions: [
      {
        key: "WHATSAPP_ACCESS",
        label: "WhatsApp Access",
      },
      {
        key: "CALL_ACCESS",
        label: "Call Access",
      },
      {
        key: "ATTENDANCE_ACCESS",
        label: "Attendance Access",
      },
      {
        key: "VIEW_NOTES",
        label: "View Notes / Remarks",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* DEFAULT PERMISSIONS                                                        */
/* -------------------------------------------------------------------------- */

const staffDefaultPermissions = [
  "TELECALLING",
  "VIEW_ASSIGNED_CUSTOMERS",
  "CUSTOMER_FOLLOW_UP",
  "VIEW_ENQUIRIES",
  "VIEW_FOLLOW_UPS",
  "WHATSAPP_ACCESS",
  "CALL_ACCESS",
  "ATTENDANCE_ACCESS",
];

const supervisorDefaultPermissions =
  permissionGroups.flatMap(
    (group) =>
      group.permissions.map(
        (permission) =>
          permission.key
      )
  );

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getLoggedInUserId() {
  if (typeof window === "undefined") {
    return "";
  }

  const direct =
    localStorage.getItem(
      "userId"
    );

  if (direct?.trim()) {
    return direct.trim();
  }

  for (const key of [
    "agentUser",
    "user",
  ]) {
    const stored =
      localStorage.getItem(key);

    if (!stored) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(stored);

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
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  ] = useState("");

  const [
    staffCode,
    setStaffCode,
  ] = useState("");

  const [
    name,
    setName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    whatsapp,
    setWhatsapp,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    staffRole,
    setStaffRole,
  ] = useState<StaffRole>(
    "STAFF"
  );

  const [
    designation,
    setDesignation,
  ] = useState("");

  const [
    department,
    setDepartment,
  ] = useState("");

  const [
    supervisorId,
    setSupervisorId,
  ] = useState("");

  const [
    address,
    setAddress,
  ] = useState("");

  const [
    district,
    setDistrict,
  ] = useState("");

  const [
    state,
    setState,
  ] = useState("");

  const [
    pincode,
    setPincode,
  ] = useState("");

  const [
    joiningDate,
    setJoiningDate,
  ] = useState(
    todayForInput()
  );

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    loginEnabled,
    setLoginEnabled,
  ] = useState(true);

  const [
    permissions,
    setPermissions,
  ] = useState<string[]>(
    staffDefaultPermissions
  );

  const [
    supervisors,
    setSupervisors,
  ] = useState<Supervisor[]>(
    []
  );

  const [
    loadingSupervisors,
    setLoadingSupervisors,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /* ------------------------------------------------------------------------ */
  /* PERMISSION COUNT                                                         */
  /* ------------------------------------------------------------------------ */

  const totalPermissionCount =
    useMemo(
      () =>
        permissionGroups.reduce(
          (
            total,
            group
          ) =>
            total +
            group.permissions.length,
          0
        ),
      []
    );

  /* ------------------------------------------------------------------------ */
  /* INITIAL LOAD                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const activeUserId =
      getLoggedInUserId();

    if (!activeUserId) {
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
        data.success === false
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
          (item) =>
            item.isActive !==
              false &&
            String(
              item.staffRole ||
                ""
            ).toUpperCase() ===
              "SUPERVISOR"
        )
      );
    } catch (err) {
      console.error(
        "LOAD SUPERVISORS ERROR:",
        err
      );

      setSupervisors([]);
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
    setStaffRole(value);

    if (
      value ===
      "SUPERVISOR"
    ) {
      setSupervisorId("");

      setPermissions(
        supervisorDefaultPermissions
      );
    } else {
      setPermissions(
        staffDefaultPermissions
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* PERMISSION CHANGE                                                        */
  /* ------------------------------------------------------------------------ */

  function togglePermission(
    permission: string
  ) {
    setPermissions(
      (current) => {
        if (
          current.includes(
            permission
          )
        ) {
          return current.filter(
            (item) =>
              item !==
              permission
          );
        }

        return [
          ...current,
          permission,
        ];
      }
    );
  }

  function selectGroup(
    group: PermissionGroup
  ) {
    const keys =
      group.permissions.map(
        (permission) =>
          permission.key
      );

    const allSelected =
      keys.every((key) =>
        permissions.includes(
          key
        )
      );

    if (allSelected) {
      setPermissions(
        (current) =>
          current.filter(
            (item) =>
              !keys.includes(
                item
              )
          )
      );

      return;
    }

    setPermissions(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...keys,
          ])
        )
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

    if (saving) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const activeUserId =
        userId ||
        getLoggedInUserId();

      if (!activeUserId) {
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

      if (!cleanCode) {
        throw new Error(
          "Staff code is required."
        );
      }

      if (!cleanName) {
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
        password.length < 6
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
        permissions.length ===
        0
      ) {
        throw new Error(
          "Please select at least one staff permission."
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

        permissions,
      };

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
        data.success === false
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
    } catch (err) {
      console.error(
        "CREATE STAFF ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create staff."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-5">

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
              Create staff login,
              reporting hierarchy and
              work permissions.
            </p>
          </div>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5"
        >

          <div className="grid gap-5 xl:grid-cols-[420px_1fr]">

            {/* LEFT SIDE */}

            <div className="space-y-5">

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
                      placeholder="Sales Executive / Telecaller"
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

              </SectionCard>

              {/* LOGIN */}

              <SectionCard
                title="🔐 Login Credentials"
                description="Staff can use these credentials on the main login page."
              >

                <div className="space-y-4">

                  <Field label="Login Password *">

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
                        placeholder="Minimum 6 characters"
                        className={`${inputClass} flex-1`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (current) =>
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
                        Staff can login using
                        mobile number and password.
                      </p>
                    </div>

                  </label>

                </div>

              </SectionCard>

              {/* OFFICE */}

              <SectionCard
                title="🏢 Office Details"
                description="Optional joining and contact details."
              >

                <div className="space-y-4">

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

                  <div className="grid gap-4 sm:grid-cols-2">

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

                  </div>

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
                      className={
                        inputClass
                      }
                    />
                  </Field>

                </div>

              </SectionCard>

            </div>

            {/* RIGHT PERMISSIONS */}

            <SectionCard
              title="🔒 Work Access Permissions"
              description="Tick only the work this staff member is permitted to access."
            >

              <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>
                    <p className="font-black text-blue-950">
                      {staffRole ===
                      "SUPERVISOR"
                        ? "Supervisor Access"
                        : "Staff Access"}
                    </p>

                    <p className="text-xs font-semibold text-blue-700">
                      Agent data always remains
                      isolated from other agents.
                    </p>
                  </div>

                  <div className="rounded-full bg-blue-700 px-4 py-2 text-sm font-black text-white">
                    {
                      permissions.length
                    }{" "}
                    Selected
                  </div>

                </div>

              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                {permissionGroups.map(
                  (group) => {
                    const groupKeys =
                      group.permissions.map(
                        (
                          permission
                        ) =>
                          permission.key
                      );

                    const allSelected =
                      groupKeys.every(
                        (key) =>
                          permissions.includes(
                            key
                          )
                      );

                    return (
                      <div
                        key={
                          group.title
                        }
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >

                        <div className="mb-4 flex items-center justify-between gap-2">

                          <h3 className="font-black text-slate-900">
                            <span className="mr-2">
                              {
                                group.icon
                              }
                            </span>

                            {
                              group.title
                            }
                          </h3>

                          <button
                            type="button"
                            onClick={() =>
                              selectGroup(
                                group
                              )
                            }
                            className="text-xs font-black text-blue-700"
                          >
                            {allSelected
                              ? "Clear"
                              : "All"}
                          </button>

                        </div>

                        <div className="space-y-3">

                          {group.permissions.map(
                            (
                              permission
                            ) => (
                              <label
                                key={
                                  permission.key
                                }
                                className="flex cursor-pointer items-start gap-3"
                              >

                                <input
                                  type="checkbox"
                                  checked={permissions.includes(
                                    permission.key
                                  )}
                                  onChange={() =>
                                    togglePermission(
                                      permission.key
                                    )
                                  }
                                  className="mt-0.5 h-5 w-5 rounded"
                                />

                                <span className="text-sm font-semibold text-slate-700">
                                  {
                                    permission.label
                                  }
                                </span>

                              </label>
                            )
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

                {/* SUMMARY */}

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                  <h3 className="font-black text-emerald-900">
                    ✅ Permission Summary
                  </h3>

                  <div className="mt-5 space-y-4">

                    <SummaryLine
                      label="Available"
                      value={
                        totalPermissionCount
                      }
                    />

                    <SummaryLine
                      label="Selected"
                      value={
                        permissions.length
                      }
                    />

                    <SummaryLine
                      label="Role"
                      value={
                        staffRole ===
                        "SUPERVISOR"
                          ? "Supervisor"
                          : "Staff"
                      }
                    />

                  </div>

                </div>

              </div>

            </SectionCard>

          </div>

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

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">

      <span className="text-sm font-bold text-emerald-800">
        {label}
      </span>

      <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-900 shadow-sm">
        {value}
      </span>

    </div>
  );
}