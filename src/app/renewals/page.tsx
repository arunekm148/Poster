"use client";

import {
FormEvent,
Suspense,
useEffect,
useMemo,
useState,
} from "react";

import Link from "next/link";

import {
useRouter,
useSearchParams,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type Customer = {
id?: string;
customerId?: string;
name?: string;
phone?: string;
email?: string | null;
};

type Policy = {
id: string;

policyNumber?: string | null;

customerId?: string | null;
customerName?: string | null;

companyName?: string | null;
insurerName?: string | null;

productName?: string | null;
policyType?: string | null;

premium?: number | string | null;
customerPremium?: number | string | null;
sumInsured?: number | string | null;

startDate?: string | null;
expiryDate?: string | null;
endDate?: string | null;

status?: string | null;
policyStage?: string | null;

isActive?: boolean | null;

customer?: Customer | null;

company?: {
id?: string;
name?: string;
} | null;
};

type RenewalStatus =
| "NOT_CONTACTED"
| "CONTACTED"
| "FOLLOW_UP"
| "INTERESTED"
| "PAYMENT_PENDING"
| "RENEWED"
| "CLOSED";

type RenewalOutcome =
| ""
| "RENEWED"
| "NOT_INTERESTED"
| "RENEWED_ELSEWHERE"
| "UNABLE_TO_CONTACT"
| "LAPSED";

type RenewalFollowUp = {
id: string;

userId?: string | null;

customerId: string;

policyId: string;

status?: string | null;

outcome?: string | null;

followUpDate?: string | null;

nextFollowUpDate?: string | null;

remarks?: string | null;

quotedPremium?: number | string | null;

completedAt?: string | null;

createdAt?: string | null;

updatedAt?: string | null;

customer?: Customer | null;

policy?: Policy | null;
};

type RenewalFilter =
| "ALL"
| "NEXT_30"
| "TODAY"
| "OVERDUE";

/* -------------------------------------------------------------------------- */
/* LOGGED-IN USER */
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
// Ignore invalid localStorage value.
}
}

return "";
}

/* -------------------------------------------------------------------------- */
/* FORMAT DATE */
/* -------------------------------------------------------------------------- */

function formatDate(
value?: string | null
) {
if (!value) {
return "-";
}

const date =
new Date(value);

if (
Number.isNaN(
date.getTime()
)
) {
return value;
}

return date.toLocaleDateString(
"en-IN",
{
day: "2-digit",
month: "short",
year: "numeric",
}
);
}

/* -------------------------------------------------------------------------- */
/* DATE FOR INPUT */
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

function dateForInput(
value?: string | null
) {
if (!value) {
return "";
}

const date =
new Date(value);

if (
Number.isNaN(
date.getTime()
)
) {
return "";
}

const year =
date.getUTCFullYear();

const month =
String(
date.getUTCMonth() + 1
).padStart(
2,
"0"
);

const day =
String(
date.getUTCDate()
).padStart(
2,
"0"
);

return `${year}-${month}-${day}`;
}

/* -------------------------------------------------------------------------- */
/* FORMAT MONEY */
/* -------------------------------------------------------------------------- */

function formatMoney(
value?: number | string | null
) {
if (
value === null ||
value === undefined ||
value === ""
) {
return "-";
}

const amount =
Number(value);

if (
Number.isNaN(
amount
)
) {
return String(value);
}

return amount.toLocaleString(
"en-IN"
);
}

/* -------------------------------------------------------------------------- */
/* GET EXPIRY DATE */
/* -------------------------------------------------------------------------- */

function getExpiryDate(
policy: Policy
) {
return (
policy.expiryDate ||
policy.endDate ||
null
);
}

/* -------------------------------------------------------------------------- */
/* DAYS TO EXPIRY */
/* -------------------------------------------------------------------------- */

function getDaysToExpiry(
value?: string | null
) {
if (!value) {
return null;
}

const expiry =
new Date(value);

if (
Number.isNaN(
expiry.getTime()
)
) {
return null;
}

const now =
new Date();

const today =
new Date(
now.getFullYear(),
now.getMonth(),
now.getDate()
);

const expiryDay =
new Date(
expiry.getFullYear(),
expiry.getMonth(),
expiry.getDate()
);

const difference =
expiryDay.getTime() -
today.getTime();

return Math.ceil(
difference /
(
1000 *
60 *
60 *
24
)
);
}

/* -------------------------------------------------------------------------- */
/* WHATSAPP */
/* -------------------------------------------------------------------------- */

function getWhatsAppNumber(
phone?: string
) {
if (!phone) {
return "";
}

let number =
phone.replace(
/\D/g,
""
);

if (
number.length === 10
) {
number =
`91${number}`;
}

return number;
}

/* -------------------------------------------------------------------------- */
/* FOLLOW-UP STATUS */
/* -------------------------------------------------------------------------- */

