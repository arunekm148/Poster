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

type Customer = {
  id: string;
  customerId: string;
  userId: string;

  name: string;
  phone: string;
  email: string | null;

  dateOfBirth: string | null;
  gender: string | null;

  address: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;

  notes: string | null;
};

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();

  const id = String(params.id || "");

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [gender, setGender] = useState("");

  const [address, setAddress] =
    useState("");

  const [district, setDistrict] =
    useState("");

  const [state, setState] =
    useState("");

  const [pincode, setPincode] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD CUSTOMER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!id) return;

    loadCustomer();
  }, [id]);

  async function loadCustomer() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/customers/${encodeURIComponent(id)}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load customer."
        );
      }

      const item: Customer = data.customer;

      setCustomer(item);

      setName(item.name || "");
      setPhone(item.phone || "");
      setEmail(item.email || "");

      if (item.dateOfBirth) {
        const date =
          item.dateOfBirth.split("T")[0];

        setDateOfBirth(date);
      } else {
        setDateOfBirth("");
      }

      setGender(item.gender || "");
      setAddress(item.address || "");
      setDistrict(item.district || "");
      setState(item.state || "");
      setPincode(item.pincode || "");
      setNotes(item.notes || "");
    } catch (error) {
      console.error(
        "LOAD CUSTOMER ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load customer."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SAVE CUSTOMER
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");

    const cleanPhone = phone
      .replace(/\D/g, "")
      .slice(-10);

    const cleanPincode = pincode
      .replace(/\D/g, "")
      .slice(0, 6);

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!name.trim()) {
      setMessage(
        "Customer name is required."
      );
      return;
    }

    if (name.trim().length < 2) {
      setMessage(
        "Please enter a valid customer name."
      );
      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(cleanPhone)
    ) {
      setMessage(
        "Please enter a valid 10 digit mobile number."
      );
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setMessage(
        "Please enter a valid email address."
      );
      return;
    }

    if (
      cleanPincode &&
      !/^\d{6}$/.test(cleanPincode)
    ) {
      setMessage(
        "Please enter a valid 6 digit pincode."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/customers/${encodeURIComponent(id)}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),
            phone: cleanPhone,

            email:
              email.trim() || null,

            dateOfBirth:
              dateOfBirth || null,

            gender:
              gender || null,

            address:
              address.trim() || null,

            district:
              district.trim() || null,

            state:
              state.trim() || null,

            pincode:
              cleanPincode || null,

            notes:
              notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to update customer."
        );
      }

      setMessage(
        "Customer updated successfully."
      );

      setTimeout(() => {
        router.push("/customers");
        router.refresh();
      }, 700);
    } catch (error) {
      console.error(
        "UPDATE CUSTOMER ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update customer."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING SCREEN
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="mb-3 text-4xl">
              👤
            </div>

            <p className="text-gray-500">
              Loading customer...
            </p>

          </div>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CUSTOMER NOT FOUND
  |--------------------------------------------------------------------------
  */

  if (!customer) {
    return (
      <main className="min-h-screen bg-gray-50 p-4">

        <div className="mx-auto max-w-3xl">

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="mb-3 text-5xl">
              ⚠️
            </div>

            <h1 className="text-xl font-bold">
              Customer Not Found
            </h1>

            <p className="mt-3 text-red-600">
              {message}
            </p>

            <button
              onClick={() =>
                router.push("/customers")
              }
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
            >
              Back to Customers
            </button>

          </div>

        </div>

      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | EDIT FORM
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-24">

      <div className="mx-auto max-w-3xl">

        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            router.push("/customers")
          }
          className="mb-5 text-sm font-semibold text-blue-600"
        >
          ← Back to Customers
        </button>

        {/* HEADER */}

        <div className="mb-6">

          <h1 className="text-2xl font-bold text-gray-900">
            Edit Customer
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Update customer information
          </p>

        </div>

        {/* CUSTOMER ID */}

        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Customer ID
          </p>

          <p className="mt-1 text-lg font-bold text-blue-900">
            {customer.customerId}
          </p>

          <p className="mt-1 text-xs text-blue-600">
            Customer ID cannot be changed
          </p>

        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
        >

          {/* NAME */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              Customer Name *
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter customer name"
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          {/* PHONE */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              Mobile Number *
            </label>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(event) => {
                const value =
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10);

                setPhone(value);
              }}
              placeholder="Enter mobile number"
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          {/* EMAIL */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter email address"
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          {/* DOB */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              Date of Birth
            </label>

            <input
              type="date"
              value={dateOfBirth}
              onChange={(event) =>
                setDateOfBirth(
                  event.target.value
                )
              }
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-gray-400">
              Used for birthday reminders
            </p>

          </div>

          {/* GENDER */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              Gender
            </label>

            <select
              value={gender}
              onChange={(event) =>
                setGender(event.target.value)
              }
              className="w-full rounded-xl border bg-white p-3 outline-none focus:border-blue-500"
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

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              Address
            </label>

            <textarea
              value={address}
              onChange={(event) =>
                setAddress(
                  event.target.value
                )
              }
              placeholder="Enter customer address"
              rows={3}
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          {/* DISTRICT */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              District
            </label>

            <input
              type="text"
              value={district}
              onChange={(event) =>
                setDistrict(
                  event.target.value
                )
              }
              placeholder="Enter district"
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
            />

          </div>

          {/* STATE */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              State
            </label>

            <input
              type="text"
              value={state}
              onChange={(event) =>
                setState(event.target.value)
              }
              placeholder="Enter state"
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
            />

          </div>

          {/* PINCODE */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              Pincode
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(event) => {
                const value =
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

                setPincode(value);
              }}
              placeholder="Enter pincode"
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
            />

          </div>

          {/* NOTES */}

          <div>

            <label className="mb-2 block font-medium text-gray-700">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Customer notes"
              rows={4}
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
            />

          </div>

          {/* MESSAGE */}

          {message && (
            <div
              className={`rounded-xl border p-3 text-center text-sm ${
                message.includes(
                  "successfully"
                )
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* BUTTONS */}

          <div className="flex gap-3 pt-2">

            <button
              type="button"
              onClick={() =>
                router.push("/customers")
              }
              className="flex-1 rounded-xl border border-gray-300 p-3 font-semibold text-gray-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}