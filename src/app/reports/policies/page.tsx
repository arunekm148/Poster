"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Period =
  | "TODAY"
  | "MONTH"
  | "CUSTOM";

type ReportFor =
  | "ALL"
  | "STAFF"
  | "SUB_AGENT";

type RawRecord = Record<string, unknown>;

type PersonOption = {
  key: string;
  id: string;
  name: string;
};

type PolicyRow = {
  id: string;

  policyNumber: string;

  customerId: string;
  customerName: string;
  customerPhone: string;

  companyName: string;
  policyType: string;

  premium: number;

  reportDate: string;
  startDate: string;
  expiryDate: string;

  staffId: string;
  staffName: string;

  subAgentId: string;
  subAgentName: string;

  businessType:
    | "NEW"
    | "RENEWAL"
    | "UNKNOWN";

  status: string;
};

type SummaryRow = {
  type: "Staff" | "Sub-Agent";
  name: string;
  policies: number;
  premium: number;
  newBusiness: number;
  renewals: number;
  customers: number;
};

/* -------------------------------------------------------------------------- */
/* DATE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

function indiaToday() {
  return new Date().toLocaleDateString(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
    }
  );
}

function firstDayOfMonth(
  dateKey: string
) {
  return `${dateKey.slice(0, 7)}-01`;
}

function normalizeDate(
  value: unknown
) {
  if (!value) {
    return "";
  }

  const text = String(value).trim();

  if (!text) {
    return "";
  }

  const directMatch = text.match(
    /^\d{4}-\d{2}-\d{2}/
  );

  if (directMatch) {
    return directMatch[0];
  }

  const date = new Date(text);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
    }
  );
}

function parseDateKey(
  dateKey: string
) {
  if (!dateKey) {
    return null;
  }

  const date = new Date(
    `${dateKey}T00:00:00Z`
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date;
}

function isBetween(
  dateKey: string,
  from: string,
  to: string
) {
  /*
   * If the API does not contain a usable
   * business date we do not remove the row.
   */
  if (!dateKey) {
    return true;
  }

  return (
    dateKey >= from &&
    dateKey <= to
  );
}

/* -------------------------------------------------------------------------- */
/* GENERIC API HELPERS                                                        */
/* -------------------------------------------------------------------------- */