function getRenewalStatusLabel(
value?: string | null
) {
switch (
String(
value || ""
).toUpperCase()
) {
case "NOT_CONTACTED":
return "Not Contacted";

case "CONTACTED":
return "Contacted";

case "FOLLOW_UP":
return "Follow-up";

case "INTERESTED":
return "Interested";

case "PAYMENT_PENDING":
return "Payment Pending";

case "RENEWED":
return "Renewed";

case "CLOSED":
return "Closed / Lost";

default:
return "Not Started";
}
}

function getRenewalStatusClass(
value?: string | null
) {
const status =
String(
value || ""
).toUpperCase();

if (
status ===
"RENEWED"
) {
return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

if (
status ===
"CLOSED"
) {
return "border-red-200 bg-red-50 text-red-800";
}

if (
status ===
"PAYMENT_PENDING"
) {
return "border-violet-200 bg-violet-50 text-violet-800";
}

if (
status ===
"INTERESTED" ||
status ===
"CONTACTED"
) {
return "border-blue-200 bg-blue-50 text-blue-800";
}

if (
status ===
"FOLLOW_UP" ||
status ===
"NOT_CONTACTED"
) {
return "border-orange-200 bg-orange-50 text-orange-800";
}

return "border-slate-200 bg-slate-50 text-slate-700";
}

/* -------------------------------------------------------------------------- */
/* PAGE WRAPPER */
/* -------------------------------------------------------------------------- */

export default function RenewalsPage() {
return (
<Suspense
fallback={
<main className="min-h-screen bg-gray-50 p-4">

<div className="mx-auto max-w-5xl">

<div className="rounded-2xl bg-white p-10 text-center shadow-sm">

<div className="text-5xl">
⏳
</div>

<p className="mt-3 font-semibold text-gray-600">
Loading renewals...
</p>

</div>

</div>

</main>
}
>
<RenewalsContent />
</Suspense>
);
}

/* -------------------------------------------------------------------------- */
/* CONTENT */
/* -------------------------------------------------------------------------- */

function RenewalsContent() {
const router =
useRouter();

const searchParams =
useSearchParams();

const selectedCustomerId =
searchParams.get(
"customerId"
) || "";

const returnTo =
searchParams.get(
"returnTo"
) || "";

/* ------------------------------------------------------------------------ */
/* MAIN STATE */
/* ------------------------------------------------------------------------ */

const [
userId,
setUserId,
] =
useState("");

const [
policies,
setPolicies,
] =
useState<Policy[]>(
[]
);

const [
renewalFollowUps,
setRenewalFollowUps,
] =
useState<
RenewalFollowUp[]
>([]);

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

const [
message,
setMessage,
] =
useState("");

const [
search,
setSearch,
] =
useState("");

const [
renewalFilter,
setRenewalFilter,
] =
useState<RenewalFilter>(
"ALL"
);

/* ------------------------------------------------------------------------ */
/* FOLLOW-UP MODAL */
/* ------------------------------------------------------------------------ */

const [
selectedPolicy,
setSelectedPolicy,
] =
useState<
Policy | null
>(null);

const [
selectedFollowUp,
setSelectedFollowUp,
] =
useState<
RenewalFollowUp | null
>(null);

const [
renewalStatus,
setRenewalStatus,
] =
useState<RenewalStatus>(
"FOLLOW_UP"
);

const [
renewalOutcome,
setRenewalOutcome,
] =
useState<RenewalOutcome>(
""
);

const [
followUpDate,
setFollowUpDate,
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
agentRemarks,
setAgentRemarks,
] =
useState("");

const [
quotedPremium,
setQuotedPremium,
] =
useState("");

const [
saving,
setSaving,
] =
useState(false);

const [
modalError,
setModalError,
] =
useState("");

/* ------------------------------------------------------------------------ */
/* INITIAL LOAD */
/* ------------------------------------------------------------------------ */

useEffect(() => {
const activeUserId =
getLoggedInUserId();

if (!activeUserId) {
setError(
"Logged-in user information was not found. Please login again."
);

setLoading(false);

return;
}

setUserId(
activeUserId
);

void loadData(
activeUserId
);
}, []);

/* ------------------------------------------------------------------------ */
/* LOAD ALL DATA */
/* ------------------------------------------------------------------------ */

async function loadData(
activeUserId?: string
) {
const id =
activeUserId ||
userId ||
getLoggedInUserId();

if (!id) {
setError(
"Logged-in user information was not found."
);

return;
}

try {
setLoading(true);

setError("");

await Promise.all([
loadPolicies(
id
),
loadRenewalFollowUps(
id
),
]);
} catch (
err
) {
console.error(
"LOAD RENEWAL DATA ERROR:",
err
);

setError(
err instanceof Error
? err.message
: "Unable to load renewal information."
);
} finally {
setLoading(false);
}
}

/* ------------------------------------------------------------------------ */
/* LOAD POLICIES */
/* ------------------------------------------------------------------------ */

async function loadPolicies(
activeUserId: string
) {
const response =
await fetch(
`/api/policies?userId=${encodeURIComponent(
activeUserId
)}`,
{
cache:
"no-store",
}
);

let data: {
success?: boolean;
message?: string;
policies?: Policy[];
data?: Policy[];
} | Policy[] = [];

try {
data =
await response.json();
} catch {
throw new Error(
"Unable to read policy API response."
);
}

if (
!response.ok
) {
const message =
Array.isArray(
data
)
? ""
: data.message;

throw new Error(
message ||
"Unable to load renewal policies."
);
}

if (
!Array.isArray(
data
) &&
data.success ===
false
) {
throw new Error(
data.message ||
"Unable to load renewal policies."
);
}

const policyList =
Array.isArray(
data
)
? data
: Array.isArray(
data.policies
)
? data.policies
: Array.isArray(
data.data
)
? data.data
: [];

setPolicies(
policyList.filter(
(policy) =>
policy.isActive !==
false
)
);
}

/* ------------------------------------------------------------------------ */
/* LOAD RENEWAL FOLLOW-UPS */
/* ------------------------------------------------------------------------ */

async function loadRenewalFollowUps(
activeUserId: string
) {
const response =
await fetch(
`/api/renewal-follow-ups?userId=${encodeURIComponent(
activeUserId
)}`,
{
cache:
"no-store",
}
);

let data: {
success?: boolean;
message?: string;
followUps?: RenewalFollowUp[];
renewalFollowUps?: RenewalFollowUp[];
data?: RenewalFollowUp[];
} | RenewalFollowUp[] =
[];

try {
data =
await response.json();
} catch {
data = [];
}

if (
!response.ok
) {
const message =
Array.isArray(
data
)
? ""
: data.message;

throw new Error(
message ||
"Unable to load renewal follow-ups."
);
}

if (
!Array.isArray(
data
) &&
data.success ===
false
) {
throw new Error(
data.message ||
"Unable to load renewal follow-ups."
);
}

const list =
Array.isArray(
data
)
? data
: Array.isArray(
data.followUps
)
? data.followUps
: Array.isArray(
data.renewalFollowUps
)
? data.renewalFollowUps
: Array.isArray(
data.data
)
? data.data
: [];

setRenewalFollowUps(
list
);
}

/* ------------------------------------------------------------------------ */
/* SELECTED CUSTOMER */
/* ------------------------------------------------------------------------ */

const selectedCustomer =
useMemo(() => {
if (
!selectedCustomerId
) {
return null;
}

const policy =
policies.find(
(item) =>
item.customer?.id ===
selectedCustomerId ||
item.customerId ===
selectedCustomerId
);

return (
policy?.customer ||
null
);
}, [
policies,
selectedCustomerId,
]);

/* ------------------------------------------------------------------------ */
/* FIND FOLLOW-UP FOR POLICY */
/* ------------------------------------------------------------------------ */

function findRenewalFollowUp(
policyId: string
) {
const matching =
renewalFollowUps.filter(
(item) =>
item.policyId ===
policyId
);

if (
matching.length === 0
) {
return null;
}

return [
...matching,
].sort(
(a, b) => {
const aDate =
new Date(
a.updatedAt ||
a.createdAt ||
0
).getTime();

const bDate =
new Date(
b.updatedAt ||
b.createdAt ||
0
).getTime();

return (
bDate -
aDate
);
}
)[0];
}

/* ------------------------------------------------------------------------ */
/* RENEWAL POLICIES */
/* ------------------------------------------------------------------------ */

const renewalPolicies =
useMemo(() => {
return policies
.filter(
(policy) =>
policy.isActive !==
false
)

.filter(
(policy) =>
!selectedCustomerId ||
policy.customer?.id ===
selectedCustomerId ||
policy.customerId ===
selectedCustomerId
)

.map(
(policy) => ({
policy,

days:
getDaysToExpiry(
getExpiryDate(
policy
)
),
})
)

.filter(
({
days,
}) => {
if (
days === null
) {
return false;
}

/*
* Renewal working window:
* 60 days before expiry
* through 30 days after expiry.
*/

return (
days >= -30 &&
days <= 60
);
}
)

.sort(
(
a,
b
) =>
(
a.days ??
9999
) -
(
b.days ??
9999
)
);
}, [
policies,
selectedCustomerId,
]);

/* ------------------------------------------------------------------------ */
/* COUNTS */
/* ------------------------------------------------------------------------ */

const overdueCount =
useMemo(
() =>
renewalPolicies.filter(
({
days,
}) =>
days !== null &&
days < 0
).length,
[
renewalPolicies,
]
);

const dueTodayCount =
useMemo(
() =>
renewalPolicies.filter(
({
days,
}) =>
days === 0
).length,
[
renewalPolicies,
]
);

const next30DaysCount =
useMemo(
() =>
renewalPolicies.filter(
({
days,
}) =>
days !== null &&
days > 0 &&
days <= 30
).length,
[
renewalPolicies,
]
);

/* ------------------------------------------------------------------------ */
/* FILTER + SEARCH */
/* ------------------------------------------------------------------------ */

const filteredRenewals =
useMemo(() => {
const value =
search
.trim()
.toLowerCase();

return renewalPolicies.filter(
({
policy,
days,
}) => {
if (
renewalFilter ===
"NEXT_30" &&
(
days === null ||
days <= 0 ||
days > 30
)
) {
return false;
}

if (
renewalFilter ===
"TODAY" &&
days !== 0
) {
return false;
}

if (
renewalFilter ===
"OVERDUE" &&
(
days === null ||
days >= 0
)
) {
return false;
}

if (!value) {
return true;
}

const customerName =
policy.customer
?.name ||
policy.customerName ||
"";

const customerId =
policy.customer
?.customerId ||
policy.customerId ||
"";

const company =
policy.company
?.name ||
policy.companyName ||
policy.insurerName ||
"";

const followUp =
renewalFollowUps.find(
(item) =>
item.policyId ===
policy.id
);

return [
policy.policyNumber,
customerName,
customerId,
company,
policy.productName,
policy.policyType,
followUp?.remarks,
followUp?.status,
].some(
(field) =>
String(
field || ""
)
.toLowerCase()
.includes(
value
)
);
}
);
}, [
renewalPolicies,
renewalFollowUps,
search,
renewalFilter,
]);

/* ------------------------------------------------------------------------ */
/* FILTER TITLE */
/* ------------------------------------------------------------------------ */

const filterTitle =
useMemo(() => {
if (
renewalFilter ===
"NEXT_30"
) {
return "Due Next 30 Days";
}

if (
renewalFilter ===
"TODAY"
) {
return "Due Today";
}

if (
renewalFilter ===
"OVERDUE"
) {
return "Overdue";
}

return selectedCustomerId
? "Customer Renewal Follow-up"
: "All Renewals";
}, [
renewalFilter,
selectedCustomerId,
]);

/* ------------------------------------------------------------------------ */
/* OPEN FOLLOW-UP FORM */
/* ------------------------------------------------------------------------ */

function openFollowUpForm(
policy: Policy
) {
const existing =
findRenewalFollowUp(
policy.id
);

setSelectedPolicy(
policy
);

setSelectedFollowUp(
existing
);

if (existing) {
const currentStatus =
String(
existing.status ||
"FOLLOW_UP"
).toUpperCase();

const allowedStatuses:
RenewalStatus[] = [
"NOT_CONTACTED",
"CONTACTED",
"FOLLOW_UP",
"INTERESTED",
"PAYMENT_PENDING",
"RENEWED",
"CLOSED",
];

setRenewalStatus(
allowedStatuses.includes(
currentStatus as
RenewalStatus
)
? currentStatus as RenewalStatus
: "FOLLOW_UP"
);

setRenewalOutcome(
(
existing.outcome ||
""
) as RenewalOutcome
);

setFollowUpDate(
dateForInput(
existing.followUpDate
) ||
todayForInput()
);

setNextFollowUpDate(
dateForInput(
existing.nextFollowUpDate
)
);

setAgentRemarks(
existing.remarks ||
""
);

setQuotedPremium(
existing.quotedPremium !==
null &&
existing.quotedPremium !==
undefined
? String(
existing.quotedPremium
)
: ""
);
} else {
setRenewalStatus(
"FOLLOW_UP"
);

setRenewalOutcome(
""
);

setFollowUpDate(
todayForInput()
);

setNextFollowUpDate(
""
);

setAgentRemarks(
""
);

setQuotedPremium(
policy.customerPremium !==
null &&
policy.customerPremium !==
undefined
? String(
policy.customerPremium
)
: policy.premium !==
null &&
policy.premium !==
undefined
? String(
policy.premium
)
: ""
);
}

setModalError("");
setMessage("");
}

/* ------------------------------------------------------------------------ */
/* CLOSE FOLLOW-UP FORM */
/* ------------------------------------------------------------------------ */

function closeFollowUpForm() {
if (
saving
) {
return;
}

setSelectedPolicy(
null
);

setSelectedFollowUp(
null
);

setModalError("");
}

/* ------------------------------------------------------------------------ */
/* SAVE RENEWAL FOLLOW-UP */
/* ------------------------------------------------------------------------ */

async function saveRenewalFollowUp(
event:
FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (
!selectedPolicy
) {
return;
}

try {
setSaving(true);

setModalError("");

const activeUserId =
userId ||
getLoggedInUserId();

if (
!activeUserId
) {
throw new Error(
"Login information not found."
);
}

const customerId =
selectedPolicy.customer
?.id ||
selectedPolicy.customerId ||
"";

if (
!customerId
) {
throw new Error(
"Customer ID is missing for this policy."
);
}

if (
!followUpDate
) {
throw new Error(
"Please select follow-up date."
);
}

if (
!agentRemarks.trim()
) {
throw new Error(
"Agent follow-up remark is required."
);
}

if (
![
"RENEWED",
"CLOSED",
].includes(
renewalStatus
) &&
!nextFollowUpDate
) {
throw new Error(
"Please select the next follow-up date."
);
}

if (
renewalStatus ===
"CLOSED" &&
!renewalOutcome
) {
throw new Error(
"Please select the closure reason."
);
}

const payload = {
...(selectedFollowUp?.id
? {
id:
selectedFollowUp.id,
}
: {}),

userId:
activeUserId,

customerId,

policyId:
selectedPolicy.id,

status:
renewalStatus,

outcome:
renewalStatus ===
"RENEWED"
? "RENEWED"
: renewalStatus ===
"CLOSED"
? renewalOutcome ||
null
: null,

followUpDate,

nextFollowUpDate:
[
"RENEWED",
"CLOSED",
].includes(
renewalStatus
)
? null
: nextFollowUpDate ||
null,

remarks:
agentRemarks.trim(),

quotedPremium:
quotedPremium
? Number(
quotedPremium
)
: null,
};

const response =
await fetch(
"/api/renewal-follow-ups",
{
method:
selectedFollowUp?.id
? "PUT"
: "POST",

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

let data: {
success?: boolean;
message?: string;
} = {};

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
"Unable to save renewal follow-up."
);
}

setSelectedPolicy(
null
);

setSelectedFollowUp(
null
);

/*
* Customer page flow:
* Customer -> Renewal Follow-up -> Save -> Customers
*/

if (
selectedCustomerId &&
returnTo
) {
router.push(
returnTo
);

router.refresh();

return;
}

setMessage(
data.message ||
"Renewal follow-up saved successfully."
);

await loadData(
activeUserId
);
} catch (
err
) {
console.error(
"SAVE RENEWAL FOLLOW-UP:",
err
);

setModalError(
err instanceof Error
? err.message
: "Unable to save renewal follow-up."
);
} finally {
setSaving(false);
}
}

/* ------------------------------------------------------------------------ */
/* PAGE */
/* ------------------------------------------------------------------------ */

return (
<main className="min-h-screen bg-gray-50 p-4 pb-24">

<div className="mx-auto max-w-5xl">

{/* BACK */}

<div className="mb-4 flex flex-wrap gap-2">

{selectedCustomerId &&
returnTo ? (
<Link
href={
returnTo
}
className="inline-flex rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
>
← Back to Customers
</Link>
) : (
<Link
href="/dashboard"
className="inline-flex rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
>
← Dashboard
</Link>
)}

{selectedCustomerId && (
<Link
href="/renewals"
className="inline-flex rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700"
>
View All Renewals
</Link>
)}

<Link
href="/renewal-follow-ups"
className="inline-flex rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-800"
>
📋 Follow-up Register
</Link>

</div>

{/* HEADER */}

<div className="mb-5 flex flex-wrap items-center justify-between gap-3">

<div>

<p className="text-xs font-black uppercase tracking-wide text-blue-700">
Renewal Management
</p>

<h1 className="mt-1 text-2xl font-black text-gray-900">
{selectedCustomerId
? "Renewal Follow-up"
: "Renewals"}
</h1>

<p className="mt-1 text-sm font-semibold text-gray-500">
{selectedCustomerId
? "Review the customer's policy and record the renewal follow-up."
: "Track upcoming policy renewals and customer follow-ups."}
</p>

</div>

<Link
href={
selectedCustomerId
? `/policies/add?customerId=${encodeURIComponent(
selectedCustomerId
)}`
: "/policies/add"
}
className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm"
>
+ Add Policy
</Link>

</div>

{/* SELECTED CUSTOMER */}

{selectedCustomerId &&
!loading && (
<div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">

<p className="text-xs font-black uppercase tracking-wide text-amber-700">
Selected Customer
</p>

<p className="mt-1 text-lg font-black text-amber-950">
{
selectedCustomer?.name ||
"Customer"
}
</p>

{selectedCustomer?.customerId && (
<p className="mt-1 text-sm font-semibold text-amber-800">
Customer ID:{" "}
{
selectedCustomer.customerId
}
</p>
)}

{selectedCustomer?.phone && (
<p className="mt-1 text-sm font-semibold text-amber-800">
📱{" "}
{
selectedCustomer.phone
}
</p>
)}

</div>
)}

{/* MESSAGE */}

{message && (
<div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
✅ {message}
</div>
)}

{/* SUMMARY */}

{!loading && (
<div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">

<button
type="button"
onClick={() =>
setRenewalFilter(
"ALL"
)
}
className={`rounded-xl border p-3 text-left shadow-sm ${
renewalFilter ===
"ALL"
? "border-blue-400 bg-blue-50"
: "border-gray-200 bg-white"
}`}
>
<p className="text-xs font-bold text-gray-500">
Total Renewals
</p>

<p className="mt-1 text-2xl font-black text-blue-700">
{
renewalPolicies.length
}
</p>
</button>

<button
type="button"
onClick={() =>
setRenewalFilter(
"NEXT_30"
)
}
className={`rounded-xl border p-3 text-left shadow-sm ${
renewalFilter ===
"NEXT_30"
? "border-orange-400 bg-orange-50"
: "border-gray-200 bg-white"
}`}
>
<p className="text-xs font-bold text-gray-500">
Next 30 Days
</p>

<p className="mt-1 text-2xl font-black text-orange-600">
{
next30DaysCount
}
</p>
</button>

<button
type="button"
onClick={() =>
setRenewalFilter(
"TODAY"
)
}
className={`rounded-xl border p-3 text-left shadow-sm ${
renewalFilter ===
"TODAY"
? "border-red-400 bg-red-50"
: "border-gray-200 bg-white"
}`}
>
<p className="text-xs font-bold text-gray-500">
Due Today
</p>

<p className="mt-1 text-2xl font-black text-red-600">
{
dueTodayCount
}
</p>
</button>

<button
type="button"
onClick={() =>
setRenewalFilter(
"OVERDUE"
)
}
className={`rounded-xl border p-3 text-left shadow-sm ${
renewalFilter ===
"OVERDUE"
? "border-red-500 bg-red-50"
: "border-gray-200 bg-white"
}`}
>
<p className="text-xs font-bold text-gray-500">
Overdue
</p>

<p className="mt-1 text-2xl font-black text-red-700">
{
overdueCount
}
</p>
</button>

</div>
)}

{/* CURRENT VIEW */}

{!loading && (
<div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">

<div>

<p className="text-[11px] font-black uppercase text-gray-500">
Current View
</p>

<p className="font-black text-gray-900">
{
filterTitle
}
</p>

</div>

<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
{
filteredRenewals.length
}{" "}
Record
{filteredRenewals.length ===
1
? ""
: "s"}
</span>

</div>
)}

{/* SEARCH */}

<div className="mb-4 rounded-xl bg-white p-3 shadow-sm">

<input
type="text"
value={
search
}
onChange={(
event
) =>
setSearch(
event.target.value
)
}
placeholder="Search policy, customer, company, product or follow-up..."
className="w-full rounded-lg border border-gray-300 bg-white p-3 font-semibold text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
/>

</div>

{/* ERROR */}

{error && (
<div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">

<p className="text-sm font-bold text-red-700">
{
error
}
</p>

<button
type="button"
onClick={() =>
void loadData()
}
className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
>
Try Again
</button>

</div>
)}

{/* LOADING */}

{loading && (
<div className="rounded-2xl bg-white p-10 text-center shadow-sm">

<div className="mb-3 text-5xl">
⏰
</div>

<p className="font-semibold text-gray-500">
Loading renewals...
</p>

</div>
)}

{/* EMPTY */}

{!loading &&
!error &&
filteredRenewals.length ===
0 && (
<div className="rounded-2xl bg-white p-8 text-center shadow-sm">

<div className="text-5xl">
✅
</div>

<h2 className="mt-3 text-lg font-black text-gray-900">
{selectedCustomerId
? "No Renewal Currently Due"
: "No Renewals Found"}
</h2>

<p className="mt-2 text-sm font-semibold text-gray-500">
{selectedCustomerId
? "This customer has no active policy inside the current renewal follow-up period."
: "There are currently no policies due for renewal."}
</p>

{selectedCustomerId &&
returnTo && (
<Link
href={
returnTo
}
className="mt-5 inline-block rounded-xl bg-gray-900 px-5 py-3 font-bold text-white"
>
← Back to Customers
</Link>
)}

</div>
)}

{/* RENEWAL LIST */}

{!loading &&
filteredRenewals.length >
0 && (
<div className="space-y-3">

{filteredRenewals.map(
({
policy,
days,
}) => {
const expiryDate =
getExpiryDate(
policy
);

const customerName =
policy.customer
?.name ||
policy.customerName ||
"Customer";

const customerCode =
policy.customer
?.customerId ||
policy.customerId ||
"";

const phone =
policy.customer
?.phone ||
"";

const whatsappNumber =
getWhatsAppNumber(
phone
);

const company =
policy.company
?.name ||
policy.companyName ||
policy.insurerName ||
"";

const followUp =
findRenewalFollowUp(
policy.id
);

const renewalUrl =
`/policies/add?renewFrom=${encodeURIComponent(
policy.id
)}`;

return (
<article
key={
policy.id
}
className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
>

{/* TOP */}

<div className="flex flex-wrap items-start justify-between gap-3">

<div>

<div className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
{policy.policyNumber ||
"Policy"}
</div>

<h2 className="mt-2 text-lg font-black text-gray-900">
{
customerName
}
</h2>

{customerCode && (
<p className="mt-1 text-xs font-semibold text-gray-500">
Customer ID:{" "}
{
customerCode
}
</p>
)}

{company && (
<p className="mt-2 text-sm font-semibold text-gray-700">
🏢{" "}
{
company
}
</p>
)}

{policy.productName && (
<p className="mt-1 text-sm font-semibold text-gray-600">
📋{" "}
{
policy.productName
}
</p>
)}

{policy.policyType && (
<p className="mt-1 text-xs font-bold text-gray-500">
Type:{" "}
{
policy.policyType
}
</p>
)}

</div>

<div className="flex flex-col items-end gap-2">

{days !==
null &&
days < 0 ? (
<span className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
Overdue
</span>
) : days ===
0 ? (
<span className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-black text-red-800">
Due Today
</span>
) : days !==
null &&
days <=
30 ? (
<span className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700">
Renewal Due
</span>
) : (
<span className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-black text-yellow-700">
Upcoming
</span>
)}

<span
className={`rounded-lg border px-3 py-1.5 text-xs font-black ${getRenewalStatusClass(
followUp?.status
)}`}
>
{getRenewalStatusLabel(
followUp?.status
)}
</span>

</div>

</div>

{/* POLICY DETAILS */}

<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">

<MiniDetail
label="Expiry Date"
value={formatDate(
expiryDate
)}
/>

<MiniDetail
label="Premium"
value={`₹ ${formatMoney(
policy.customerPremium ??
policy.premium
)}`}
/>

<MiniDetail
label="Sum Insured"
value={`₹ ${formatMoney(
policy.sumInsured
)}`}
/>

<MiniDetail
label="Renewal"
value={
days ===
null
? "-"
: days <
0
? `${Math.abs(
days
)} days overdue`
: days ===
0
? "Due today"
: `${days} days remaining`
}
/>

</div>

{/* EXISTING FOLLOW-UP */}

{followUp && (
<div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 p-3">

<div className="flex flex-wrap items-center justify-between gap-2">

<p className="text-xs font-black uppercase tracking-wide text-violet-700">
Renewal Follow-up
</p>

{followUp.nextFollowUpDate && (
<span className="text-xs font-black text-orange-700">
Next:{" "}
{formatDate(
followUp.nextFollowUpDate
)}
</span>
)}

</div>

<p className="mt-2 text-sm font-semibold text-slate-900">
{followUp.remarks ||
"No agent remark"}
</p>

{followUp.quotedPremium !==
null &&
followUp.quotedPremium !==
undefined && (
<p className="mt-2 text-xs font-bold text-violet-800">
Quoted Premium: ₹{" "}
{formatMoney(
followUp.quotedPremium
)}
</p>
)}

</div>
)}

{/* ACTIONS */}

<div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">

{policy.customer
?.id && (
<Link
href={`/customers/${policy.customer.id}`}
className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-black text-white"
>
👁 Customer
</Link>
)}

{phone && (
<a
href={`tel:${phone}`}
className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-black text-green-700"
>
📞 Call
</a>
)}

{whatsappNumber && (
<a
href={`https://wa.me/${whatsappNumber}`}
target="_blank"
rel="noopener noreferrer"
className="rounded-lg bg-green-600 px-4 py-2 text-sm font-black text-white"
>
💬 WhatsApp
</a>
)}

{![
"RENEWED",
"CLOSED",
].includes(
String(
followUp?.status ||
""
).toUpperCase()
) && (
<button
type="button"
onClick={() =>
openFollowUpForm(
policy
)
}
className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-black text-white"
>
{followUp
? "📝 Update Follow-up"
: "📅 Start Follow-up"}
</button>
)}

{followUp &&
[
"RENEWED",
"CLOSED",
].includes(
String(
followUp.status ||
""
).toUpperCase()
) && (
<button
type="button"
onClick={() =>
openFollowUpForm(
policy
)
}
className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-black text-violet-800"
>
👁 Follow-up Details
</button>
)}

<Link
href={
renewalUrl
}
className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-black text-white"
>
🔄 Renew Policy
</Link>

</div>

</article>
);
}
)}

</div>
)}

</div>

{/* -------------------------------------------------------------------- */}
{/* FOLLOW-UP MODAL */}
{/* -------------------------------------------------------------------- */}

{selectedPolicy && (
<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">

<div className="my-6 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">

{/* MODAL HEADER */}

<div className="flex items-start justify-between gap-3 border-b bg-slate-50 p-5">

<div>

<p className="text-xs font-black uppercase tracking-wide text-violet-700">
Insurance Renewal
</p>

<h2 className="mt-1 text-xl font-black text-slate-950">
{selectedFollowUp
? "Update Renewal Follow-up"
: "Start Renewal Follow-up"}
</h2>

<p className="mt-1 text-sm font-semibold text-slate-500">
{selectedPolicy
.customer
?.name ||
selectedPolicy.customerName ||
"Customer"}
{" • "}
{selectedPolicy
.policyNumber ||
"Policy"}
</p>

</div>

<button
type="button"
onClick={
closeFollowUpForm
}
disabled={
saving
}
className="rounded-lg border bg-white px-3 py-2 font-black text-slate-900"
>
✕
</button>

</div>

{/* FORM */}

<form
onSubmit={
saveRenewalFollowUp
}
className="p-5"
>

{/* STATUS */}

<div>

<label className="text-sm font-black text-slate-900">
Renewal Status *
</label>

<select
value={
renewalStatus
}
onChange={(
event
) => {
const value =
event.target
.value as
RenewalStatus;

setRenewalStatus(
value
);

if (
value !==
"CLOSED"
) {
setRenewalOutcome(
""
);
}
}}
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
>
<option value="NOT_CONTACTED">
📵 Not Contacted
</option>

<option value="CONTACTED">
📞 Contacted
</option>

<option value="FOLLOW_UP">
📅 Continue Follow-up
</option>

<option value="INTERESTED">
👍 Interested
</option>

<option value="PAYMENT_PENDING">
💳 Payment Pending
</option>

<option value="RENEWED">
✅ Renewed
</option>

<option value="CLOSED">
❌ Closed / Lost
</option>
</select>

</div>

{/* CLOSED REASON */}

{renewalStatus ===
"CLOSED" && (
<div className="mt-4">

<label className="text-sm font-black text-slate-900">
Closure Reason *
</label>

<select
value={
renewalOutcome
}
onChange={(
event
) =>
setRenewalOutcome(
event.target
.value as
RenewalOutcome
)
}
required
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
>
<option value="">
Select reason
</option>

<option value="NOT_INTERESTED">
Customer Not Interested
</option>

<option value="RENEWED_ELSEWHERE">
Renewed With Another Agent / Company
</option>

<option value="UNABLE_TO_CONTACT">
Unable to Contact
</option>

<option value="LAPSED">
Policy Lapsed / Not Renewed
</option>
</select>

</div>
)}

{/* DATES */}

<div className="mt-4 grid gap-3 sm:grid-cols-2">

<div>

<label className="text-sm font-black text-slate-900">
Follow-up Date *
</label>

<input
type="date"
value={
followUpDate
}
onChange={(
event
) =>
setFollowUpDate(
event.target
.value
)
}
required
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
/>

</div>

{![
"RENEWED",
"CLOSED",
].includes(
renewalStatus
) && (
<div>

<label className="text-sm font-black text-slate-900">
Next Follow-up *
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
event.target
.value
)
}
required
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
/>

</div>
)}

</div>

{/* QUOTED PREMIUM */}

<div className="mt-4">

<label className="text-sm font-black text-slate-900">
Renewal Premium / Quote
</label>

<input
type="number"
min="0"
step="0.01"
value={
quotedPremium
}
onChange={(
event
) =>
setQuotedPremium(
event.target
.value
)
}
placeholder="Enter renewal premium quoted to customer"
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
/>

</div>

{/* REMARK */}

<div className="mt-4">

<label className="text-sm font-black text-slate-900">
Agent Follow-up Remark *
</label>

<textarea
value={
agentRemarks
}
onChange={(
event
) =>
setAgentRemarks(
event.target
.value
)
}
rows={4}
required
placeholder="Example: Called customer. Renewal quote shared. Customer asked to call again on Monday."
className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-black"
/>

</div>

{/* STATUS INFORMATION */}

{renewalStatus ===
"RENEWED" && (
<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
✅ This follow-up will be marked as renewed. You can then use Renew Policy to create the new policy record.
</div>
)}

{renewalStatus ===
"CLOSED" && (
<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
❌ This renewal case will be closed and no next follow-up date will be required.
</div>
)}

{/* MODAL ERROR */}

{modalError && (
<div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
⚠️ {modalError}
</div>
)}

{/* BUTTONS */}

<div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">

<button
type="button"
onClick={
closeFollowUpForm
}
disabled={
saving
}
className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
>
Cancel
</button>

<button
type="submit"
disabled={
saving
}
className={`rounded-xl px-5 py-2.5 text-sm font-black text-white disabled:opacity-50 ${
renewalStatus ===
"RENEWED"
? "bg-emerald-700"
: renewalStatus ===
"CLOSED"
? "bg-red-700"
: "bg-violet-700"
}`}
>
{saving
? "Saving..."
: renewalStatus ===
"RENEWED"
? "✅ Save as Renewed"
: renewalStatus ===
"CLOSED"
? "❌ Close Renewal"
: selectedFollowUp
? "💾 Update Follow-up"
: "💾 Save Follow-up"}
</button>

</div>

</form>

</div>

</div>
)}

</main>
);
}

/* -------------------------------------------------------------------------- */
/* MINI DETAIL */
/* -------------------------------------------------------------------------- */

function MiniDetail({
label,
value,
}: {
label: string;
value: string;
}) {
return (
<div className="rounded-xl bg-gray-50 p-3">

<p className="text-[11px] font-bold uppercase text-gray-500">
{label}
</p>

<p className="mt-1 break-words text-sm font-black text-gray-900">
{value}
</p>

</div>
);
}