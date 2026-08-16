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

type SubAgent = {
  id: string;
  userId?: string;

  code: string;
  name: string;

  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;

  address?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;

  notes?: string | null;

  isActive?: boolean;
};

/* -------------------------------------------------------------------------- */
/* DISTRICTS                                                                  */
/* -------------------------------------------------------------------------- */

const KERALA_DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
];

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function EditSubAgentPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const subAgentId =
    String(
      params?.id || ""
    );

  const [
    userId,
    setUserId,
  ] = useState("");

  const [
    code,
    setCode,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    pinLoading,
    setPinLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    sameWhatsApp,
    setSameWhatsApp,
  ] = useState(true);

  const [
    form,
    setForm,
  ] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    district: "",
    state: "Kerala",
    pincode: "",
    notes: "",
  });

  /* ------------------------------------------------------------------------ */
  /* LOAD SUB AGENT                                                           */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadSubAgent() {
      try {
        setLoading(true);
        setError("");

        let currentUserId =
          localStorage.getItem(
            "userId"
          );

        if (!currentUserId) {
          const savedUser =
            localStorage.getItem(
              "agentUser"
            );

          if (savedUser) {
            try {
              const parsed =
                JSON.parse(
                  savedUser
                );

              if (parsed?.id) {
                currentUserId =
                  String(
                    parsed.id
                  );

                localStorage.setItem(
                  "userId",
                  currentUserId
                );
              }
            } catch {
              currentUserId =
                null;
            }
          }
        }

        if (!currentUserId) {
          router.replace(
            "/login"
          );

          return;
        }

        setUserId(
          currentUserId
        );

        const response =
          await fetch(
            `/api/sub-agents?userId=${encodeURIComponent(
              currentUserId
            )}&subAgentId=${encodeURIComponent(
              subAgentId
            )}&activeOnly=false`,
            {
              cache:
                "no-store",
            }
          );

        let data: {
          success?: boolean;
          message?: string;
          subAgent?: SubAgent;
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
          !data.subAgent
        ) {
          throw new Error(
            data.message ||
              "Unable to load Sub-Agent."
          );
        }

        const subAgent =
          data.subAgent;

        setCode(
          subAgent.code || ""
        );

        const phone =
          String(
            subAgent.phone || ""
          )
            .replace(/\D/g, "")
            .slice(-10);

        const whatsapp =
          String(
            subAgent.whatsapp || ""
          )
            .replace(/\D/g, "")
            .slice(-10);

        const whatsappIsSame =
          !whatsapp ||
          whatsapp === phone;

        setSameWhatsApp(
          whatsappIsSame
        );

        setForm({
          name:
            subAgent.name || "",

          phone,

          whatsapp:
            whatsapp || phone,

          email:
            subAgent.email || "",

          address:
            subAgent.address || "",

          district:
            subAgent.district || "",

          state:
            subAgent.state ||
            "Kerala",

          pincode:
            subAgent.pincode || "",

          notes:
            subAgent.notes || "",
        });
      } catch (error) {
        console.error(
          "LOAD SUB AGENT ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load Sub-Agent."
        );
      } finally {
        setLoading(false);
      }
    }

    if (subAgentId) {
      void loadSubAgent();
    }
  }, [
    router,
    subAgentId,
  ]);

  /* ------------------------------------------------------------------------ */
  /* FIELD UPDATE                                                             */
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
      (previous) => ({
        ...previous,

        [name]:
          value,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* MOBILE                                                                   */
  /* ------------------------------------------------------------------------ */

  function handlePhoneChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 10);

    setForm(
      (previous) => ({
        ...previous,

        phone:
          value,

        whatsapp:
          sameWhatsApp
            ? value
            : previous.whatsapp,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* WHATSAPP                                                                 */
  /* ------------------------------------------------------------------------ */

  function handleWhatsAppChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 10);

    setForm(
      (previous) => ({
        ...previous,

        whatsapp:
          value,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SAME WHATSAPP                                                            */
  /* ------------------------------------------------------------------------ */

  function handleSameWhatsAppChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const checked =
      event.target.checked;

    setSameWhatsApp(
      checked
    );

    if (checked) {
      setForm(
        (previous) => ({
          ...previous,

          whatsapp:
            previous.phone,
        })
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* PINCODE                                                                  */
  /* ------------------------------------------------------------------------ */

  async function lookupPincode(
    pincode: string
  ) {
    if (
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return;
    }

    try {
      setPinLoading(true);

      const response =
        await fetch(
          `https://api.postalpincode.in/pincode/${pincode}`
        );

      const data =
        await response.json();

      if (
        Array.isArray(data) &&
        data[0]?.Status ===
          "Success" &&
        data[0]?.PostOffice
          ?.length > 0
      ) {
        const office =
          data[0]
            .PostOffice[0];

        setForm(
          (previous) => ({
            ...previous,

            district:
              office.District ||
              previous.district,

            state:
              office.State ||
              previous.state,
          })
        );
      }
    } catch (error) {
      console.error(
        "PINCODE LOOKUP ERROR:",
        error
      );
    } finally {
      setPinLoading(false);
    }
  }

  function handlePincodeChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 6);

    setForm(
      (previous) => ({
        ...previous,

        pincode:
          value,
      })
    );

    if (
      value.length ===
      6
    ) {
      void lookupPincode(
        value
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE                                                                     */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !form.name.trim()
    ) {
      setError(
        "Sub-Agent name is required."
      );

      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        form.phone
      )
    ) {
      setError(
        "Mobile number is mandatory. Enter a valid 10 digit mobile number."
      );

      return;
    }

    const finalWhatsApp =
      sameWhatsApp
        ? form.phone
        : form.whatsapp;

    if (
      finalWhatsApp &&
      !/^[6-9]\d{9}$/.test(
        finalWhatsApp
      )
    ) {
      setError(
        "Please enter a valid 10 digit WhatsApp number."
      );

      return;
    }

    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      setError(
        "Please enter a valid email address."
      );

      return;
    }

    if (
      form.pincode &&
      !/^\d{6}$/.test(
        form.pincode
      )
    ) {
      setError(
        "Please enter a valid 6 digit pincode."
      );

      return;
    }

    if (!userId) {
      setError(
        "Login information not found."
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/sub-agents",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId,

                subAgentId,

                name:
                  form.name.trim(),

                phone:
                  form.phone,

                whatsapp:
                  finalWhatsApp ||
                  null,

                email:
                  form.email.trim()
                    ? form.email
                        .trim()
                        .toLowerCase()
                    : null,

                address:
                  form.address.trim() ||
                  null,

                district:
                  form.district ||
                  null,

                state:
                  form.state ||
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
        subAgent?: SubAgent;
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
        setError(
          data.message ||
            "Unable to update Sub-Agent."
        );

        return;
      }

      setMessage(
        data.message ||
          "Sub-Agent updated successfully."
      );

      window.setTimeout(
        () => {
          router.push(
            `/sub-agents/${subAgentId}`
          );

          router.refresh();
        },
        700
      );
    } catch (error) {
      console.error(
        "UPDATE SUB AGENT ERROR:",
        error
      );

      setError(
        "Unable to update Sub-Agent."
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="text-5xl">
            🤝
          </div>

          <p className="mt-3 font-black text-slate-700">
            Loading Sub-Agent...
          </p>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PAGE                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">

      <div className="mx-auto max-w-3xl">

        <button
          type="button"
          onClick={() =>
            router.push(
              `/sub-agents/${subAgentId}`
            )
          }
          className="mb-6 font-black text-blue-700 hover:underline"
        >
          ← Back to Sub-Agent
        </button>

        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">

          {/* HEADER */}

          <div className="border-b bg-gradient-to-r from-violet-50 to-blue-50 px-6 py-7 md:px-8">

            <p className="text-xs font-black uppercase tracking-wider text-violet-700">
              Sub-Agent Management
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Edit Sub-Agent
            </h1>

            {code && (
              <p className="mt-2 font-black text-blue-700">
                {code}
              </p>
            )}

          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5 p-6 md:p-8"
          >

            {/* CODE */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Sub-Agent Code
              </label>

              <input
                value={
                  code
                }
                readOnly
                className="w-full rounded-xl border bg-slate-100 px-4 py-3 font-bold text-slate-700"
              />

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Sub-Agent code cannot be changed.
              </p>

            </div>

            {/* NAME */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Sub-Agent Name *
              </label>

              <input
                type="text"
                name="name"
                value={
                  form.name
                }
                onChange={
                  updateField
                }
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

            </div>

            {/* MOBILE */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Mobile Number *
              </label>

              <input
                type="tel"
                inputMode="numeric"
                value={
                  form.phone
                }
                onChange={
                  handlePhoneChange
                }
                maxLength={
                  10
                }
                required
                placeholder="Enter 10 digit mobile number"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

            </div>

            {/* SAME WHATSAPP */}

            <label className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4">

              <input
                type="checkbox"
                checked={
                  sameWhatsApp
                }
                onChange={
                  handleSameWhatsAppChange
                }
                className="h-5 w-5"
              />

              <span className="font-black text-slate-900">
                WhatsApp number same as mobile
              </span>

            </label>

            {/* WHATSAPP */}

            {!sameWhatsApp && (
              <div>

                <label className="mb-2 block text-sm font-black">
                  WhatsApp Number
                </label>

                <input
                  type="tel"
                  inputMode="numeric"
                  value={
                    form.whatsapp
                  }
                  onChange={
                    handleWhatsAppChange
                  }
                  maxLength={
                    10
                  }
                  placeholder="Enter WhatsApp number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />

              </div>
            )}

            {/* EMAIL */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={
                  form.email
                }
                onChange={
                  updateField
                }
                placeholder="Enter email address"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

            </div>

            {/* ADDRESS */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Address
              </label>

              <textarea
                name="address"
                value={
                  form.address
                }
                onChange={
                  updateField
                }
                rows={
                  3
                }
                placeholder="Enter address"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

            </div>

            {/* PINCODE */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Pincode
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={
                  form.pincode
                }
                onChange={
                  handlePincodeChange
                }
                maxLength={
                  6
                }
                placeholder="Enter 6 digit pincode"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              {pinLoading && (
                <p className="mt-2 text-sm font-bold text-blue-700">
                  Finding district and state...
                </p>
              )}

            </div>

            {/* DISTRICT */}

            <div>

              <label className="mb-2 block text-sm font-black">
                District
              </label>

              <select
                name="district"
                value={
                  form.district
                }
                onChange={
                  updateField
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >

                <option value="">
                  Select District
                </option>

                {KERALA_DISTRICTS.map(
                  (
                    district
                  ) => (
                    <option
                      key={
                        district
                      }
                      value={
                        district
                      }
                    >
                      {district}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* STATE */}

            <div>

              <label className="mb-2 block text-sm font-black">
                State
              </label>

              <input
                type="text"
                name="state"
                value={
                  form.state
                }
                onChange={
                  updateField
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

            </div>

            {/* NOTES */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Notes
              </label>

              <textarea
                name="notes"
                value={
                  form.notes
                }
                onChange={
                  updateField
                }
                rows={
                  4
                }
                placeholder="Additional information"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

            </div>

            {/* ERROR */}

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
                ⚠️ {error}
              </div>
            )}

            {/* SUCCESS */}

            {message && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-800">
                ✅ {message}
              </div>
            )}

            {/* BUTTONS */}

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/sub-agents/${subAgentId}`
                  )
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving Changes..."
                  : "💾 Save Changes"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </main>
  );
}