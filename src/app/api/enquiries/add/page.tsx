"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Customer = {
  id: string;
  customerId?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type CustomerApiResponse = {
  success?: boolean;
  message?: string;
  customers?: Customer[];
  data?: Customer[];
};

/* -------------------------------------------------------------------------- */
/* GET LOGGED-IN USER                                                         */
/* -------------------------------------------------------------------------- */

function getLoggedInUserId() {
  if (typeof window === "undefined") {
    return "";
  }

  /*
    First check userId.
  */

  const directUserId =
    localStorage.getItem("userId");

  if (directUserId?.trim()) {
    return directUserId.trim();
  }

  /*
    Check "user".
  */

  const storedUser =
    localStorage.getItem("user");

  if (storedUser) {
    try {
      const parsed =
        JSON.parse(storedUser);

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
    } catch (error) {
      console.error(
        "Unable to read user:",
        error
      );
    }
  }

  /*
    Check "agentUser".
  */

  const agentUser =
    localStorage.getItem(
      "agentUser"
    );

  if (agentUser) {
    try {
      const parsed =
        JSON.parse(agentUser);

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
    } catch (error) {
      console.error(
        "Unable to read agentUser:",
        error
      );
    }
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* TODAY                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AddEnquiryPage() {
  const router =
    useRouter();

  const [userId, setUserId] =
    useState("");

  const [
    customers,
    setCustomers,
  ] =
    useState<Customer[]>([]);

  const [
    loadingCustomers,
    setLoadingCustomers,
  ] =
    useState(true);

  const [
    customerId,
    setCustomerId,
  ] =
    useState("");

  const [
    businessType,
    setBusinessType,
  ] =
    useState("");

  const [
    requirement,
    setRequirement,
  ] =
    useState("");

  const [
    remarks,
    setRemarks,
  ] =
    useState("");

  const [
    enquiryDate,
    setEnquiryDate,
  ] =
    useState(
      todayForInput()
    );

  const [
    nextFollowUpDate,
    setNextFollowUpDate,
  ] =
    useState("");

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

  const [
    success,
    setSuccess,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* LOAD USER + CUSTOMERS                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const activeUserId =
      getLoggedInUserId();

    if (!activeUserId) {
      setError(
        "Agent login information not found. Please login again."
      );

      setLoadingCustomers(
        false
      );

      return;
    }

    setUserId(
      activeUserId
    );

    loadCustomers(
      activeUserId
    );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOAD CUSTOMERS                                                           */
  /* ------------------------------------------------------------------------ */

  async function loadCustomers(
    activeUserId: string
  ) {
    try {
      setLoadingCustomers(
        true
      );

      setError("");

      const response =
        await fetch(
          `/api/customers?userId=${encodeURIComponent(
            activeUserId
          )}`,
          {
            cache:
              "no-store",
          }
        );

      const data:
        CustomerApiResponse |
        Customer[] =
        await response.json();

      if (!response.ok) {
        const message =
          !Array.isArray(data)
            ? data.message
            : "";

        throw new Error(
          message ||
            "Unable to load customers."
        );
      }

      /*
        Support:
        [ ...customers ]

        {
          success: true,
          customers: [...]
        }

        {
          success: true,
          data: [...]
        }
      */

      if (
        Array.isArray(data)
      ) {
        setCustomers(
          data
        );

        return;
      }

      if (
        data.success ===
        false
      ) {
        throw new Error(
          data.message ||
            "Unable to load customers."
        );
      }

      if (
        Array.isArray(
          data.customers
        )
      ) {
        setCustomers(
          data.customers
        );

        return;
      }

      if (
        Array.isArray(
          data.data
        )
      ) {
        setCustomers(
          data.data
        );

        return;
      }

      setCustomers([]);
    } catch (err) {
      console.error(
        "LOAD CUSTOMERS ERROR:",
        err
      );

      setCustomers([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customers."
      );
    } finally {
      setLoadingCustomers(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* SELECTED CUSTOMER                                                        */
  /* ------------------------------------------------------------------------ */

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id ===
        customerId
    );

  /* ------------------------------------------------------------------------ */
  /* SAVE ENQUIRY                                                             */
  /* ------------------------------------------------------------------------ */

  async function saveEnquiry(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const activeUserId =
        userId ||
        getLoggedInUserId();

      if (!activeUserId) {
        throw new Error(
          "Agent login information not found. Please login again."
        );
      }

      if (!customerId) {
        throw new Error(
          "Please select a customer."
        );
      }

      if (
        !businessType.trim()
      ) {
        throw new Error(
          "Please enter business type."
        );
      }

      if (!enquiryDate) {
        throw new Error(
          "Please select enquiry date."
        );
      }

      const payload = {
        userId:
          activeUserId,

        customerId,

        businessType:
          businessType.trim(),

        requirement:
          requirement.trim() ||
          null,

        remarks:
          remarks.trim() ||
          null,

        enquiryDate,

        nextFollowUpDate:
          nextFollowUpDate ||
          null,
      };

      console.log(
        "CREATE ENQUIRY:",
        payload
      );

      const response =
        await fetch(
          "/api/enquiries",
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

      const data =
        await response.json();

      console.log(
        "CREATE ENQUIRY RESPONSE:",
        data
      );

      if (
        !response.ok ||
        data.success ===
          false
      ) {
        throw new Error(
          data.message ||
            "Unable to create enquiry."
        );
      }

      setSuccess(
        data.message ||
          "Enquiry created successfully."
      );

      /*
        If API returns enquiry ID,
        open enquiry details.

        Otherwise return to enquiry list.
      */

      const newEnquiryId =
        data.enquiry?.id ||
        data.data?.id ||
        "";

      setTimeout(() => {
        if (
          newEnquiryId
        ) {
          router.push(
            `/enquiries/${newEnquiryId}`
          );

          return;
        }

        router.push(
          "/enquiries"
        );
      }, 700);
    } catch (err) {
      console.error(
        "SAVE ENQUIRY ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create enquiry."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* PAGE                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#f5f7fb",

        padding:
          "30px 18px 70px",

        color:
          "#111827",
      }}
    >
      <div
        style={{
          maxWidth:
            "900px",

          margin:
            "0 auto",
        }}
      >
        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            router.push(
              "/enquiries"
            )
          }
          style={{
            border:
              "1px solid #d1d5db",

            background:
              "#ffffff",

            color:
              "#111827",

            borderRadius:
              "9px",

            padding:
              "10px 17px",

            cursor:
              "pointer",

            marginBottom:
              "22px",

            fontWeight:
              600,
          }}
        >
          ← Back to Enquiries
        </button>

        {/* CARD */}

        <div
          style={{
            background:
              "#ffffff",

            borderRadius:
              "18px",

            padding:
              "30px",

            boxShadow:
              "0 6px 25px rgba(0,0,0,0.08)",

            border:
              "1px solid #e5e7eb",
          }}
        >
          {/* HEADER */}

          <div
            style={{
              marginBottom:
                "28px",
            }}
          >
            <h1
              style={{
                margin: 0,

                fontSize:
                  "28px",

                color:
                  "#111827",
              }}
            >
              New Enquiry
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",

                color:
                  "#6b7280",

                fontSize:
                  "15px",
              }}
            >
              Create a new customer enquiry
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div
              style={{
                background:
                  "#fef2f2",

                color:
                  "#b91c1c",

                border:
                  "1px solid #fecaca",

                padding:
                  "13px 15px",

                borderRadius:
                  "9px",

                marginBottom:
                  "20px",

                fontSize:
                  "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div
              style={{
                background:
                  "#f0fdf4",

                color:
                  "#166534",

                border:
                  "1px solid #bbf7d0",

                padding:
                  "13px 15px",

                borderRadius:
                  "9px",

                marginBottom:
                  "20px",

                fontSize:
                  "14px",

                fontWeight:
                  600,
              }}
            >
              ✅ {success}
            </div>
          )}

          <form
            onSubmit={
              saveEnquiry
            }
          >
            {/* CUSTOMER */}

            <section>
              <h2
                style={{
                  fontSize:
                    "19px",

                  margin:
                    "0 0 18px",
                }}
              >
                Customer
              </h2>

              <label
                style={
                  labelStyle
                }
              >
                Select Customer *
              </label>

              <select
                value={
                  customerId
                }
                onChange={(
                  event
                ) =>
                  setCustomerId(
                    event
                      .target
                      .value
                  )
                }
                required
                disabled={
                  loadingCustomers
                }
                style={
                  inputStyle
                }
              >
                <option value="">
                  {loadingCustomers
                    ? "Loading customers..."
                    : "Select customer"}
                </option>

                {customers.map(
                  (
                    customer
                  ) => (
                    <option
                      key={
                        customer.id
                      }
                      value={
                        customer.id
                      }
                    >
                      {
                        customer.name
                      }
                      {customer.phone
                        ? ` - ${customer.phone}`
                        : ""}
                      {customer.customerId
                        ? ` (${customer.customerId})`
                        : ""}
                    </option>
                  )
                )}
              </select>

              {!loadingCustomers &&
                customers.length ===
                  0 && (
                  <div
                    style={{
                      marginTop:
                        "12px",

                      background:
                        "#fffbeb",

                      border:
                        "1px solid #fde68a",

                      color:
                        "#92400e",

                      padding:
                        "12px",

                      borderRadius:
                        "8px",

                      fontSize:
                        "14px",
                    }}
                  >
                    No customers found. Please create a customer first.
                  </div>
                )}

              {/* CUSTOMER DETAILS */}

              {selectedCustomer && (
                <div
                  style={{
                    marginTop:
                      "15px",

                    background:
                      "#f9fafb",

                    border:
                      "1px solid #e5e7eb",

                    borderRadius:
                      "10px",

                    padding:
                      "15px",
                  }}
                >
                  <strong>
                    {
                      selectedCustomer.name
                    }
                  </strong>

                  {selectedCustomer.phone && (
                    <div
                      style={{
                        marginTop:
                          "6px",

                        color:
                          "#4b5563",

                        fontSize:
                          "14px",
                      }}
                    >
                      📱{" "}
                      {
                        selectedCustomer.phone
                      }
                    </div>
                  )}

                  {selectedCustomer.email && (
                    <div
                      style={{
                        marginTop:
                          "4px",

                        color:
                          "#4b5563",

                        fontSize:
                          "14px",
                      }}
                    >
                      ✉️{" "}
                      {
                        selectedCustomer.email
                      }
                    </div>
                  )}
                </div>
              )}
            </section>

            <hr
              style={{
                border: 0,

                borderTop:
                  "1px solid #e5e7eb",

                margin:
                  "28px 0",
              }}
            />

            {/* ENQUIRY DETAILS */}

            <section>
              <h2
                style={{
                  fontSize:
                    "19px",

                  margin:
                    "0 0 18px",
                }}
              >
                Enquiry Information
              </h2>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",

                  gap:
                    "18px",
                }}
              >
                {/* BUSINESS TYPE */}

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Business Type *
                  </label>

                  <input
                    type="text"
                    value={
                      businessType
                    }
                    onChange={(
                      event
                    ) =>
                      setBusinessType(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Example: Motor Insurance"
                    required
                    style={
                      inputStyle
                    }
                  />
                </div>

                {/* ENQUIRY DATE */}

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Enquiry Date *
                  </label>

                  <input
                    type="date"
                    value={
                      enquiryDate
                    }
                    onChange={(
                      event
                    ) =>
                      setEnquiryDate(
                        event
                          .target
                          .value
                      )
                    }
                    required
                    style={
                      inputStyle
                    }
                  />
                </div>

                {/* NEXT FOLLOW-UP */}

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Next Follow-up Date
                  </label>

                  <input
                    type="date"
                    value={
                      nextFollowUpDate
                    }
                    onChange={(
                      event
                    ) =>
                      setNextFollowUpDate(
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>
              </div>

              {/* REQUIREMENT */}

              <div
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Requirement
                </label>

                <textarea
                  value={
                    requirement
                  }
                  onChange={(
                    event
                  ) =>
                    setRequirement(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Enter customer requirement"
                  rows={4}
                  style={{
                    ...inputStyle,

                    resize:
                      "vertical",

                    fontFamily:
                      "inherit",
                  }}
                />
              </div>

              {/* REMARKS */}

              <div
                style={{
                  marginTop:
                    "18px",
                }}
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Remarks
                </label>

                <textarea
                  value={
                    remarks
                  }
                  onChange={(
                    event
                  ) =>
                    setRemarks(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Enter remarks / notes"
                  rows={4}
                  style={{
                    ...inputStyle,

                    resize:
                      "vertical",

                    fontFamily:
                      "inherit",
                  }}
                />
              </div>
            </section>

            {/* BUTTONS */}

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "flex-end",

                gap:
                  "12px",

                flexWrap:
                  "wrap",

                marginTop:
                  "30px",

                paddingTop:
                  "22px",

                borderTop:
                  "1px solid #e5e7eb",
              }}
            >
              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  router.push(
                    "/enquiries"
                  )
                }
                style={{
                  border:
                    "1px solid #d1d5db",

                  background:
                    "#ffffff",

                  color:
                    "#111827",

                  borderRadius:
                    "9px",

                  padding:
                    "11px 18px",

                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    600,
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving ||
                  loadingCustomers
                }
                style={{
                  border: 0,

                  background:
                    saving
                      ? "#93c5fd"
                      : "#2563eb",

                  color:
                    "#ffffff",

                  borderRadius:
                    "9px",

                  padding:
                    "11px 20px",

                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    700,

                  fontSize:
                    "14px",
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Enquiry"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* STYLES                                                                     */
/* -------------------------------------------------------------------------- */

const labelStyle:
  React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "7px",
};

const inputStyle:
  React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border:
    "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "11px 12px",
  background: "#ffffff",
  color: "#111827",
  fontSize: "14px",
  outline: "none",
};