function isRecord(
  value: unknown
): value is RawRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getPath(
  source: RawRecord,
  path: string
): unknown {
  const parts = path.split(".");

  let current: unknown = source;

  for (const part of parts) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

function pickValue(
  source: RawRecord,
  paths: string[]
) {
  for (const path of paths) {
    const value = getPath(
      source,
      path
    );

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return undefined;
}

function pickString(
  source: RawRecord,
  paths: string[],
  fallback = ""
) {
  const value = pickValue(
    source,
    paths
  );

  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return String(value).trim();
}

function pickNumber(
  source: RawRecord,
  paths: string[]
) {
  const value = pickValue(
    source,
    paths
  );

  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (
    value === undefined ||
    value === null
  ) {
    return 0;
  }

  const cleaned = String(value)
    .replace(/[₹,\s]/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : 0;
}

function extractArray(
  payload: unknown,
  expectedKeys: string[],
  depth = 0
): RawRecord[] {
  if (depth > 4) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.filter(
      isRecord
    );
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of expectedKeys) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value.filter(
        isRecord
      );
    }
  }

  const wrapperKeys = [
    "data",
    "result",
    "response",
  ];

  for (const key of wrapperKeys) {
    const value = payload[key];

    if (value) {
      const rows = extractArray(
        value,
        expectedKeys,
        depth + 1
      );

      if (rows.length > 0) {
        return rows;
      }
    }
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* POLICY NORMALIZER                                                          */
/* -------------------------------------------------------------------------- */

function normalizeBusinessType(
  source: RawRecord
): "NEW" | "RENEWAL" | "UNKNOWN" {
  const raw = pickString(
    source,
    [
      "businessType",
      "business_type",
      "typeOfBusiness",
      "policyBusinessType",
      "business",
      "renewalType",
    ]
  ).toUpperCase();

  if (
    raw.includes("RENEW")
  ) {
    return "RENEWAL";
  }

  if (
    raw.includes("NEW")
  ) {
    return "NEW";
  }

  const isRenewal = pickValue(
    source,
    [
      "isRenewal",
      "renewal",
    ]
  );

  if (isRenewal === true) {
    return "RENEWAL";
  }

  if (isRenewal === false) {
    return "NEW";
  }

  return "UNKNOWN";
}

function normalizePolicy(
  source: RawRecord,
  index: number
): PolicyRow {
  const policyNumber =
    pickString(
      source,
      [
        "policyNumber",
        "policyNo",
        "policy_no",
        "number",
        "policy.number",
      ],
      "-"
    );

  const customerId =
    pickString(
      source,
      [
        "customerId",
        "customer.id",
      ]
    );

  const customerName =
    pickString(
      source,
      [
        "customer.name",
        "customerName",
        "insuredName",
        "name",
      ],
      "-"
    );

  const customerPhone =
    pickString(
      source,
      [
        "customer.phone",
        "customer.mobile",
        "customerPhone",
        "phone",
        "mobile",
      ]
    );

  const companyName =
    pickString(
      source,
      [
        "company.name",
        "insuranceCompany.name",
        "insurer.name",
        "companyName",
        "insuranceCompany",
        "company",
      ],
      "-"
    );

  const policyType =
    pickString(
      source,
      [
        "policyType.name",
        "policyType",
        "product.name",
        "productName",
        "category",
        "policyCategory",
        "type",
      ],
      "-"
    );

  const premium =
    pickNumber(
      source,
      [
        "premium",
        "totalPremium",
        "grossPremium",
        "netPremium",
        "amount",
      ]
    );

  const reportDate =
    normalizeDate(
      pickValue(
        source,
        [
          "businessDate",
          "policyDate",
          "issueDate",
          "createdAt",
          "startDate",
          "policyStartDate",
        ]
      )
    );

  const startDate =
    normalizeDate(
      pickValue(
        source,
        [
          "startDate",
          "policyStartDate",
          "fromDate",
          "inceptionDate",
        ]
      )
    );

  const expiryDate =
    normalizeDate(
      pickValue(
        source,
        [
          "expiryDate",
          "endDate",
          "policyEndDate",
          "toDate",
          "expiry",
        ]
      )
    );

  const staffId =
    pickString(
      source,
      [
        "staffId",
        "staff.id",
        "assignedStaffId",
        "assignedStaff.id",
      ]
    );

  const staffName =
    pickString(
      source,
      [
        "staff.name",
        "staffName",
        "assignedStaff.name",
        "assignedStaffName",
      ]
    );

  const subAgentId =
    pickString(
      source,
      [
        "subAgentId",
        "subAgent.id",
        "sub_agent_id",
      ]
    );

  const subAgentName =
    pickString(
      source,
      [
        "subAgent.name",
        "subAgentName",
        "sub_agent_name",
      ]
    );

  const status =
    pickString(
      source,
      [
        "status",
        "policyStatus",
      ]
    );

  const id =
    pickString(
      source,
      [
        "id",
        "_id",
      ],
      `${policyNumber}-${index}`
    );

  return {
    id,
    policyNumber,

    customerId,
    customerName,
    customerPhone,

    companyName,
    policyType,

    premium,

    reportDate,
    startDate,
    expiryDate,

    staffId,
    staffName,

    subAgentId,
    subAgentName,

    businessType:
      normalizeBusinessType(
        source
      ),

    status,
  };
}

/* -------------------------------------------------------------------------- */
/* SUB-AGENT NORMALIZER                                                       */
/* -------------------------------------------------------------------------- */

function normalizeSubAgent(
  source: RawRecord,
  index: number
): PersonOption {
  const id =
    pickString(
      source,
      [
        "id",
        "userId",
        "_id",
      ],
      `sub-agent-${index}`
    );

  const name =
    pickString(
      source,
      [
        "name",
        "user.name",
        "fullName",
        "agentName",
      ],
      `Sub-Agent ${index + 1}`
    );

  return {
    id,
    name,
    key: id || `name:${name}`,
  };
}

/* -------------------------------------------------------------------------- */
/* FORMAT HELPERS                                                             */
/* -------------------------------------------------------------------------- */

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatDate(
  value: string
) {
  if (!value) {
    return "-";
  }

  const date = parseDateKey(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  ).format(date);
}

function rowStaffKey(
  row: PolicyRow
) {
  if (row.staffId) {
    return row.staffId;
  }

  if (row.staffName) {
    return `name:${row.staffName}`;
  }

  return "";
}

function rowSubAgentKey(
  row: PolicyRow
) {
  if (row.subAgentId) {
    return row.subAgentId;
  }

  if (row.subAgentName) {
    return `name:${row.subAgentName}`;
  }

  return "";
}

function customerKey(
  row: PolicyRow
) {
  if (row.customerId) {
    return row.customerId;
  }

  return [
    row.customerName,
    row.customerPhone,
  ]
    .join("|")
    .toLowerCase();
}

function policyDisplayStatus(
  row: PolicyRow,
  today: string
) {
  const raw =
    row.status
      .trim()
      .toUpperCase();

  if (raw) {
    return raw;
  }

  if (
    row.expiryDate &&
    row.expiryDate < today
  ) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

function isExpired(
  row: PolicyRow,
  today: string
) {
  const status =
    policyDisplayStatus(
      row,
      today
    );

  if (
    status.includes("EXPIRED")
  ) {
    return true;
  }

  if (
    row.expiryDate &&
    row.expiryDate < today
  ) {
    return true;
  }

  return false;
}

function isActive(
  row: PolicyRow,
  today: string
) {
  const status =
    policyDisplayStatus(
      row,
      today
    );

  if (
    status.includes("CANCEL") ||
    status.includes("EXPIRED")
  ) {
    return false;
  }

  return !isExpired(
    row,
    today
  );
}

function isRenewalDue(
  row: PolicyRow,
  today: string
) {
  if (!row.expiryDate) {
    return false;
  }

  if (
    isExpired(row, today)
  ) {
    return false;
  }

  const todayDate =
    parseDateKey(today);

  const expiry =
    parseDateKey(
      row.expiryDate
    );

  if (
    !todayDate ||
    !expiry
  ) {
    return false;
  }

  const diff =
    expiry.getTime() -
    todayDate.getTime();

  const days =
    diff /
    (1000 * 60 * 60 * 24);

  return (
    days >= 0 &&
    days <= 30
  );
}

/* -------------------------------------------------------------------------- */
/* CSV / EXCEL EXPORT                                                         */
/* -------------------------------------------------------------------------- */

function csvCell(
  value: unknown
) {
  const text =
    String(
      value ?? ""
    ).replace(
      /"/g,
      '""'
    );

  return `"${text}"`;
}

function downloadCsv(
  rows: PolicyRow[],
  filename: string,
  today: string
) {
  const header = [
    "Policy Number",
    "Customer",
    "Phone",
    "Company",
    "Policy Type",
    "Premium",
    "Business Type",
    "Business Date",
    "Start Date",
    "Expiry Date",
    "Staff",
    "Sub-Agent",
    "Status",
  ];

  const lines = [
    header
      .map(csvCell)
      .join(","),
  ];

  for (const row of rows) {
    lines.push(
      [
        row.policyNumber,
        row.customerName,
        row.customerPhone,
        row.companyName,
        row.policyType,
        row.premium,
        row.businessType,
        row.reportDate,
        row.startDate,
        row.expiryDate,
        row.staffName,
        row.subAgentName,
        policyDisplayStatus(
          row,
          today
        ),
      ]
        .map(csvCell)
        .join(",")
    );
  }

  /*
   * UTF-8 BOM helps Microsoft Excel
   * correctly display ₹ and Indian names.
   */
  const csv =
    "\uFEFF" +
    lines.join("\n");

  const blob = new Blob(
    [csv],
    {
      type:
        "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/* PDF / PRINT EXPORT                                                         */
/* -------------------------------------------------------------------------- */

function escapeHtml(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openPdfPrint(
  rows: PolicyRow[],
  summaryRows: SummaryRow[],
  range: {
    from: string;
    to: string;
  },
  reportLabel: string,
  today: string
) {
  const popup =
    window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

  if (!popup) {
    alert(
      "Please allow pop-ups to export PDF."
    );

    return;
  }

  const totalPremium =
    rows.reduce(
      (sum, row) =>
        sum + row.premium,
      0
    );

  const detailRows =
    rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(
              row.policyNumber
            )}</td>

            <td>${escapeHtml(
              row.customerName
            )}</td>

            <td>${escapeHtml(
              row.companyName
            )}</td>

            <td>${escapeHtml(
              row.policyType
            )}</td>

            <td class="number">
              ${escapeHtml(
                formatMoney(
                  row.premium
                )
              )}
            </td>

            <td>${escapeHtml(
              row.businessType
            )}</td>

            <td>${escapeHtml(
              formatDate(
                row.reportDate
              )
            )}</td>

            <td>${escapeHtml(
              formatDate(
                row.expiryDate
              )
            )}</td>

            <td>${escapeHtml(
              row.staffName || "-"
            )}</td>

            <td>${escapeHtml(
              row.subAgentName || "-"
            )}</td>

            <td>${escapeHtml(
              policyDisplayStatus(
                row,
                today
              )
            )}</td>
          </tr>
        `
      )
      .join("");

  const summaryHtml =
    summaryRows.length > 0
      ? `
        <h2>Staff / Sub-Agent Summary</h2>

        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Policies</th>
              <th>Premium</th>
              <th>New</th>
              <th>Renewals</th>
              <th>Customers</th>
            </tr>
          </thead>

          <tbody>
            ${summaryRows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(
                      row.type
                    )}</td>

                    <td>${escapeHtml(
                      row.name
                    )}</td>

                    <td>${row.policies}</td>

                    <td class="number">
                      ${escapeHtml(
                        formatMoney(
                          row.premium
                        )
                      )}
                    </td>

                    <td>${row.newBusiness}</td>
                    <td>${row.renewals}</td>
                    <td>${row.customers}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
      : "";

  popup.document.write(`
    <!DOCTYPE html>

    <html>
      <head>
        <title>
          Policy Report
        </title>

        <meta charset="utf-8" />

        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            margin: 0;
            color: #0f172a;
            font-size: 10px;
          }

          h1 {
            margin: 0;
            font-size: 22px;
          }

          h2 {
            margin-top: 24px;
            font-size: 15px;
          }

          .muted {
            color: #64748b;
          }

          .top {
            border-bottom:
              2px solid #1d4ed8;

            padding-bottom: 12px;
            margin-bottom: 16px;
          }

          .totals {
            display: flex;
            gap: 20px;
            margin-top: 12px;
            font-weight: 700;
          }

          table {
            width: 100%;
            border-collapse:
              collapse;
            margin-top: 8px;
          }

          th,
          td {
            border:
              1px solid #cbd5e1;

            padding: 6px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #eff6ff;
          }

          .number {
            text-align: right;
            white-space: nowrap;
          }

          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <div class="top">
          <h1>
            Agents India - Policy Report
          </h1>

          <p>
            ${escapeHtml(
              reportLabel
            )}
          </p>

          <p class="muted">
            Period:
            ${escapeHtml(
              range.from
            )}
            to
            ${escapeHtml(
              range.to
            )}
          </p>

          <div class="totals">
            <span>
              Policies:
              ${rows.length}
            </span>

            <span>
              Premium:
              ${escapeHtml(
                formatMoney(
                  totalPremium
                )
              )}
            </span>
          </div>
        </div>

        ${summaryHtml}

        <h2>
          Policy Business Details
        </h2>

        <table>
          <thead>
            <tr>
              <th>Policy No.</th>
              <th>Customer</th>
              <th>Company</th>
              <th>Policy Type</th>
              <th>Premium</th>
              <th>Business</th>
              <th>Business Date</th>
              <th>Expiry</th>
              <th>Staff</th>
              <th>Sub-Agent</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${
              detailRows ||
              `
                <tr>
                  <td colspan="11">
                    No policy records found.
                  </td>
                </tr>
              `
            }
          </tbody>
        </table>

        <script>
          window.onload = function () {
            setTimeout(
              function () {
                window.print();
              },
              250
            );
          };
        </script>
      </body>
    </html>
  `);

  popup.document.close();
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function PolicyReportsPage() {
  const today =
    indiaToday();

  const [
    period,
    setPeriod,
  ] =
    useState<Period>(
      "TODAY"
    );

  const [
    fromDate,
    setFromDate,
  ] =
    useState(today);

  const [
    toDate,
    setToDate,
  ] =
    useState(today);

  const [
    reportFor,
    setReportFor,
  ] =
    useState<ReportFor>(
      "ALL"
    );

  const [
    selectedStaff,
    setSelectedStaff,
  ] =
    useState("");

  const [
    selectedSubAgent,
    setSelectedSubAgent,
  ] =
    useState("");

  const [
    policies,
    setPolicies,
  ] =
    useState<PolicyRow[]>(
      []
    );

  const [
    apiSubAgents,
    setApiSubAgents,
  ] =
    useState<PersonOption[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  /* ---------------------------------------------------------------------- */
  /* RANGE                                                                  */
  /* ---------------------------------------------------------------------- */

  const range =
    useMemo(() => {
      if (
        period === "TODAY"
      ) {
        return {
          from: today,
          to: today,
        };
      }

      if (
        period === "MONTH"
      ) {
        return {
          from:
            firstDayOfMonth(
              today
            ),

          to: today,
        };
      }

      return {
        from: fromDate,
        to: toDate,
      };
    }, [
      period,
      today,
      fromDate,
      toDate,
    ]);

  /* ---------------------------------------------------------------------- */
  /* LOAD DATA                                                              */
  /* ---------------------------------------------------------------------- */

  const loadData =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const policyResponse =
            await fetch(
              "/api/policies",
              {
                method: "GET",
                cache: "no-store",
              }
            );

          if (
            !policyResponse.ok
          ) {
            throw new Error(
              `Policy API returned ${policyResponse.status}.`
            );
          }

          const policyPayload:
            unknown =
              await policyResponse.json();

          const rawPolicies =
            extractArray(
              policyPayload,
              [
                "policies",
                "items",
                "rows",
                "results",
              ]
            );

          const normalized =
            rawPolicies.map(
              (
                item,
                index
              ) =>
                normalizePolicy(
                  item,
                  index
                )
            );

          setPolicies(
            normalized
          );

          /*
           * Sub-Agent API is optional here.
           * If this endpoint is unavailable,
           * Sub-Agent names found inside
           * policy records are still used.
           */
          try {
            const response =
              await fetch(
                "/api/sub-agents",
                {
                  method:
                    "GET",
                  cache:
                    "no-store",
                }
              );

            if (response.ok) {
              const payload:
                unknown =
                  await response.json();

              const raw =
                extractArray(
                  payload,
                  [
                    "subAgents",
                    "subagents",
                    "agents",
                    "items",
                    "rows",
                    "results",
                  ]
                );

              setApiSubAgents(
                raw.map(
                  (
                    item,
                    index
                  ) =>
                    normalizeSubAgent(
                      item,
                      index
                    )
                )
              );
            }
          } catch {
            /*
             * Do not block the report
             * if the optional endpoint
             * is unavailable.
             */
          }
        } catch (loadError) {
          console.error(
            loadError
          );

          setPolicies([]);

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load policy report."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ---------------------------------------------------------------------- */
  /* STAFF OPTIONS                                                          */
  /* ---------------------------------------------------------------------- */

  const staffOptions =
    useMemo(() => {
      const map =
        new Map<
          string,
          PersonOption
        >();

      for (const row of policies) {
        if (
          !row.staffId &&
          !row.staffName
        ) {
          continue;
        }

        const key =
          rowStaffKey(row);

        if (!key) {
          continue;
        }

        map.set(
          key,
          {
            key,
            id:
              row.staffId ||
              key,

            name:
              row.staffName ||
              "Staff",
          }
        );
      }

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      );
    }, [policies]);

  /* ---------------------------------------------------------------------- */
  /* SUB AGENT OPTIONS                                                      */
  /* ---------------------------------------------------------------------- */

  const subAgentOptions =
    useMemo(() => {
      const map =
        new Map<
          string,
          PersonOption
        >();

      for (
        const option of apiSubAgents
      ) {
        map.set(
          option.key,
          option
        );
      }

      for (const row of policies) {
        if (
          !row.subAgentId &&
          !row.subAgentName
        ) {
          continue;
        }

        const key =
          rowSubAgentKey(
            row
          );

        if (!key) {
          continue;
        }

        /*
         * Policy-side assignment should
         * also appear even when the main
         * Sub-Agent API is missing.
         */
        if (!map.has(key)) {
          map.set(
            key,
            {
              key,
              id:
                row.subAgentId ||
                key,

              name:
                row.subAgentName ||
                "Sub-Agent",
            }
          );
        }
      }

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          a.name.localeCompare(
            b.name
          )
      );
    }, [
      apiSubAgents,
      policies,
    ]);

  /* ---------------------------------------------------------------------- */
  /* FILTERED POLICIES                                                      */
  /* ---------------------------------------------------------------------- */

  const filteredPolicies =
    useMemo(() => {
      return policies.filter(
        (row) => {
          if (
            !isBetween(
              row.reportDate,
              range.from,
              range.to
            )
          ) {
            return false;
          }

          if (
            reportFor ===
              "STAFF" &&
            selectedStaff
          ) {
            return (
              rowStaffKey(
                row
              ) ===
              selectedStaff
            );
          }

          if (
            reportFor ===
              "SUB_AGENT" &&
            selectedSubAgent
          ) {
            return (
              rowSubAgentKey(
                row
              ) ===
              selectedSubAgent
            );
          }

          return true;
        }
      );
    }, [
      policies,
      range,
      reportFor,
      selectedStaff,
      selectedSubAgent,
    ]);

  /* ---------------------------------------------------------------------- */
  /* TOTALS                                                                 */
  /* ---------------------------------------------------------------------- */

  const totals =
    useMemo(() => {
      const premium =
        filteredPolicies.reduce(
          (sum, row) =>
            sum +
            row.premium,
          0
        );

      const newBusiness =
        filteredPolicies.filter(
          (row) =>
            row.businessType ===
            "NEW"
        ).length;

      const renewals =
        filteredPolicies.filter(
          (row) =>
            row.businessType ===
            "RENEWAL"
        ).length;

      const active =
        filteredPolicies.filter(
          (row) =>
            isActive(
              row,
              today
            )
        ).length;

      const expired =
        filteredPolicies.filter(
          (row) =>
            isExpired(
              row,
              today
            )
        ).length;

      const renewalDue =
        filteredPolicies.filter(
          (row) =>
            isRenewalDue(
              row,
              today
            )
        ).length;

      const customers =
        new Set(
          filteredPolicies.map(
            customerKey
          )
        ).size;

      return {
        policies:
          filteredPolicies.length,

        premium,
        newBusiness,
        renewals,
        active,
        expired,
        renewalDue,
        customers,
      };
    }, [
      filteredPolicies,
      today,
    ]);

  /* ---------------------------------------------------------------------- */
  /* SUMMARY LIST                                                           */
  /* ---------------------------------------------------------------------- */

  const summaryRows =
    useMemo(() => {
      const result:
        SummaryRow[] = [];

      function buildGroup(
        type:
          | "Staff"
          | "Sub-Agent",

        getName: (
          row: PolicyRow
        ) => string
      ) {
        const groups =
          new Map<
            string,
            PolicyRow[]
          >();

        for (
          const row of filteredPolicies
        ) {
          const name =
            getName(row);

          if (!name) {
            continue;
          }

          const existing =
            groups.get(
              name
            ) || [];

          existing.push(
            row
          );

          groups.set(
            name,
            existing
          );
        }

        for (
          const [
            name,
            rows,
          ] of groups.entries()
        ) {
          result.push({
            type,
            name,

            policies:
              rows.length,

            premium:
              rows.reduce(
                (
                  sum,
                  row
                ) =>
                  sum +
                  row.premium,
                0
              ),

            newBusiness:
              rows.filter(
                (row) =>
                  row.businessType ===
                  "NEW"
              ).length,

            renewals:
              rows.filter(
                (row) =>
                  row.businessType ===
                  "RENEWAL"
              ).length,

            customers:
              new Set(
                rows.map(
                  customerKey
                )
              ).size,
          });
        }
      }

      if (
        reportFor === "ALL" ||
        reportFor === "STAFF"
      ) {
        buildGroup(
          "Staff",
          (row) =>
            row.staffName
        );
      }

      if (
        reportFor === "ALL" ||
        reportFor ===
          "SUB_AGENT"
      ) {
        buildGroup(
          "Sub-Agent",
          (row) =>
            row.subAgentName
        );
      }

      return result.sort(
        (a, b) => {
          if (
            a.type !== b.type
          ) {
            return a.type.localeCompare(
              b.type
            );
          }

          return (
            b.premium -
            a.premium
          );
        }
      );
    }, [
      filteredPolicies,
      reportFor,
    ]);

  /* ---------------------------------------------------------------------- */
  /* CURRENT REPORT LABEL                                                   */
  /* ---------------------------------------------------------------------- */

  const reportLabel =
    useMemo(() => {
      if (
        reportFor === "STAFF"
      ) {
        const option =
          staffOptions.find(
            (item) =>
              item.key ===
              selectedStaff
          );

        return option
          ? `Staff: ${option.name}`
          : "All Staff";
      }

      if (
        reportFor ===
        "SUB_AGENT"
      ) {
        const option =
          subAgentOptions.find(
            (item) =>
              item.key ===
              selectedSubAgent
          );

        return option
          ? `Sub-Agent: ${option.name}`
          : "All Sub-Agents";
      }

      return "All Business";
    }, [
      reportFor,
      selectedStaff,
      selectedSubAgent,
      staffOptions,
      subAgentOptions,
    ]);

  /* ---------------------------------------------------------------------- */
  /* EXPORTS                                                                */
  /* ---------------------------------------------------------------------- */

  function handleExcelExport() {
    if (
      filteredPolicies.length ===
      0
    ) {
      alert(
        "No policy data available to export."
      );

      return;
    }

    downloadCsv(
      filteredPolicies,
      `policy-report-${range.from}-to-${range.to}.csv`,
      today
    );
  }

  function handlePdfExport() {
    if (
      filteredPolicies.length ===
      0
    ) {
      alert(
        "No policy data available to export."
      );

      return;
    }

    openPdfPrint(
      filteredPolicies,
      summaryRows,
      range,
      reportLabel,
      today
    );
  }

  /* ---------------------------------------------------------------------- */
  /* UI                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-slate-50 pb-16 text-slate-950">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-6">
        <FilterPanel
          period={period}
          setPeriod={setPeriod}
          fromDate={fromDate}
          toDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}

          reportFor={reportFor}
          setReportFor={
            setReportFor
          }

          staffOptions={
            staffOptions
          }

          subAgentOptions={
            subAgentOptions
          }

          selectedStaff={
            selectedStaff
          }

          setSelectedStaff={
            setSelectedStaff
          }

          selectedSubAgent={
            selectedSubAgent
          }

          setSelectedSubAgent={
            setSelectedSubAgent
          }

          loading={loading}

          onRefresh={() =>
            void loadData()
          }

          onExcel={
            handleExcelExport
          }

          onPdf={
            handlePdfExport
          }
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-700">
              Report:{" "}
              {range.from} →{" "}
              {range.to}
            </p>

            <p className="mt-1 text-xs font-bold text-blue-700">
              {reportLabel}
            </p>
          </div>

          <p className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
            {
              filteredPolicies.length
            }{" "}
            record
            {filteredPolicies.length ===
            1
              ? ""
              : "s"}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="font-black text-red-700">
              Report data could
              not be loaded.
            </p>

            <p className="mt-1 text-sm font-semibold text-red-600">
              {error}
            </p>

            <p className="mt-2 text-xs font-semibold text-red-500">
              The report screen
              itself is working.
              If your existing
              /api/policies
              response uses
              different field
              names, send me that
              API file and I will
              connect it exactly.
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ReportCard
            title="Policies"
            value={
              loading
                ? "..."
                : String(
                    totals.policies
                  )
            }
          />

          <ReportCard
            title="Premium"
            value={
              loading
                ? "..."
                : formatMoney(
                    totals.premium
                  )
            }
          />

          <ReportCard
            title="New Business"
            value={
              loading
                ? "..."
                : String(
                    totals.newBusiness
                  )
            }
          />

          <ReportCard
            title="Renewals"
            value={
              loading
                ? "..."
                : String(
                    totals.renewals
                  )
            }
          />

          <ReportCard
            title="Active Policies"
            value={
              loading
                ? "..."
                : String(
                    totals.active
                  )
            }
          />

          <ReportCard
            title="Expired"
            value={
              loading
                ? "..."
                : String(
                    totals.expired
                  )
            }
          />

          <ReportCard
            title="Renewal Due"
            value={
              loading
                ? "..."
                : String(
                    totals.renewalDue
                  )
            }
          />

          <ReportCard
            title="Customers"
            value={
              loading
                ? "..."
                : String(
                    totals.customers
                  )
            }
          />
        </div>

        <PerformanceSummary
          rows={summaryRows}
          loading={loading}
        />

        <PolicyTable
          rows={
            filteredPolicies
          }
          loading={loading}
          today={today}
        />
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* HEADER                                                                     */
/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-5">
        <Link
          href="/reports"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white font-black shadow-sm transition hover:bg-slate-50"
        >
          ←
        </Link>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Reports
          </p>

          <h1 className="text-2xl font-black">
            Policy Reports
          </h1>

          <p className="text-sm font-semibold text-slate-500">
            Policy business,
            premium, renewal,
            Staff and Sub-Agent
            reporting.
          </p>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* FILTER PANEL                                                               */
/* -------------------------------------------------------------------------- */

function FilterPanel({
  period,
  setPeriod,

  fromDate,
  toDate,
  setFromDate,
  setToDate,

  reportFor,
  setReportFor,

  staffOptions,
  subAgentOptions,

  selectedStaff,
  setSelectedStaff,

  selectedSubAgent,
  setSelectedSubAgent,

  loading,
  onRefresh,
  onExcel,
  onPdf,
}: {
  period: Period;
  setPeriod: (
    value: Period
  ) => void;

  fromDate: string;
  toDate: string;

  setFromDate: (
    value: string
  ) => void;

  setToDate: (
    value: string
  ) => void;

  reportFor: ReportFor;

  setReportFor: (
    value: ReportFor
  ) => void;

  staffOptions:
    PersonOption[];

  subAgentOptions:
    PersonOption[];

  selectedStaff: string;

  setSelectedStaff: (
    value: string
  ) => void;

  selectedSubAgent: string;

  setSelectedSubAgent: (
    value: string
  ) => void;

  loading: boolean;

  onRefresh: () => void;
  onExcel: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Report For
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterButton
              active={
                reportFor ===
                "ALL"
              }
              onClick={() =>
                setReportFor(
                  "ALL"
                )
              }
            >
              All Business
            </FilterButton>

            <FilterButton
              active={
                reportFor ===
                "STAFF"
              }
              onClick={() =>
                setReportFor(
                  "STAFF"
                )
              }
            >
              👥 Staff
            </FilterButton>

            <FilterButton
              active={
                reportFor ===
                "SUB_AGENT"
              }
              onClick={() =>
                setReportFor(
                  "SUB_AGENT"
                )
              }
            >
              🤝 Sub-Agent
            </FilterButton>
          </div>

          {reportFor ===
            "STAFF" && (
            <div className="mt-4 max-w-md">
              <label className="mb-1 block text-xs font-black uppercase text-slate-500">
                Select Staff
              </label>

              <select
                value={
                  selectedStaff
                }
                onChange={(
                  event
                ) =>
                  setSelectedStaff(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="">
                  All Staff
                </option>

                {staffOptions.map(
                  (item) => (
                    <option
                      key={
                        item.key
                      }
                      value={
                        item.key
                      }
                    >
                      {
                        item.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {reportFor ===
            "SUB_AGENT" && (
            <div className="mt-4 max-w-md">
              <label className="mb-1 block text-xs font-black uppercase text-slate-500">
                Select Sub-Agent
              </label>

              <select
                value={
                  selectedSubAgent
                }
                onChange={(
                  event
                ) =>
                  setSelectedSubAgent(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="">
                  All Sub-Agents
                </option>

                {subAgentOptions.map(
                  (item) => (
                    <option
                      key={
                        item.key
                      }
                      value={
                        item.key
                      }
                    >
                      {
                        item.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            onClick={onExcel}
            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800"
          >
            📊 Excel Export
          </button>

          <button
            type="button"
            onClick={onPdf}
            className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-800"
          >
            📄 PDF Export
          </button>
        </div>
      </div>

      <div className="my-5 border-t border-slate-200" />

      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        Report Period
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <FilterButton
          active={
            period ===
            "TODAY"
          }
          onClick={() =>
            setPeriod(
              "TODAY"
            )
          }
        >
          Today
        </FilterButton>

        <FilterButton
          active={
            period ===
            "MONTH"
          }
          onClick={() =>
            setPeriod(
              "MONTH"
            )
          }
        >
          This Month
        </FilterButton>

        <FilterButton
          active={
            period ===
            "CUSTOM"
          }
          onClick={() =>
            setPeriod(
              "CUSTOM"
            )
          }
        >
          Custom Range
        </FilterButton>
      </div>

      {period === "CUSTOM" && (
        <div className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-black text-slate-500">
              From Date
            </label>

            <input
              type="date"
              value={
                fromDate
              }
              onChange={(
                event
              ) =>
                setFromDate(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black text-slate-500">
              To Date
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(
                event
              ) =>
                setToDate(
                  event.target
                    .value
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FILTER BUTTON                                                              */
/* -------------------------------------------------------------------------- */

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${
        active
          ? "bg-blue-700 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* REPORT CARD                                                                */
/* -------------------------------------------------------------------------- */

function ReportCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-xl font-black text-slate-950 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PERFORMANCE SUMMARY                                                        */
/* -------------------------------------------------------------------------- */

function PerformanceSummary({
  rows,
  loading,
}: {
  rows: SummaryRow[];
  loading: boolean;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black">
          Staff / Sub-Agent
          Summary
        </h2>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          List-wise policy,
          premium, new business,
          renewal and customer
          performance.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[850px] w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 font-black">
                Type
              </th>

              <th className="px-5 py-3 font-black">
                Name
              </th>

              <th className="px-5 py-3 text-right font-black">
                Policies
              </th>

              <th className="px-5 py-3 text-right font-black">
                Premium
              </th>

              <th className="px-5 py-3 text-right font-black">
                New Business
              </th>

              <th className="px-5 py-3 text-right font-black">
                Renewals
              </th>

              <th className="px-5 py-3 text-right font-black">
                Customers
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-sm font-bold text-slate-500"
                >
                  Loading report...
                </td>
              </tr>
            ) : rows.length ===
              0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-sm font-bold text-slate-500"
                >
                  No Staff or
                  Sub-Agent summary
                  available for this
                  selection.
                </td>
              </tr>
            ) : (
              rows.map(
                (
                  row,
                  index
                ) => (
                  <tr
                    key={`${row.type}-${row.name}-${index}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          row.type ===
                          "Staff"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-violet-100 text-violet-700"
                        }`}
                      >
                        {
                          row.type
                        }
                      </span>
                    </td>

                    <td className="px-5 py-3 text-sm font-black text-slate-800">
                      {row.name}
                    </td>

                    <td className="px-5 py-3 text-right text-sm font-bold">
                      {
                        row.policies
                      }
                    </td>

                    <td className="px-5 py-3 text-right text-sm font-black">
                      {formatMoney(
                        row.premium
                      )}
                    </td>

                    <td className="px-5 py-3 text-right text-sm font-bold">
                      {
                        row.newBusiness
                      }
                    </td>

                    <td className="px-5 py-3 text-right text-sm font-bold">
                      {
                        row.renewals
                      }
                    </td>

                    <td className="px-5 py-3 text-right text-sm font-bold">
                      {
                        row.customers
                      }
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* POLICY TABLE                                                               */
/* -------------------------------------------------------------------------- */

function PolicyTable({
  rows,
  loading,
  today,
}: {
  rows: PolicyRow[];
  loading: boolean;
  today: string;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-black">
          Policy Business
          Details
        </h2>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          Complete policy list
          with customer, premium,
          Staff, Sub-Agent and
          renewal information.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1450px] w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-black">
                Policy No.
              </th>

              <th className="px-4 py-3 font-black">
                Customer
              </th>

              <th className="px-4 py-3 font-black">
                Company
              </th>

              <th className="px-4 py-3 font-black">
                Policy Type
              </th>

              <th className="px-4 py-3 text-right font-black">
                Premium
              </th>

              <th className="px-4 py-3 font-black">
                Business
              </th>

              <th className="px-4 py-3 font-black">
                Business Date
              </th>

              <th className="px-4 py-3 font-black">
                Start Date
              </th>

              <th className="px-4 py-3 font-black">
                Expiry Date
              </th>

              <th className="px-4 py-3 font-black">
                Staff
              </th>

              <th className="px-4 py-3 font-black">
                Sub-Agent
              </th>

              <th className="px-4 py-3 font-black">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-5 py-12 text-center text-sm font-black text-slate-500"
                >
                  Loading policy
                  report...
                </td>
              </tr>
            ) : rows.length ===
              0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-5 py-12 text-center"
                >
                  <p className="text-sm font-black text-slate-700">
                    No policies
                    found.
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Change the
                    report period,
                    Staff or
                    Sub-Agent
                    selection.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map(
                (row) => {
                  const status =
                    policyDisplayStatus(
                      row,
                      today
                    );

                  return (
                    <tr
                      key={
                        row.id
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-xs font-black text-blue-700">
                        {
                          row.policyNumber
                        }
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs font-black text-slate-800">
                          {
                            row.customerName
                          }
                        </p>

                        {row.customerPhone && (
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                            {
                              row.customerPhone
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold">
                        {
                          row.companyName
                        }
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold">
                        {
                          row.policyType
                        }
                      </td>

                      <td className="px-4 py-3 text-right text-xs font-black">
                        {formatMoney(
                          row.premium
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <BusinessBadge
                          type={
                            row.businessType
                          }
                        />
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold">
                        {formatDate(
                          row.reportDate
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold">
                        {formatDate(
                          row.startDate
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold">
                        {formatDate(
                          row.expiryDate
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs font-bold">
                        {row.staffName ||
                          "-"}
                      </td>

                      <td className="px-4 py-3 text-xs font-bold">
                        {row.subAgentName ||
                          "-"}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge
                          status={
                            status
                          }
                        />
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BUSINESS BADGE                                                             */
/* -------------------------------------------------------------------------- */

function BusinessBadge({
  type,
}: {
  type:
    | "NEW"
    | "RENEWAL"
    | "UNKNOWN";
}) {
  if (type === "NEW") {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
        NEW
      </span>
    );
  }

  if (
    type === "RENEWAL"
  ) {
    return (
      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-700">
        RENEWAL
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
      -
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* STATUS BADGE                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const value =
    status.toUpperCase();

  if (
    value.includes(
      "EXPIRED"
    )
  ) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black text-red-700">
        {status}
      </span>
    );
  }

  if (
    value.includes(
      "CANCEL"
    )
  ) {
    return (
      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-700">
        {status}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
      {status ||
        "ACTIVE"}
    </span>
  );
}