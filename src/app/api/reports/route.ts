import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,

    reports: [
      {
        key: "policies",
        name: "Policy Reports",
        endpoint: "/api/reports/policies",
      },
      {
        key: "staff",
        name: "Staff Reports",
        endpoint: "/api/reports/staff",
      },
      {
        key: "sub-agents",
        name: "Sub-Agent Reports",
        endpoint: "/api/reports/sub-agents",
      },
      {
        key: "companies",
        name: "Company Reports",
        endpoint: "/api/reports/companies",
      },
      {
        key: "customers",
        name: "Customer Reports",
        endpoint: "/api/reports/customers",
      },
      {
        key: "renewals",
        name: "Renewal Reports",
        endpoint: "/api/reports/renewals",
      },
      {
        key: "attendance",
        name: "Attendance Reports",
        endpoint: "/api/reports/attendance",
      },
      {
        key: "enquiries",
        name: "Enquiry Reports",
        endpoint: "/api/reports/enquiries",
      },
      {
        key: "income",
        name: "Income Reports",
        endpoint: "/api/reports/income",
      },
    ],
  });
}