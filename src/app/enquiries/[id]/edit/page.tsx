"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

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

  customerId?: string | null;

  businessType?: string | null;

  requirement?: string | null;

  remarks?: string | null;

  status?: string | null;

  enquiryDate?: string | null;

  nextFollowUpDate?: string | null;

  customer?: Customer | null;
};

type FormState = {
  businessType: string;

  requirement: string;

  remarks: string;

  status: string;

  enquiryDate: string;

  nextFollowUpDate: string;
};

/* -------------------------------------------------------------------------- */
/* USER                                                                       */
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
          parsed?.id ||
            parsed?.userId ||
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
      // Ignore invalid local storage.
    }
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* DATE                                                                       */
/* -------------------------------------------------------------------------- */

function toDateInputValue(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return [
    date.getUTCFullYear(),

    String(
      date.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}

/* -------------------------------------------------------------------------- */
/* STATUS                                                                     */
/* -------------------------------------------------------------------------- */

function normalizeStatus(
  value?: string | null
) {
  return String(
    value ||
      "NEW"
  )
    .trim()
    .toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function EditEnquiryPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const enquiryId =
    String(
      params?.id ||
        ""
    ).trim();

  const [
    userId,
    setUserId,
  ] =
    useState("");

  const [
    enquiry,
    setEnquiry,
  ] =
    useState<Enquiry | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<FormState>({
      businessType:
        "",

      requirement:
        "",

      remarks:
        "",

      status:
        "NEW",

      enquiryDate:
        "",

      nextFollowUpDate:
        "",
    });

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    success,
    setSuccess,
  ] =
    useState(
      ""
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD                                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const activeUserId =
      getLoggedInUserId();

    if (
      !activeUserId
    ) {
      setError(
        "Logged-in user information was not found. Please login again."
      );

      setLoading(
        false
      );

      return;
    }

    if (
      !enquiryId
    ) {
      setError(
        "Enquiry ID is missing."
      );

      setLoading(
        false
      );

      return;
    }

    setUserId(
      activeUserId
    );

    void loadEnquiry(
      activeUserId
    );
  }, [
    enquiryId,
  ]);

  /* ------------------------------------------------------------------------ */
  /* LOAD ENQUIRY                                                             */
  /* ------------------------------------------------------------------------ */

  async function loadEnquiry(
    activeUserId: string
  ) {
    try {
      setLoading(
        true
      );

      setError(
        ""
      );

      const response =
        await fetch(
          `/api/enquiries?userId=${encodeURIComponent(
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
        any = {};

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
            "Unable to load enquiry."
        );
      }

      const list:
        Enquiry[] =
        Array.isArray(
          data
        )
          ? data
          : Array.isArray(
                data.enquiries
              )
            ? data.enquiries
            : Array.isArray(
                  data.data
                )
              ? data.data
              : [];

      const found =
        list.find(
          (
            item
          ) =>
            item.id ===
            enquiryId
        );

      if (
        !found
      ) {
        throw new Error(
          "Enquiry not found."
        );
      }

      setEnquiry(
        found
      );

      setForm({
        businessType:
          String(
            found.businessType ||
              "OTHER"
          )
            .trim()
            .toUpperCase(),

        requirement:
          found.requirement ||
          "",

        remarks:
          found.remarks ||
          "",

        status:
          normalizeStatus(
            found.status
          ),

        enquiryDate:
          toDateInputValue(
            found.enquiryDate
          ),

        nextFollowUpDate:
          toDateInputValue(
            found.nextFollowUpDate
          ),
      });
    } catch (
      err
    ) {
      console.error(
        "LOAD ENQUIRY ERROR:",
        err
      );

      setEnquiry(
        null
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load enquiry."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* FIELD                                                                    */
  /* ------------------------------------------------------------------------ */

  function updateField(
    event:
      React.ChangeEvent<
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
      >
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setForm(
      (
        previous
      ) => ({
        ...previous,

        [name]:
          value,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE                                                                     */
  /* ------------------------------------------------------------------------ */

  async function saveEnquiry(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(
        true
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );

      const activeUserId =
        userId ||
        getLoggedInUserId();

      if (
        !activeUserId
      ) {
        throw new Error(
          "Logged-in user information was not found."
        );
      }

      if (
        !enquiry
      ) {
        throw new Error(
          "Enquiry information was not found."
        );
      }

      if (
        !form.businessType
      ) {
        throw new Error(
          "Please select business type."
        );
      }

      if (
        !form.enquiryDate
      ) {
        throw new Error(
          "Please select enquiry date."
        );
      }

      if (
        !form.status
      ) {
        throw new Error(
          "Please select enquiry status."
        );
      }

      const payload = {
        id:
          enquiry.id,

        userId:
          activeUserId,

        businessType:
          form.businessType,

        requirement:
          form.requirement.trim() ||
          null,

        remarks:
          form.remarks.trim() ||
          null,

        status:
          form.status,

        enquiryDate:
          form.enquiryDate,

        nextFollowUpDate:
          form.nextFollowUpDate ||
          null,
      };

      const response =
        await fetch(
          "/api/enquiries",
          {
            method:
              "PUT",

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

      let data:
        any = {};

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
            "Unable to update enquiry."
        );
      }

      setSuccess(
        data.message ||
          "Enquiry updated successfully."
      );

      window.setTimeout(
        () => {
          router.push(
            `/enquiries/${enquiry.id}`
          );

          router.refresh();
        },
        700
      );
    } catch (
      err
    ) {
      console.error(
        "UPDATE ENQUIRY ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update enquiry."
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
    <main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">

      <div className="mx-auto max-w-3xl">

        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            router.push(
              `/enquiries/${enquiryId}`
            )
          }
          className="mb-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"
        >
          ← Back to Enquiry
        </button>

        {/* LOADING */}

        {loading && (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">

            <div className="text-4xl">
              ⏳
            </div>

            <p className="mt-3 font-bold text-slate-600">
              Loading enquiry...
            </p>

          </div>
        )}

        {/* ERROR */}

        {!loading &&
          error &&
          !enquiry && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 font-bold text-red-800">
              ⚠️ {error}
            </div>
          )}

        {/* FORM */}

        {!loading &&
          enquiry && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              {/* HEADER */}

              <div className="border-b bg-blue-50 p-6">

                <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Enquiry Management
                </p>

                <h1 className="mt-1 text-3xl font-black">
                  Edit Enquiry
                </h1>

                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Correct enquiry details without creating a new enquiry.
                </p>

              </div>

              <form
                onSubmit={
                  saveEnquiry
                }
                className="space-y-5 p-5 sm:p-7"
              >

                {/* CUSTOMER */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs font-black uppercase text-slate-500">
                    Customer / Lead
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {enquiry.customer?.name ||
                      "Customer"}
                  </p>

                  {enquiry.customer?.phone && (
                    <p className="mt-1 font-bold text-slate-600">
                      📱{" "}
                      {
                        enquiry.customer.phone
                      }
                    </p>
                  )}

                  {enquiry.customer?.customerId && (
                    <p className="mt-1 text-xs font-bold text-blue-700">
                      {
                        enquiry.customer.customerId
                      }
                    </p>
                  )}

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Customer name and mobile are not changed from this page.
                  </p>

                </div>

                {/* BUSINESS TYPE */}

                <div>

                  <label className="mb-2 block text-sm font-black">
                    Business Type *
                  </label>

                  <select
                    name="businessType"
                    value={
                      form.businessType
                    }
                    onChange={
                      updateField
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold"
                  >
                    <option value="HEALTH">
                      Health
                    </option>

                    <option value="MOTOR">
                      Motor
                    </option>

                    <option value="LIFE">
                      Life
                    </option>

                    <option value="OTHER">
                      Other
                    </option>
                  </select>

                </div>

                {/* ENQUIRY DATE */}

                <div>

                  <label className="mb-2 block text-sm font-black">
                    Enquiry Date *
                  </label>

                  <input
                    type="date"
                    name="enquiryDate"
                    value={
                      form.enquiryDate
                    }
                    onChange={
                      updateField
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold"
                  />

                </div>

                {/* NEXT FOLLOW-UP */}

                <div>

                  <label className="mb-2 block text-sm font-black">
                    Next Follow-up Date
                  </label>

                  <input
                    type="date"
                    name="nextFollowUpDate"
                    value={
                      form.nextFollowUpDate
                    }
                    onChange={
                      updateField
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold"
                  />

                </div>

                {/* REQUIREMENT */}

                <div>

                  <label className="mb-2 block text-sm font-black">
                    Requirement
                  </label>

                  <textarea
                    name="requirement"
                    value={
                      form.requirement
                    }
                    onChange={
                      updateField
                    }
                    rows={
                      4
                    }
                    placeholder="Customer requirement"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold"
                  />

                </div>

                {/* REMARKS */}

                <div>

                  <label className="mb-2 block text-sm font-black">
                    Remarks
                  </label>

                  <textarea
                    name="remarks"
                    value={
                      form.remarks
                    }
                    onChange={
                      updateField
                    }
                    rows={
                      5
                    }
                    placeholder="Enquiry remarks"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold"
                  />

                </div>

                {/* STATUS */}

                <div>

                  <label className="mb-2 block text-sm font-black">
                    Enquiry Status *
                  </label>

                  <select
                    name="status"
                    value={
                      form.status
                    }
                    onChange={
                      updateField
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold"
                  >

                    <option value="NEW">
                      New
                    </option>

                    <option value="OPEN">
                      Open
                    </option>

                    <option value="FOLLOW_UP">
                      Follow-up
                    </option>

                    <option value="CONVERTED">
                      Converted
                    </option>

                    <option value="LOST">
                      Lost
                    </option>

                    <option value="CLOSED">
                      Closed
                    </option>

                  </select>

                  {normalizeStatus(
                    enquiry.status
                  ) ===
                    "CONVERTED" && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                      ⚠️ This enquiry is currently converted. Leave the status as Converted unless you intentionally want to reopen/correct the enquiry.
                    </div>
                  )}

                </div>

                {/* ERROR */}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">
                    ⚠️ {error}
                  </div>
                )}

                {/* SUCCESS */}

                {success && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
                    ✅ {success}
                  </div>
                )}

                {/* BUTTONS */}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      router.push(
                        `/enquiries/${enquiry.id}`
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>

                </div>

              </form>

            </div>
          )}

      </div>

    </main>
  );
}