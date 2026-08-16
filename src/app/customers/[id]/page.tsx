"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Customer = {
  id: string;
  customerId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  notes?: string | null;
  isActive?: boolean;
  inactiveReason?: string | null;
  inactiveAt?: string | null;
};

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  notes: string;
};

/* -------------------------------------------------------------------------- */
/* EMPTY FORM                                                                 */
/* -------------------------------------------------------------------------- */

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  district: "",
  state: "",
  pincode: "",
  notes: "",
};

/* -------------------------------------------------------------------------- */
/* DATE FOR INPUT                                                             */
/* -------------------------------------------------------------------------- */

function dateForInput(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function EditCustomerPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const customerId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const [
    form,
    setForm,
  ] =
    useState<CustomerForm>(
      emptyForm
    );

  const [
    customer,
    setCustomer,
  ] =
    useState<Customer | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  /* ------------------------------------------------------------------------ */
  /* LOAD CUSTOMER                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!customerId) {
      setError(
        "Customer ID is missing."
      );

      setLoading(false);

      return;
    }

    loadCustomer();
  }, [customerId]);

  async function loadCustomer() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response =
        await fetch(
          `/api/customers/${customerId}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      let data: {
        success?: boolean;
        message?: string;
        customer?: Customer;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success ||
        !data.customer
      ) {
        throw new Error(
          data.message ||
            "Unable to load customer."
        );
      }

      const loadedCustomer =
        data.customer;

      setCustomer(
        loadedCustomer
      );

      setForm({
        name:
          loadedCustomer.name ||
          "",

        phone:
          loadedCustomer.phone ||
          "",

        email:
          loadedCustomer.email ||
          "",

        dateOfBirth:
          dateForInput(
            loadedCustomer.dateOfBirth
          ),

        gender:
          loadedCustomer.gender ||
          "",

        address:
          loadedCustomer.address ||
          "",

        district:
          loadedCustomer.district ||
          "",

        state:
          loadedCustomer.state ||
          "",

        pincode:
          loadedCustomer.pincode ||
          "",

        notes:
          loadedCustomer.notes ||
          "",
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load customer."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* CHANGE NORMAL INPUT                                                      */
  /* ------------------------------------------------------------------------ */

  function handleChange(
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    if (error) {
      setError("");
    }

    if (message) {
      setMessage("");
    }
  }

  /* ------------------------------------------------------------------------ */
  /* PHONE CHANGE                                                             */
  /* ------------------------------------------------------------------------ */

  function handlePhoneChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 10);

    setForm(
      (previous) => ({
        ...previous,
        phone: value,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PINCODE CHANGE                                                           */
  /* ------------------------------------------------------------------------ */

  function handlePincodeChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 6);

    setForm(
      (previous) => ({
        ...previous,
        pincode: value,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* VALIDATE                                                                 */
  /* ------------------------------------------------------------------------ */

  function validateForm() {
    const name =
      form.name.trim();

    const phone =
      form.phone
        .replace(/\D/g, "")
        .slice(-10);

    const email =
      form.email.trim();

    const pincode =
      form.pincode
        .replace(/\D/g, "");

    if (
      !name ||
      name.length < 2
    ) {
      return "Please enter a valid customer name.";
    }

    if (
      !/^[6-9]\d{9}$/.test(
        phone
      )
    ) {
      return "Please enter a valid 10 digit mobile number.";
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return "Please enter a valid email address.";
    }

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return "Please enter a valid 6 digit pincode.";
    }

    if (form.dateOfBirth) {
      const dob =
        new Date(
          `${form.dateOfBirth}T00:00:00.000Z`
        );

      if (
        Number.isNaN(
          dob.getTime()
        )
      ) {
        return "Please enter a valid date of birth.";
      }

      if (
        dob >
        new Date()
      ) {
        return "Date of birth cannot be in the future.";
      }
    }

    return "";
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE                                                                     */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!customerId) {
      window.alert(
        "Customer ID is missing."
      );

      return;
    }

    if (
      customer?.isActive ===
      false
    ) {
      window.alert(
        "This customer is inactive. Activate the customer before editing."
      );

      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      window.alert(
        validationError
      );

      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response =
        await fetch(
          `/api/customers/${customerId}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                form.name.trim(),

              phone:
                form.phone
                  .replace(
                    /\D/g,
                    ""
                  )
                  .slice(-10),

              email:
                form.email.trim() ||
                null,

              dateOfBirth:
                form.dateOfBirth ||
                null,

              gender:
                form.gender ||
                null,

              address:
                form.address.trim() ||
                null,

              district:
                form.district.trim() ||
                null,

              state:
                form.state.trim() ||
                null,

              pincode:
                form.pincode ||
                null,

              notes:
                form.notes.trim() ||
                null,
            }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
        customer?: Customer;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        window.alert(
          data.message ||
            "Unable to update customer."
        );

        return;
      }

      setMessage(
        data.message ||
          "Customer updated successfully."
      );

      window.alert(
        "Customer updated successfully."
      );

      router.push(
        "/customers"
      );

      router.refresh();
    } catch {
      window.alert(
        "Unable to update customer. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black text-slate-950">
              Loading customer...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* LOAD ERROR                                                               */
  /* ------------------------------------------------------------------------ */

  if (
    error &&
    !customer
  ) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-black text-red-800">
              Unable to Open Customer
            </h1>

            <p className="mt-3 font-semibold text-slate-800">
              {error}
            </p>

            <Link
              href="/customers"
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-black text-white"
            >
              ← Back to Customers
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PAGE                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-5">

          <div className="flex items-center gap-3">

            <Link
              href="/customers"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-black text-slate-950"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                Customer Management
              </p>

              <h1 className="text-2xl font-black text-slate-950">
                Edit Customer
              </h1>

              {customer && (
                <p className="mt-1 text-sm font-bold text-slate-600">
                  Customer ID:{" "}
                  {customer.customerId}
                </p>
              )}
            </div>

          </div>

          {customer &&
            customer.isActive !== false && (
              <Link
                href={`/policies/add?customerId=${encodeURIComponent(
                  customer.id
                )}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-800"
              >
                + Add Policy
              </Link>
            )}

        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-3xl px-4 py-6">

        {customer?.isActive ===
          false && (
          <div className="mb-5 rounded-2xl border border-orange-300 bg-orange-50 p-4">

            <p className="font-black text-orange-900">
              Customer is inactive
            </p>

            {customer.inactiveReason && (
              <p className="mt-1 text-sm font-bold text-orange-800">
                Reason:{" "}
                {
                  customer.inactiveReason
                }
              </p>
            )}

            <p className="mt-2 text-sm font-semibold text-orange-800">
              Activate this customer before editing or adding a policy.
            </p>

          </div>
        )}

        {customer &&
          customer.isActive !== false && (
            <div className="mb-5 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Insurance
                  </p>

                  <h2 className="mt-1 text-lg font-black text-slate-950">
                    Add Policy for {customer.name}
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Customer will be selected automatically on the policy page.
                  </p>
                </div>

                <Link
                  href={`/policies/add?customerId=${encodeURIComponent(
                    customer.id
                  )}`}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-800"
                >
                  + Add Policy
                </Link>

              </div>

            </div>
          )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-800">
            ✅ {message}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
        >

          {/* NAME */}

          <div>

            <label
              htmlFor="name"
              className="block text-sm font-black text-slate-950"
            >
              Customer Name *
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={
                form.name
              }
              onChange={
                handleChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              placeholder="Enter customer name"
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

          </div>

          {/* MOBILE */}

          <div className="mt-5">

            <label
              htmlFor="phone"
              className="block text-sm font-black text-slate-950"
            >
              Mobile Number *
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={
                form.phone
              }
              onChange={
                handlePhoneChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              maxLength={10}
              placeholder="10 digit mobile number"
              autoComplete="tel"
              className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

          </div>

          {/* EMAIL */}

          <div className="mt-5">

            <label
              htmlFor="email"
              className="block text-sm font-black text-slate-950"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={
                form.email
              }
              onChange={
                handleChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              placeholder="Enter email address"
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

          </div>

          {/* DATE OF BIRTH */}

          <div className="mt-5">

            <label
              htmlFor="dateOfBirth"
              className="block text-sm font-black text-slate-950"
            >
              Date of Birth
            </label>

            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={
                form.dateOfBirth
              }
              onChange={
                handleChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              max={
                new Date()
                  .toISOString()
                  .slice(
                    0,
                    10
                  )
              }
              className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

            <p className="mt-2 text-xs font-semibold text-slate-600">
              Used for birthday reminders
            </p>

          </div>

          {/* GENDER */}

          <div className="mt-5">

            <label
              htmlFor="gender"
              className="block text-sm font-black text-slate-950"
            >
              Gender
            </label>

            <select
              id="gender"
              name="gender"
              value={
                form.gender
              }
              onChange={
                handleChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            >

              <option value="">
                Select gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>

              <option value="Other">
                Other
              </option>

            </select>

          </div>

          {/* ADDRESS */}

          <div className="mt-5">

            <label
              htmlFor="address"
              className="block text-sm font-black text-slate-950"
            >
              Address
            </label>

            <textarea
              id="address"
              name="address"
              value={
                form.address
              }
              onChange={
                handleChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              rows={4}
              placeholder="House name, street, place..."
              autoComplete="street-address"
              className="mt-2 w-full resize-y rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

          </div>

          {/* DISTRICT */}

          <div className="mt-5">

            <label
              htmlFor="district"
              className="block text-sm font-black text-slate-950"
            >
              District
            </label>

            <input
              id="district"
              name="district"
              type="text"
              value={
                form.district
              }
              onChange={
                handleChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              placeholder="Example: Ernakulam"
              className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

          </div>

          {/* STATE */}

          <div className="mt-5">

            <label
              htmlFor="state"
              className="block text-sm font-black text-slate-950"
            >
              State
            </label>

            <input
              id="state"
              name="state"
              type="text"
              value={
                form.state
              }
              onChange={
                handleChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              placeholder="Example: Kerala"
              className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

          </div>

          {/* PINCODE */}

          <div className="mt-5">

            <label
              htmlFor="pincode"
              className="block text-sm font-black text-slate-950"
            >
              Pincode
            </label>

            <input
              id="pincode"
              name="pincode"
              type="text"
              inputMode="numeric"
              value={
                form.pincode
              }
              onChange={
                handlePincodeChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              maxLength={6}
              placeholder="6 digit pincode"
              autoComplete="postal-code"
              className="mt-2 w-full rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

          </div>

          {/* NOTES */}

          <div className="mt-5">

            <label
              htmlFor="notes"
              className="block text-sm font-black text-slate-950"
            >
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              value={
                form.notes
              }
              onChange={
                handleChange
              }
              disabled={
                customer?.isActive ===
                false
              }
              rows={5}
              placeholder="Enter customer notes..."
              className="mt-2 w-full resize-y rounded-xl border border-slate-400 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 caret-blue-700 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600"
            />

          </div>

          {/* BUTTONS */}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row">

            <Link
              href="/customers"
              className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-black text-slate-950"
            >
              Cancel
            </Link>

            {customer &&
              customer.isActive !==
                false && (
                <Link
                  href={`/policies/add?customerId=${encodeURIComponent(
                    customer.id
                  )}`}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-center font-black text-blue-800 transition hover:bg-blue-100"
                >
                  + Add Policy
                </Link>
              )}

            <button
              type="submit"
              disabled={
                saving ||
                customer?.isActive ===
                  false
              }
              className="min-h-12 flex-1 rounded-xl bg-blue-700 px-5 py-3 font-black text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white"
            >
              {saving
                ? "Saving Customer..."
                : "Save Customer"}
            </button>

          </div>

        </form>

      </section>

    </main>
  );
}