"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
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

  isActive?: boolean;

  sourceType?: string | null;

  subAgentId?: string | null;

  subAgent?: {
    id?: string;
    code?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
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
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  /* ------------------------------------------------------------------------ */
  /* DIRECT USER ID                                                           */
  /* ------------------------------------------------------------------------ */

  const directUserId =
    localStorage.getItem(
      "userId"
    );

  if (
    directUserId?.trim()
  ) {
    return directUserId.trim();
  }

  /* ------------------------------------------------------------------------ */
  /* USER                                                                     */
  /* ------------------------------------------------------------------------ */

  const storedUser =
    localStorage.getItem(
      "user"
    );

  if (storedUser) {
    try {
      const parsed =
        JSON.parse(
          storedUser
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
    } catch (error) {
      console.error(
        "Unable to read user:",
        error
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* AGENT USER                                                               */
  /* ------------------------------------------------------------------------ */

  const agentUser =
    localStorage.getItem(
      "agentUser"
    );

  if (agentUser) {
    try {
      const parsed =
        JSON.parse(
          agentUser
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
/* CUSTOMER SOURCE                                                            */
/* -------------------------------------------------------------------------- */

function isSubAgentCustomer(
  customer: Customer
) {
  return (
    String(
      customer.sourceType ||
        ""
    ).toUpperCase() ===
      "SUB_AGENT" ||
    Boolean(
      customer.subAgentId
    ) ||
    Boolean(
      customer.subAgent?.id
    )
  );
}

/* -------------------------------------------------------------------------- */
/* CUSTOMER SOURCE LABEL                                                      */
/* -------------------------------------------------------------------------- */

function getCustomerSourceLabel(
  customer: Customer
) {
  if (
    !isSubAgentCustomer(
      customer
    )
  ) {
    return "Self / Direct";
  }

  const code =
    customer.subAgent?.code?.trim() ||
    "";

  const name =
    customer.subAgent?.name?.trim() ||
    "";

  if (
    code &&
    name
  ) {
    return `Sub-Agent - ${name} (${code})`;
  }

  if (name) {
    return `Sub-Agent - ${name}`;
  }

  if (code) {
    return `Sub-Agent - ${code}`;
  }

  return "Sub-Agent Customer";
}

/* -------------------------------------------------------------------------- */
/* CUSTOMER OPTION LABEL                                                      */
/* -------------------------------------------------------------------------- */

function getCustomerOptionLabel(
  customer: Customer
) {
  const parts: string[] =
    [];

  /* NAME */

  parts.push(
    customer.name ||
      "Customer"
  );

  /* PHONE */

  if (
    customer.phone
  ) {
    parts.push(
      customer.phone
    );
  }

  /* CUSTOMER ID */

  if (
    customer.customerId
  ) {
    parts.push(
      customer.customerId
    );
  }

  /* SUB AGENT */

  if (
    isSubAgentCustomer(
      customer
    )
  ) {
    const subAgentName =
      customer.subAgent?.name ||
      "";

    const subAgentCode =
      customer.subAgent?.code ||
      "";

    if (
      subAgentName &&
      subAgentCode
    ) {
      parts.push(
        `Sub-Agent: ${subAgentName} (${subAgentCode})`
      );
    } else if (
      subAgentName
    ) {
      parts.push(
        `Sub-Agent: ${subAgentName}`
      );
    } else if (
      subAgentCode
    ) {
      parts.push(
        `Sub-Agent: ${subAgentCode}`
      );
    } else {
      parts.push(
        "Sub-Agent"
      );
    }
  } else {
    parts.push(
      "Self"
    );
  }

  return parts.join(
    " - "
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE WRAPPER                                                               */
/* -------------------------------------------------------------------------- */

export default function AddEnquiryPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight:
              "100vh",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            background:
              "#f5f7fb",

            color:
              "#374151",
          }}
        >
          <div
            style={{
              textAlign:
                "center",

              fontWeight: 600,
            }}
          >
            Loading enquiry...
          </div>
        </main>
      }
    >
      <AddEnquiryContent />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                    */
/* -------------------------------------------------------------------------- */

function AddEnquiryContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  /* ------------------------------------------------------------------------ */
  /* USER                                                                     */
  /* ------------------------------------------------------------------------ */

  const [
    userId,
    setUserId,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* CUSTOMERS                                                                */
  /* ------------------------------------------------------------------------ */

  const [
    customers,
    setCustomers,
  ] =
    useState<
      Customer[]
    >([]);

  const [
    loadingCustomers,
    setLoadingCustomers,
  ] =
    useState(
      true
    );

  const [
    customerId,
    setCustomerId,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* ENQUIRY                                                                  */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* PAGE STATE                                                               */
  /* ------------------------------------------------------------------------ */

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
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* RETURNED CUSTOMER                                                        */
  /* ------------------------------------------------------------------------ */

  const returnedCustomerId =
    searchParams.get(
      "customerId"
    ) || "";

  /* ------------------------------------------------------------------------ */
  /* LOAD USER                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const activeUserId =
      getLoggedInUserId();

    if (
      !activeUserId
    ) {
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

    void loadCustomers(
      activeUserId
    );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* RETURNED CUSTOMER AUTO SELECT                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (
      !returnedCustomerId
    ) {
      return;
    }

    if (
      customers.length ===
      0
    ) {
      return;
    }

    const found =
      customers.find(
        (
          customer
        ) =>
          customer.id ===
          returnedCustomerId
      );

    if (found) {
      setCustomerId(
        found.id
      );
    }
  }, [
    returnedCustomerId,
    customers,
  ]);

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
          )}&limit=500`,
          {
            cache:
              "no-store",
          }
        );

      let data:
        | CustomerApiResponse
        | Customer[] =
        [];

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "Unable to read customer API response."
        );
      }

      if (
        !response.ok
      ) {
        const message =
          !Array.isArray(
            data
          )
            ? data.message
            : "";

        throw new Error(
          message ||
            "Unable to load customers."
        );
      }

      let list:
        Customer[] =
        [];

      if (
        Array.isArray(
          data
        )
      ) {
        list =
          data;
      } else if (
        Array.isArray(
          data.customers
        )
      ) {
        list =
          data.customers;
      } else if (
        Array.isArray(
          data.data
        )
      ) {
        list =
          data.data;
      }

      /* -------------------------------------------------------------------- */
      /* ACTIVE CUSTOMERS ONLY                                                */
      /* -------------------------------------------------------------------- */

      const activeCustomers =
        list.filter(
          (
            customer
          ) =>
            customer.isActive !==
            false
        );

      /* -------------------------------------------------------------------- */
      /* SORT CUSTOMER NAME                                                   */
      /* -------------------------------------------------------------------- */

      activeCustomers.sort(
        (
          a,
          b
        ) =>
          String(
            a.name ||
              ""
          ).localeCompare(
            String(
              b.name ||
                ""
            ),
            "en",
            {
              sensitivity:
                "base",
            }
          )
      );

      setCustomers(
        activeCustomers
      );
    } catch (
      err
    ) {
      console.error(
        "LOAD CUSTOMERS ERROR:",
        err
      );

      setCustomers(
        []
      );

      setError(
        err instanceof
          Error
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
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const selfCustomerCount =
    useMemo(() => {
      return customers.filter(
        (
          customer
        ) =>
          !isSubAgentCustomer(
            customer
          )
      ).length;
    }, [
      customers,
    ]);

  const subAgentCustomerCount =
    useMemo(() => {
      return customers.filter(
        (
          customer
        ) =>
          isSubAgentCustomer(
            customer
          )
      ).length;
    }, [
      customers,
    ]);

  /* ------------------------------------------------------------------------ */
  /* SELECTED CUSTOMER                                                        */
  /* ------------------------------------------------------------------------ */

  const selectedCustomer =
    useMemo(() => {
      return (
        customers.find(
          (
            customer
          ) =>
            customer.id ===
            customerId
        ) ||
        null
      );
    }, [
      customers,
      customerId,
    ]);

  /* ------------------------------------------------------------------------ */
  /* REGISTER NEW CUSTOMER                                                    */
  /* ------------------------------------------------------------------------ */

  function registerNewCustomer() {
    const returnTo =
      encodeURIComponent(
        "/enquiries/add"
      );

    router.push(
      `/customers/add?returnTo=${returnTo}`
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE ENQUIRY                                                             */
  /* ------------------------------------------------------------------------ */

  async function saveEnquiry(
    event:
      React.FormEvent<HTMLFormElement>
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
          "Agent login information not found. Please login again."
        );
      }

      if (
        !customerId
      ) {
        throw new Error(
          "Please select a customer."
        );
      }

      const customer =
        customers.find(
          (
            item
          ) =>
            item.id ===
            customerId
        );

      if (
        !customer
      ) {
        throw new Error(
          "Selected customer was not found."
        );
      }

      if (
        customer.isActive ===
        false
      ) {
        throw new Error(
          "Inactive customer cannot be used for a new enquiry."
        );
      }

      if (
        !businessType
      ) {
        throw new Error(
          "Please select business type."
        );
      }

      if (
        !enquiryDate
      ) {
        throw new Error(
          "Please select enquiry date."
        );
      }

      /* -------------------------------------------------------------------- */
      /* PAYLOAD                                                              */
      /* -------------------------------------------------------------------- */

      const payload = {
        userId:
          activeUserId,

        customerId,

        businessType,

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

      let data:
        any = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

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

      const newEnquiryId =
        data.enquiry?.id ||
        data.data?.id ||
        "";

      window.setTimeout(
        () => {
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
        },
        700
      );
    } catch (
      err
    ) {
      console.error(
        "SAVE ENQUIRY ERROR:",
        err
      );

      setError(
        err instanceof
          Error
          ? err.message
          : "Unable to create enquiry."
      );
    } finally {
      setSaving(
        false
      );
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

        {/* ------------------------------------------------------------------ */}
        {/* BACK                                                               */}
        {/* ------------------------------------------------------------------ */}

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
              "10px",

            padding:
              "11px 18px",

            cursor:
              "pointer",

            marginBottom:
              "22px",

            fontWeight:
              700,

            fontSize:
              "14px",
          }}
        >
          ← Back to Enquiries
        </button>

        {/* ------------------------------------------------------------------ */}
        {/* MAIN CARD                                                          */}
        {/* ------------------------------------------------------------------ */}

        <div
          style={{
            background:
              "#ffffff",

            borderRadius:
              "20px",

            padding:
              "30px",

            boxShadow:
              "0 6px 25px rgba(0,0,0,0.08)",

            border:
              "1px solid #e5e7eb",
          }}
        >

          {/* ---------------------------------------------------------------- */}
          {/* HEADER                                                           */}
          {/* ---------------------------------------------------------------- */}

          <div
            style={{
              marginBottom:
                "28px",
            }}
          >
            <div
              style={{
                color:
                  "#1d4ed8",

                fontSize:
                  "12px",

                fontWeight:
                  900,

                letterSpacing:
                  "1px",

                textTransform:
                  "uppercase",

                marginBottom:
                  "7px",
              }}
            >
              Sales Management
            </div>

            <h1
              style={{
                margin: 0,

                fontSize:
                  "30px",

                color:
                  "#111827",

                fontWeight:
                  800,
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
              Select an existing customer and create a new enquiry.
            </p>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* ERROR                                                            */}
          {/* ---------------------------------------------------------------- */}

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
                  "10px",

                marginBottom:
                  "20px",

                fontSize:
                  "14px",

                fontWeight:
                  600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* SUCCESS                                                          */}
          {/* ---------------------------------------------------------------- */}

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
                  "10px",

                marginBottom:
                  "20px",

                fontSize:
                  "14px",

                fontWeight:
                  700,
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

            {/* ============================================================= */}
            {/* CUSTOMER                                                      */}
            {/* ============================================================= */}

            <section>

              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "flex-end",

                  gap:
                    "15px",

                  flexWrap:
                    "wrap",

                  marginBottom:
                    "18px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize:
                        "21px",

                      margin: 0,

                      color:
                        "#111827",
                    }}
                  >
                    Customer
                  </h2>

                  {!loadingCustomers && (
                    <p
                      style={{
                        margin:
                          "6px 0 0",

                        color:
                          "#6b7280",

                        fontSize:
                          "13px",

                        fontWeight:
                          600,
                      }}
                    >
                      {customers.length} active customers
                      {" • "}
                      {selfCustomerCount} self
                      {" • "}
                      {subAgentCustomerCount} sub-agent
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={
                    registerNewCustomer
                  }
                  style={{
                    border:
                      "1px solid #2563eb",

                    background:
                      "#eff6ff",

                    color:
                      "#1d4ed8",

                    borderRadius:
                      "10px",

                    padding:
                      "10px 15px",

                    cursor:
                      "pointer",

                    fontWeight:
                      800,

                    fontSize:
                      "13px",
                  }}
                >
                  + Register New Customer
                </button>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* ORIGINAL DROPDOWN                                            */}
              {/* ----------------------------------------------------------- */}

              <label
                style={
                  labelStyle
                }
              >
                Select Existing Customer *
              </label>

              <select
                value={
                  customerId
                }
                onChange={(
                  event
                ) =>
                  setCustomerId(
                    event.target.value
                  )
                }
                required
                disabled={
                  loadingCustomers
                }
                style={{
                  ...inputStyle,

                  minHeight:
                    "48px",

                  fontWeight:
                    600,
                }}
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
                      {getCustomerOptionLabel(
                        customer
                      )}
                    </option>
                  )
                )}
              </select>

              {/* ----------------------------------------------------------- */}
              {/* NO CUSTOMERS                                                 */}
              {/* ----------------------------------------------------------- */}

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
                        "9px",

                      fontSize:
                        "14px",
                    }}
                  >
                    No active customers found. Click{" "}
                    <strong>
                      Register New Customer
                    </strong>{" "}
                    above.
                  </div>
                )}

              {/* ----------------------------------------------------------- */}
              {/* SELECTED CUSTOMER                                            */}
              {/* ----------------------------------------------------------- */}

              {selectedCustomer && (
                <div
                  style={{
                    marginTop:
                      "15px",

                    background:
                      "#f8fafc",

                    border:
                      "1px solid #cbd5e1",

                    borderRadius:
                      "12px",

                    padding:
                      "16px",
                  }}
                >

                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "flex-start",

                      justifyContent:
                        "space-between",

                      gap:
                        "15px",

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>

                      {/* NAME */}

                      <div
                        style={{
                          color:
                            "#111827",

                          fontSize:
                            "18px",

                          fontWeight:
                            800,
                        }}
                      >
                        {
                          selectedCustomer.name
                        }
                      </div>

                      {/* CUSTOMER ID */}

                      {selectedCustomer.customerId && (
                        <div
                          style={{
                            marginTop:
                              "5px",

                            color:
                              "#1d4ed8",

                            fontSize:
                              "13px",

                            fontWeight:
                              700,
                          }}
                        >
                          Customer ID:{" "}
                          {
                            selectedCustomer.customerId
                          }
                        </div>
                      )}

                      {/* MOBILE */}

                      {selectedCustomer.phone && (
                        <div
                          style={{
                            marginTop:
                              "8px",

                            color:
                              "#374151",

                            fontSize:
                              "14px",

                            fontWeight:
                              600,
                          }}
                        >
                          📱{" "}
                          {
                            selectedCustomer.phone
                          }
                        </div>
                      )}

                      {/* EMAIL */}

                      {selectedCustomer.email && (
                        <div
                          style={{
                            marginTop:
                              "5px",

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

                    {/* SOURCE */}

                    <div
                      style={{
                        display:
                          "inline-flex",

                        borderRadius:
                          "999px",

                        padding:
                          "7px 12px",

                        fontSize:
                          "12px",

                        fontWeight:
                          800,

                        background:
                          isSubAgentCustomer(
                            selectedCustomer
                          )
                            ? "#ede9fe"
                            : "#dbeafe",

                        color:
                          isSubAgentCustomer(
                            selectedCustomer
                          )
                            ? "#6d28d9"
                            : "#1d4ed8",

                        border:
                          isSubAgentCustomer(
                            selectedCustomer
                          )
                            ? "1px solid #ddd6fe"
                            : "1px solid #bfdbfe",
                      }}
                    >
                      {isSubAgentCustomer(
                        selectedCustomer
                      )
                        ? "🤝 "
                        : "👤 "}

                      {getCustomerSourceLabel(
                        selectedCustomer
                      )}
                    </div>

                  </div>

                  {/* SUB AGENT DETAILS */}

                  {isSubAgentCustomer(
                    selectedCustomer
                  ) && (
                    <div
                      style={{
                        marginTop:
                          "14px",

                        background:
                          "#faf5ff",

                        border:
                          "1px solid #e9d5ff",

                        borderRadius:
                          "10px",

                        padding:
                          "12px",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#7e22ce",

                          fontSize:
                            "11px",

                          fontWeight:
                            900,

                          textTransform:
                            "uppercase",

                          letterSpacing:
                            "0.5px",
                        }}
                      >
                        Customer Source
                      </div>

                      <div
                        style={{
                          marginTop:
                            "4px",

                          color:
                            "#581c87",

                          fontWeight:
                            800,

                          fontSize:
                            "14px",
                        }}
                      >
                        🤝{" "}
                        {getCustomerSourceLabel(
                          selectedCustomer
                        )}
                      </div>

                      {selectedCustomer
                        .subAgent
                        ?.phone && (
                        <div
                          style={{
                            marginTop:
                              "5px",

                            color:
                              "#6b21a8",

                            fontSize:
                              "13px",
                          }}
                        >
                          Sub-Agent Mobile:{" "}
                          {
                            selectedCustomer
                              .subAgent
                              .phone
                          }
                        </div>
                      )}
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
                  "30px 0",
              }}
            />

            {/* ============================================================= */}
            {/* ENQUIRY INFORMATION                                            */}
            {/* ============================================================= */}

            <section>

              <h2
                style={{
                  fontSize:
                    "20px",

                  margin:
                    "0 0 18px",

                  color:
                    "#111827",
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

                  <select
                    value={
                      businessType
                    }
                    onChange={(
                      event
                    ) =>
                      setBusinessType(
                        event.target.value
                      )
                    }
                    required
                    style={
                      inputStyle
                    }
                  >
                    <option value="">
                      Select Business Type
                    </option>

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
                        event.target.value
                      )
                    }
                    required
                    style={
                      inputStyle
                    }
                  />

                </div>

                {/* NEXT FOLLOW UP */}

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
                        event.target.value
                      )
                    }
                    min={
                      enquiryDate ||
                      undefined
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
                      event.target.value
                    )
                  }
                  placeholder="Enter customer requirement"
                  rows={4}
                  style={{
                    ...inputStyle,

                    minHeight:
                      "100px",

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
                      event.target.value
                    )
                  }
                  placeholder="Enter remarks / notes"
                  rows={4}
                  style={{
                    ...inputStyle,

                    minHeight:
                      "100px",

                    resize:
                      "vertical",

                    fontFamily:
                      "inherit",
                  }}
                />

              </div>

            </section>

            {/* ============================================================= */}
            {/* BUTTONS                                                        */}
            {/* ============================================================= */}

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
                    "10px",

                  padding:
                    "11px 18px",

                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    700,

                  opacity:
                    saving
                      ? 0.6
                      : 1,
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
                    saving ||
                    loadingCustomers
                      ? "#93c5fd"
                      : "#2563eb",

                  color:
                    "#ffffff",

                  borderRadius:
                    "10px",

                  padding:
                    "11px 22px",

                  cursor:
                    saving ||
                    loadingCustomers
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    800,

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
/* LABEL STYLE                                                                */
/* -------------------------------------------------------------------------- */

const labelStyle:
  React.CSSProperties = {
    display:
      "block",

    fontSize:
      "13px",

    fontWeight:
      700,

    color:
      "#374151",

    marginBottom:
      "7px",
  };

/* -------------------------------------------------------------------------- */
/* INPUT STYLE                                                                */
/* -------------------------------------------------------------------------- */

const inputStyle:
  React.CSSProperties = {
    width:
      "100%",

    boxSizing:
      "border-box",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "9px",

    padding:
      "12px 13px",

    background:
      "#ffffff",

    color:
      "#111827",

    WebkitTextFillColor:
      "#111827",

    opacity:
      1,

    fontSize:
      "14px",

    fontWeight:
      500,

    outline:
      "none",

    colorScheme:
      "light",
  };