"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type Office = {
  id: string;
  code: string;
  name: string;

  address?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;

  latitude?: string | number | null;
  longitude?: string | number | null;

  radiusMeters: number;

  isHeadOffice: boolean;
  isActive: boolean;

  _count?: {
    staff?: number;
    attendance?: number;
  };
};

function getLoggedInUserId() {
  if (typeof window === "undefined") {
    return "";
  }

  const direct =
    localStorage.getItem("userId");

  if (direct?.trim()) {
    return direct.trim();
  }

  for (const key of ["agentUser", "user"]) {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(raw);

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

const emptyForm = {
  id: "",
  code: "",
  name: "",

  address: "",
  district: "",
  state: "",
  pincode: "",

  latitude: "",
  longitude: "",

  radiusMeters: 100,

  isHeadOffice: false,
  isActive: true,
};

export default function OfficesPage() {
  const [
    userId,
    setUserId,
  ] = useState("");

  const [
    offices,
    setOffices,
  ] = useState<Office[]>([]);

  const [
    form,
    setForm,
  ] = useState(emptyForm);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const id =
      getLoggedInUserId();

    if (!id) {
      setError(
        "Agent login information was not found."
      );

      setLoading(false);

      return;
    }

    setUserId(id);

    void loadOffices(id);
  }, []);

  async function loadOffices(
    id = userId
  ) {
    if (!id) {
      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          `/api/staff/offices?userId=${encodeURIComponent(
            id
          )}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
            "Unable to load offices."
        );
      }

      setOffices(
        Array.isArray(data.offices)
          ? data.offices
          : []
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load offices."
      );
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setForm(emptyForm);
    setMessage("");
    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editOffice(
    office: Office
  ) {
    setForm({
      id: office.id,
      code: office.code,
      name: office.name,

      address:
        office.address || "",

      district:
        office.district || "",

      state:
        office.state || "",

      pincode:
        office.pincode || "",

      latitude:
        office.latitude === null ||
        office.latitude === undefined
          ? ""
          : String(office.latitude),

      longitude:
        office.longitude === null ||
        office.longitude === undefined
          ? ""
          : String(office.longitude),

      radiusMeters:
        office.radiusMeters || 100,

      isHeadOffice:
        office.isHeadOffice,

      isActive:
        office.isActive,
    });

    setMessage("");
    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    setForm(emptyForm);
    setShowForm(false);
    setMessage("");
    setError("");
  }

  function useCurrentLocation() {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError(
        "GPS is not supported by this browser."
      );

      return;
    }

    setMessage(
      "Getting GPS location..."
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,

          latitude:
            String(
              position.coords.latitude
            ),

          longitude:
            String(
              position.coords.longitude
            ),
        }));

        setMessage(
          `Location captured. GPS accuracy approximately ${Math.round(
            position.coords.accuracy
          )} metres.`
        );
      },

      (gpsError) => {
        setMessage("");

        setError(
          gpsError.message ||
            "Unable to capture GPS."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  }

  async function saveOffice(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      if (!form.code.trim()) {
        throw new Error(
          "Office code is required."
        );
      }

      if (!form.name.trim()) {
        throw new Error(
          "Office name is required."
        );
      }

      const response =
        await fetch(
          "/api/staff/offices",
          {
            method:
              form.id
                ? "PUT"
                : "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...form,
                userId,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
            "Unable to save office."
        );
      }

      setMessage(
        data.message ||
          "Office saved successfully."
      );

      setForm(emptyForm);
      setShowForm(false);

      await loadOffices(userId);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save office."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-950">

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">

          <div className="flex items-center gap-3">

            <Link
              href="/staff"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                Staff Management
              </p>

              <h1 className="text-2xl font-black">
                Offices
              </h1>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Manage branches, GPS locations and attendance radius.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white shadow-sm"
          >
            + Add Office
          </button>

        </div>

      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            ⚠️ {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={saveOffice}
            className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >

            <div className="flex flex-wrap items-start justify-between gap-3">

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                  {form.id
                    ? "Edit Office"
                    : "Create Office"}
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {form.id
                    ? form.name ||
                      "Edit Office"
                    : "Create Branch Office / Office"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  New offices are Branch Offices by default.
                </p>

              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-black"
              >
                Close
              </button>

            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">

              <div className="space-y-4">

                <Field label="Office Code *">

                  <input
                    value={form.code}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          code:
                            event.target.value.toUpperCase(),
                        })
                      )
                    }
                    placeholder="HO / KOC01"
                    className={inputClass}
                  />

                </Field>

                <Field label="Office Name *">

                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          name:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Kochi Office"
                    className={inputClass}
                  />

                </Field>

                <Field label="Address">

                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          address:
                            event.target.value,
                        })
                      )
                    }
                    className={inputClass}
                  />

                </Field>

                <div className="grid gap-3 sm:grid-cols-2">

                  <Field label="District">

                    <input
                      value={form.district}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,

                            district:
                              event.target.value,
                          })
                        )
                      }
                      className={inputClass}
                    />

                  </Field>

                  <Field label="State">

                    <input
                      value={form.state}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,

                            state:
                              event.target.value,
                          })
                        )
                      }
                      className={inputClass}
                    />

                  </Field>

                </div>

                <Field label="Pincode">

                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          pincode:
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6),
                        })
                      )
                    }
                    className={inputClass}
                  />

                </Field>

              </div>

              <div className="space-y-4">

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">

                  <p className="font-black text-blue-950">
                    📍 Attendance GPS
                  </p>

                  <div className="mt-3 space-y-3">

                    <Field label="Latitude">

                      <input
                        value={form.latitude}
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,

                              latitude:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />

                    </Field>

                    <Field label="Longitude">

                      <input
                        value={form.longitude}
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,

                              longitude:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />

                    </Field>

                    <Field label="Attendance Radius (metres)">

                      <input
                        type="number"
                        min={20}
                        max={5000}
                        value={form.radiusMeters}
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,

                              radiusMeters:
                                Number(
                                  event.target.value
                                ),
                            })
                          )
                        }
                        className={inputClass}
                      />

                    </Field>

                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="w-full rounded-xl border border-blue-300 bg-white px-4 py-3 font-black text-blue-700"
                    >
                      📍 Use Current Location
                    </button>

                  </div>

                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs font-black uppercase text-slate-500">
                    Office Type
                  </p>

                  <p className="mt-1 text-lg font-black">
                    {form.isHeadOffice
                      ? "Main Branch"
                      : "Branch Office"}
                  </p>

                </div>

                <label
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 ${
                    form.isHeadOffice
                      ? "border-violet-300 bg-violet-50"
                      : "border-slate-200 bg-white"
                  }`}
                >

                  <div>

                    <p className="font-black text-slate-950">
                      My Main Branch
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Check this if this office is my main branch.
                    </p>

                  </div>

                  <input
                    type="checkbox"
                    checked={form.isHeadOffice}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          isHeadOffice:
                            event.target.checked,
                        })
                      )
                    }
                    className="h-5 w-5"
                  />

                </label>

                {form.id && (
                  <label className="flex items-center justify-between rounded-xl bg-emerald-50 p-4">

                    <span className="font-black text-emerald-900">
                      Office Active
                    </span>

                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,

                            isActive:
                              event.target.checked,
                          })
                        )
                      }
                      className="h-5 w-5"
                    />

                  </label>
                )}

              </div>

            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">

              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : form.id
                    ? "Update Office"
                    : form.isHeadOffice
                      ? "Create Main Branch"
                      : "Create Branch Office"}
              </button>

            </div>

          </form>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                Office Directory
              </p>

              <h2 className="mt-1 text-xl font-black">
                Your Offices
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Create a branch office or set one as your main branch.
              </p>

            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-black text-blue-700"
            >
              + Add Office
            </button>

          </div>

          {loading ? (
            <div className="p-8 text-center font-bold text-slate-500">
              Loading offices...
            </div>
          ) : offices.length === 0 ? (
            <div className="p-10 text-center">

              <div className="text-5xl">
                🏢
              </div>

              <h3 className="mt-4 text-xl font-black">
                No Offices Created
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
                Create your first branch office, add its GPS location and optionally mark it as your main branch.
              </p>

              <button
                type="button"
                onClick={openAddForm}
                className="mt-5 rounded-xl bg-blue-700 px-6 py-3 font-black text-white"
              >
                + Add Office
              </button>

            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2">

              {offices.map(
                (office) => (
                  <article
                    key={office.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-3">

                      <div>

                        <div className="flex flex-wrap gap-2">

                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                            {office.code}
                          </span>

                          {office.isHeadOffice ? (
                            <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
                              Main Branch
                            </span>
                          ) : (
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                              Branch Office
                            </span>
                          )}

                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                              office.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {office.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </div>

                        <h3 className="mt-3 text-lg font-black">
                          {office.name}
                        </h3>

                        {office.address && (
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {office.address}
                          </p>
                        )}

                        <p className="mt-3 text-xs font-bold text-slate-500">
                          📍 Attendance Radius:{" "}
                          {office.radiusMeters}m
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          editOffice(office)
                        }
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700"
                      >
                        Edit
                      </button>

                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">

                      <MiniStat
                        label="Staff"
                        value={
                          office._count?.staff ||
                          0
                        }
                      />

                      <MiniStat
                        label="Attendance"
                        value={
                          office._count?.attendance ||
                          0
                        }
                      />

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </section>

    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>

      <span className="mb-1 block text-xs font-black text-slate-600">
        {label}
      </span>

      {children}

    </label>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <p className="text-[10px] font-black uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>

    </div>
  );
}
