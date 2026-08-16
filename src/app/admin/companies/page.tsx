"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type InsuranceCategory = "MOTOR" | "HEALTH" | "LIFE";

type Company = {
  id: string;
  name: string;
  logoUrl?: string | null;
  categories: InsuranceCategory[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const CATEGORY_OPTIONS: {
  value: InsuranceCategory;
  label: string;
  icon: string;
}[] = [
  {
    value: "MOTOR",
    label: "Motor",
    icon: "🚗",
  },
  {
    value: "HEALTH",
    label: "Health",
    icon: "❤️",
  },
  {
    value: "LIFE",
    label: "Life",
    icon: "👨‍👩‍👧",
  },
];

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [categories, setCategories] = useState<
    InsuranceCategory[]
  >([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingCompany, setEditingCompany] =
    useState<Company | null>(null);

  const [editName, setEditName] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editCategories, setEditCategories] = useState<
    InsuranceCategory[]
  >([]);

  /* ---------------------------------------------------------------------- */
  /* LOAD COMPANIES                                                         */
  /* ---------------------------------------------------------------------- */

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/companies", {
        cache: "no-store",
      });

      let data: any = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to load companies."
        );
      }

      const list = Array.isArray(data.companies)
        ? data.companies
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setCompanies(list);
    } catch (error) {
      console.error("LOAD COMPANIES ERROR:", error);

      setCompanies([]);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load companies."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  /* ---------------------------------------------------------------------- */
  /* CATEGORY SELECTION                                                     */
  /* ---------------------------------------------------------------------- */

  function toggleCategory(
    category: InsuranceCategory,
    edit = false
  ) {
    if (edit) {
      setEditCategories((current) =>
        current.includes(category)
          ? current.filter((item) => item !== category)
          : [...current, category]
      );

      return;
    }

    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  /* ---------------------------------------------------------------------- */
  /* IMAGE FILE -> PREVIEW                                                  */
  /* ---------------------------------------------------------------------- */

  function handleLogoFile(
    event: ChangeEvent<HTMLInputElement>,
    edit = false
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Logo image must be below 2 MB.");
      return;
    }

    /*
      IMPORTANT:
      This creates a browser preview.

      Your existing Company model stores logoUrl as a String.
      If you already have an upload API, replace this part later
      with the returned uploaded URL.
    */

    const reader = new FileReader();

    reader.onload = () => {
      const result =
        typeof reader.result === "string"
          ? reader.result
          : "";

      if (edit) {
        setEditLogoUrl(result);
      } else {
        setLogoUrl(result);
      }
    };

    reader.readAsDataURL(file);
  }

  /* ---------------------------------------------------------------------- */
  /* ADD COMPANY                                                            */
  /* ---------------------------------------------------------------------- */

  async function handleAddCompany() {
    const cleanName = name.trim();

    if (!cleanName) {
      setError("Company name is required.");
      return;
    }

    if (categories.length === 0) {
      setError(
        "Please select at least one insurance category."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/companies", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: cleanName,
          logoUrl: logoUrl || null,
          categories,
        }),
      });

      let data: any = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to add company."
        );
      }

      setName("");
      setLogoUrl("");
      setCategories([]);

      setSuccess("Company added successfully.");

      await loadCompanies();
    } catch (error) {
      console.error("ADD COMPANY ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to add company."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* OPEN EDIT                                                              */
  /* ---------------------------------------------------------------------- */

  function openEdit(company: Company) {
    setEditingCompany(company);

    setEditName(company.name);

    setEditLogoUrl(company.logoUrl || "");

    setEditCategories(
      Array.isArray(company.categories)
        ? company.categories
        : []
    );

    setError("");
    setSuccess("");
  }

  function closeEdit() {
    setEditingCompany(null);
    setEditName("");
    setEditLogoUrl("");
    setEditCategories([]);
  }

  /* ---------------------------------------------------------------------- */
  /* SAVE EDIT                                                              */
  /* ---------------------------------------------------------------------- */

  async function saveEdit() {
    if (!editingCompany) {
      return;
    }

    const cleanName = editName.trim();

    if (!cleanName) {
      setError("Company name is required.");
      return;
    }

    if (editCategories.length === 0) {
      setError(
        "Please select at least one insurance category."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/companies", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: editingCompany.id,
          name: cleanName,
          logoUrl: editLogoUrl || null,
          categories: editCategories,
        }),
      });

      let data: any = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to update company."
        );
      }

      closeEdit();

      setSuccess("Company updated successfully.");

      await loadCompanies();
    } catch (error) {
      console.error("UPDATE COMPANY ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update company."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* ENABLE / DISABLE                                                       */
  /* ---------------------------------------------------------------------- */

  async function toggleCompanyStatus(company: Company) {
    const newStatus = !company.isActive;

    const confirmation = window.confirm(
      newStatus
        ? `Enable ${company.name}?`
        : `Disable ${company.name}?`
    );

    if (!confirmation) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/companies", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: company.id,
          isActive: newStatus,
        }),
      });

      let data: any = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message ||
            "Unable to change company status."
        );
      }

      setSuccess(
        newStatus
          ? "Company enabled successfully."
          : "Company disabled successfully."
      );

      await loadCompanies();
    } catch (error) {
      console.error("COMPANY STATUS ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to change company status."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* FILTER                                                                 */
  /* ---------------------------------------------------------------------- */

  const filteredCompanies = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return companies;
    }

    return companies.filter((company) =>
      company.name.toLowerCase().includes(value)
    );
  }, [companies, search]);

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-300">
              Master Admin
            </p>

            <h1 className="text-2xl font-black">
              Insurance Companies
            </h1>

            <p className="mt-1 text-sm font-semibold text-blue-200">
              Add, edit and manage insurance companies
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20"
          >
            ← Admin Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 font-bold text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* ------------------------------------------------------------ */}
          {/* ADD COMPANY                                                  */}
          {/* ------------------------------------------------------------ */}

          <div className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-blue-700">
              Add Company
            </p>

            <h2 className="mt-2 text-2xl font-black">
              New Insurance Company
            </h2>

            <label className="mt-6 block text-sm font-black">
              Company Name
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Example: Star Health"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />

            {/* LOGO */}

            <label className="mt-5 block text-sm font-black">
              Company Logo
            </label>

            <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-300 p-4">
              {logoUrl ? (
                <div className="mb-4 flex items-center gap-4">
                  <img
                    src={logoUrl}
                    alt="Company logo preview"
                    className="h-16 w-16 rounded-xl border bg-white object-contain p-1"
                  />

                  <div>
                    <p className="text-sm font-black">
                      Logo selected
                    </p>

                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="mt-1 text-xs font-black text-red-600"
                    >
                      Remove Logo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 text-center">
                  <div className="text-4xl">🖼️</div>

                  <p className="mt-2 text-sm font-bold text-slate-500">
                    Select company logo
                  </p>
                </div>
              )}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  handleLogoFile(event)
                }
                className="block w-full text-sm font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-black file:text-blue-700"
              />

              <p className="mt-2 text-xs font-semibold text-slate-400">
                PNG, JPG or WEBP · Maximum 2 MB
              </p>
            </div>

            {/* CATEGORIES */}

            <p className="mt-5 text-sm font-black">
              Insurance Categories
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((category) => {
                const selected =
                  categories.includes(category.value);

                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() =>
                      toggleCategory(category.value)
                    }
                    className={`rounded-xl border px-2 py-3 text-sm font-black transition ${
                      selected
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="mr-1">
                      {category.icon}
                    </span>

                    {category.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void handleAddCompany()}
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-4 font-black text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Company"}
            </button>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* COMPANY LIST                                                 */}
          {/* ------------------------------------------------------------ */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                  Company List
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Insurance Companies
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {companies.length} companies
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadCompanies()}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black"
              >
                ↻ Refresh
              </button>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search company..."
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            />

            {loading ? (
              <div className="py-16 text-center font-black text-slate-500">
                Loading companies...
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl">🏢</div>

                <p className="mt-3 font-black text-slate-500">
                  No companies found
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    className={`rounded-2xl border p-4 ${
                      company.isActive
                        ? "border-slate-200 bg-white"
                        : "border-red-200 bg-red-50/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.name}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-2xl">
                              🏢
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-black text-slate-950">
                            {company.name}
                          </h3>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {company.categories?.map(
                              (category) => (
                                <span
                                  key={category}
                                  className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700"
                                >
                                  {category}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
                            company.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {company.isActive
                            ? "ACTIVE"
                            : "DISABLED"}
                        </span>

                        <button
                          type="button"
                          onClick={() => openEdit(company)}
                          className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                        >
                          ✏️ Edit
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            void toggleCompanyStatus(
                              company
                            )
                          }
                          className={`rounded-xl px-3 py-2 text-xs font-black ${
                            company.isActive
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {company.isActive
                            ? "Disable"
                            : "Enable"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* EDIT MODAL                                                       */}
      {/* ---------------------------------------------------------------- */}

      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                  Edit Company
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Company Details
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black"
              >
                ✕
              </button>
            </div>

            <label className="mt-6 block text-sm font-black">
              Company Name
            </label>

            <input
              value={editName}
              onChange={(event) =>
                setEditName(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            />

            {/* EDIT LOGO */}

            <label className="mt-5 block text-sm font-black">
              Company Logo
            </label>

            <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-300 p-4">
              {editLogoUrl ? (
                <div className="mb-4 flex items-center gap-4">
                  <img
                    src={editLogoUrl}
                    alt="Company logo"
                    className="h-20 w-20 rounded-xl border bg-white object-contain p-1"
                  />

                  <button
                    type="button"
                    onClick={() => setEditLogoUrl("")}
                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                  >
                    Remove Logo
                  </button>
                </div>
              ) : (
                <p className="mb-3 text-sm font-bold text-slate-500">
                  No company logo selected.
                </p>
              )}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  handleLogoFile(event, true)
                }
                className="block w-full text-sm font-semibold text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-black file:text-blue-700"
              />
            </div>

            <p className="mt-5 text-sm font-black">
              Insurance Categories
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((category) => {
                const selected =
                  editCategories.includes(
                    category.value
                  );

                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() =>
                      toggleCategory(
                        category.value,
                        true
                      )
                    }
                    className={`rounded-xl border px-2 py-3 text-sm font-black ${
                      selected
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {category.icon} {category.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEdit()}
                className="rounded-xl bg-blue-700 px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}