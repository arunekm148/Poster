"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type ExistingSubAgent = {
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

  _count?: {
    customers?: number;
  };
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

export default function AddSubAgentPage() {
  const router =
    useRouter();

  const [
    userId,
    setUserId,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    lookupLoading,
    setLookupLoading,
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
    matches,
    setMatches,
  ] = useState<
    ExistingSubAgent[]
  >([]);

  /*
   * Existing selected/autofilled record.
   */

  const [
    existingSubAgent,
    setExistingSubAgent,
  ] = useState<
    ExistingSubAgent | null
  >(null);

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
  /* USER                                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let savedUserId =
      localStorage.getItem(
        "userId"
      );

    if (!savedUserId) {
      const storedUser =
        localStorage.getItem(
          "agentUser"
        );

      if (storedUser) {
        try {
          const parsed =
            JSON.parse(
              storedUser
            );

          if (parsed?.id) {
            savedUserId =
              String(
                parsed.id
              );

            localStorage.setItem(
              "userId",
              savedUserId
            );
          }
        } catch {
          // Ignore.
        }
      }
    }

    if (savedUserId) {
      setUserId(
        savedUserId
      );
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LIVE NAME LOOKUP                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const name =
      form.name.trim();

    if (
      !userId ||
      name.length < 2
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          lookupByName(
            name
          );
        },
        300
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    form.name,
    userId,
  ]);

  /* ------------------------------------------------------------------------ */
  /* LIVE PHONE LOOKUP                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const phone =
      form.phone;

    if (
      !userId ||
      phone.length < 7
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          lookupByPhone(
            phone
          );
        },
        300
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    form.phone,
    userId,
  ]);

  /* ------------------------------------------------------------------------ */
  /* LOOKUP NAME                                                              */
  /* ------------------------------------------------------------------------ */

  async function lookupByName(
    name: string
  ) {
    try {
      setLookupLoading(
        true
      );

      const response =
        await fetch(
          `/api/sub-agents?userId=${encodeURIComponent(
            userId
          )}&namePrefix=${encodeURIComponent(
            name
          )}`,
          {
            cache:
              "no-store",
          }
        );

      let data: {
        success?: boolean;
        subAgents?: ExistingSubAgent[];
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
        return;
      }

      const list =
        Array.isArray(
          data.subAgents
        )
          ? data.subAgents
          : [];

      setMatches(
        list
      );

      /*
       * AUTO POPULATE:
       *
       * Only when exactly one record
       * has exactly the same name.
       */

      const exact =
        list.filter(
          (item) =>
            item.name
              .trim()
              .toLowerCase() ===
            name
              .trim()
              .toLowerCase()
        );

      if (
        exact.length === 1
      ) {
        populateExistingSubAgent(
          exact[0]
        );
      }
    } catch (error) {
      console.error(
        "SUB AGENT NAME LOOKUP ERROR:",
        error
      );
    } finally {
      setLookupLoading(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOOKUP PHONE                                                             */
  /* ------------------------------------------------------------------------ */

  async function lookupByPhone(
    phone: string
  ) {
    try {
      setLookupLoading(
        true
      );

      const response =
        await fetch(
          `/api/sub-agents?userId=${encodeURIComponent(
            userId
          )}&phonePrefix=${encodeURIComponent(
            phone
          )}`,
          {
            cache:
              "no-store",
          }
        );

      let data: {
        success?: boolean;
        subAgents?: ExistingSubAgent[];
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
        return;
      }

      const list =
        Array.isArray(
          data.subAgents
        )
          ? data.subAgents
          : [];

      setMatches(
        list
      );

      /*
       * Exact 10 digit mobile:
       * automatically populate existing.
       */

      if (
        phone.length === 10
      ) {
        const exact =
          list.filter(
            (item) =>
              item.phone ===
                phone ||
              item.whatsapp ===
                phone
          );

        if (
          exact.length === 1
        ) {
          populateExistingSubAgent(
            exact[0]
          );
        }
      }
    } catch (error) {
      console.error(
        "SUB AGENT MOBILE LOOKUP ERROR:",
        error
      );
    } finally {
      setLookupLoading(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* POPULATE EXISTING SUB-AGENT                                              */
  /* ------------------------------------------------------------------------ */

  function populateExistingSubAgent(
    subAgent:
      ExistingSubAgent
  ) {
    setExistingSubAgent(
      subAgent
    );

    const mobile =
      subAgent.phone || "";

    const whatsapp =
      subAgent.whatsapp || "";

    const whatsappSame =
      Boolean(
        mobile &&
        whatsapp &&
        mobile ===
          whatsapp
      );

    setSameWhatsApp(
      whatsappSame
    );

    setForm({
      name:
        subAgent.name || "",

      phone:
        mobile,

      whatsapp:
        whatsapp,

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

    setError("");

    setMessage(
      `Existing Sub-Agent found: ${subAgent.code} - ${subAgent.name}`
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CLEAR EXISTING SELECTION                                                 */
  /* ------------------------------------------------------------------------ */

  function clearExistingSubAgent() {
    setExistingSubAgent(
      null
    );

    setMatches(
      []
    );

    setMessage("");

    setForm({
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

    setSameWhatsApp(
      true
    );
  }

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

    /*
     * Once user manually changes an
     * existing auto-filled record,
     * clear existing state.
     */

    if (
      existingSubAgent &&
      name === "name" &&
      value !==
        existingSubAgent.name
    ) {
      setExistingSubAgent(
        null
      );

      setMessage("");
    }

    setForm(
      (previous) => ({
        ...previous,

        [name]:
          value,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PHONE                                                                    */
  /* ------------------------------------------------------------------------ */

  function handlePhoneChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const value =
      event.target.value
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          10
        );

    if (
      existingSubAgent &&
      value !==
        existingSubAgent.phone
    ) {
      setExistingSubAgent(
        null
      );

      setMessage("");
    }

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

    if (
      value.length < 7
    ) {
      setMatches(
        []
      );
    }
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
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          10
        );

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
  /* PINCODE LOOKUP                                                           */
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
      setPinLoading(
        true
      );

      const response =
        await fetch(
          `https://api.postalpincode.in/pincode/${pincode}`
        );

      const data =
        await response.json();

      if (
        Array.isArray(
          data
        ) &&
        data[0]?.Status ===
          "Success" &&
        data[0]?.PostOffice
          ?.length > 0
      ) {
        const postOffice =
          data[0]
            .PostOffice[0];

        setForm(
          (previous) => ({
            ...previous,

            district:
              postOffice.District ||
              previous.district,

            state:
              postOffice.State ||
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
      setPinLoading(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* PINCODE CHANGE                                                           */
  /* ------------------------------------------------------------------------ */

  function handlePincodeChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const value =
      event.target.value
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          6
        );

    setForm(
      (previous) => ({
        ...previous,

        pincode:
          value,
      })
    );

    if (
      value.length === 6
    ) {
      lookupPincode(
        value
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* SUBMIT                                                                   */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    /*
     * Existing selected record:
     * never create duplicate.
     */

    if (
      existingSubAgent
    ) {
      setError(
        `This Sub-Agent already exists as ${existingSubAgent.code}. Please use the existing Sub-Agent instead.`
      );

      return;
    }

    const currentUserId =
      localStorage.getItem(
        "userId"
      ) || userId;

    if (!currentUserId) {
      setError(
        "Login information not found. Please login again."
      );

      return;
    }

    if (
      !form.name.trim()
    ) {
      setError(
        "Sub-Agent name is required."
      );

      return;
    }

    if (
      form.phone &&
      !/^[6-9]\d{9}$/.test(
        form.phone
      )
    ) {
      setError(
        "Please enter a valid 10 digit mobile number."
      );

      return;
    }

    if (
      form.whatsapp &&
      !/^[6-9]\d{9}$/.test(
        form.whatsapp
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

    try {
      setLoading(
        true
      );

      const response =
        await fetch(
          "/api/sub-agents",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId:
                  currentUserId,

                name:
                  form.name.trim(),

                phone:
                  form.phone ||
                  null,

                whatsapp:
                  form.whatsapp ||
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

        duplicate?: boolean;

        subAgent?: ExistingSubAgent;
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
        if (
          data.duplicate &&
          data.subAgent
        ) {
          populateExistingSubAgent(
            data.subAgent
          );

          setError(
            data.message ||
              "This Sub-Agent already exists."
          );

          return;
        }

        setError(
          data.message ||
            "Unable to create Sub-Agent."
        );

        return;
      }

      setMessage(
        data.subAgent?.code
          ? `Sub-Agent ${data.subAgent.code} created successfully.`
          : "Sub-Agent created successfully."
      );

      window.setTimeout(
        () => {
          router.push(
            "/customers/add"
          );

          router.refresh();
        },
        700
      );
    } catch (error) {
      console.error(
        "CREATE SUB AGENT ERROR:",
        error
      );

      setError(
        "Unable to create Sub-Agent."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">

      <div className="mx-auto max-w-3xl">

        <button
          type="button"
          onClick={() =>
            router.push(
              "/customers/add"
            )
          }
          className="mb-6 font-bold text-blue-700 hover:underline"
        >
          ← Back to Add Customer
        </button>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="border-b bg-blue-50 px-6 py-7 md:px-8">

            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Agent Network
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Create Sub-Agent
            </h1>

            <p className="mt-2 font-semibold text-slate-600">
              Existing Sub-Agents are checked automatically by name and mobile.
            </p>

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
                  existingSubAgent
                    ? existingSubAgent.code
                    : "Auto Generated"
                }
                readOnly
                className="w-full rounded-xl border bg-slate-100 px-4 py-3 font-bold"
              />

            </div>

            {/* NAME */}

            <div className="relative">

              <label className="mb-2 block text-sm font-black">
                Sub-Agent Name *
              </label>

              <input
                name="name"
                value={
                  form.name
                }
                onChange={
                  updateField
                }
                placeholder="Enter Sub-Agent name"
                autoComplete="off"
                required
                className="w-full rounded-xl border px-4 py-3.5 font-semibold"
              />

              {lookupLoading && (
                <p className="mt-2 text-xs font-bold text-blue-700">
                  Checking existing Sub-Agents...
                </p>
              )}

              {form.name.length >=
                2 &&
                matches.length >
                  0 &&
                !existingSubAgent && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-orange-300 bg-white shadow-lg">

                    <div className="bg-orange-50 px-4 py-2 text-sm font-black text-orange-900">
                      Matching Sub-Agents
                    </div>

                    {matches.map(
                      (
                        subAgent
                      ) => (
                        <button
                          key={
                            subAgent.id
                          }
                          type="button"
                          onClick={() =>
                            populateExistingSubAgent(
                              subAgent
                            )
                          }
                          className="flex w-full justify-between border-t px-4 py-3 text-left hover:bg-slate-50"
                        >

                          <div>

                            <p className="font-black">
                              {
                                subAgent.name
                              }
                            </p>

                            <p className="text-sm font-semibold text-blue-700">
                              {
                                subAgent.code
                              }{" "}
                              •{" "}
                              {subAgent.phone ||
                                "No mobile"}
                            </p>

                          </div>

                          <span className="text-xs font-black text-blue-700">
                            Use Existing
                          </span>

                        </button>
                      )
                    )}

                  </div>
                )}

            </div>

            {/* EXISTING WARNING */}

            {existingSubAgent && (
              <div className="rounded-xl border border-orange-300 bg-orange-50 p-4">

                <p className="font-black text-orange-900">
                  Existing Sub-Agent Found
                </p>

                <p className="mt-1 text-sm font-bold text-orange-800">
                  {existingSubAgent.code} —{" "}
                  {existingSubAgent.name}
                </p>

                <p className="mt-1 text-sm text-orange-800">
                  Customers linked:{" "}
                  {existingSubAgent
                    ._count
                    ?.customers ??
                    0}
                </p>

                <button
                  type="button"
                  onClick={
                    clearExistingSubAgent
                  }
                  className="mt-3 rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-black text-orange-800"
                >
                  Clear and Create Different Sub-Agent
                </button>

              </div>
            )}

            {/* MOBILE */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Mobile Number
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
                placeholder="Enter mobile number"
                autoComplete="off"
                className="w-full rounded-xl border px-4 py-3.5 font-semibold"
              />

            </div>

            {/* WHATSAPP SAME */}

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

              <span className="font-black">
                WhatsApp number same as mobile
              </span>

            </label>

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
                  className="w-full rounded-xl border px-4 py-3.5"
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
                className="w-full rounded-xl border px-4 py-3.5"
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
                className="w-full rounded-xl border px-4 py-3.5"
              />

            </div>

            {/* PINCODE */}

            <div>

              <label className="mb-2 block text-sm font-black">
                Pincode
              </label>

              <input
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
                className="w-full rounded-xl border px-4 py-3.5"
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
                className="w-full rounded-xl border px-4 py-3.5"
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
                      {
                        district
                      }
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
                name="state"
                value={
                  form.state
                }
                onChange={
                  updateField
                }
                className="w-full rounded-xl border px-4 py-3.5"
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
                className="w-full rounded-xl border px-4 py-3.5"
              />

            </div>

            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-800">
                {message}
              </div>
            )}

            <div className="flex gap-3 border-t pt-5">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/customers/add"
                  )
                }
                className="rounded-xl border px-5 py-3 font-black"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  loading ||
                  Boolean(
                    existingSubAgent
                  )
                }
                className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {existingSubAgent
                  ? "Existing Sub-Agent"
                  : loading
                    ? "Creating..."
                    : "Create Sub-Agent"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </main>
  );
}