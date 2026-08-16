"use client";

import {
FormEvent,
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
/* TYPES */
/* -------------------------------------------------------------------------- */

type AccountMode =
| "SELF"
| "SELF_STAFF"
| "SELF_STAFF_SUBAGENT";

type LoginUser = {
id?: string;
role?: string;
accountMode?: AccountMode;
};

type SubAgent = {
id: string;
code: string;
name: string;
phone?: string | null;
whatsapp?: string | null;
email?: string | null;
};

type ExistingCustomer = {
id: string;
customerId: string;

name: string;
phone?: string | null;
email?: string | null;

dateOfBirth?: string | null;
gender?: string | null;

isActive?: boolean;

sourceType?: "SELF" | "SUB_AGENT";

createdAt?: string;

subAgent?: {
id: string;
code: string;
name: string;
} | null;
};

/* -------------------------------------------------------------------------- */
/* DISTRICTS */
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
/* HELPERS */
/* -------------------------------------------------------------------------- */

function formatDate(value?: string | null) {
if (!value) {
return "Not provided";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "Not provided";
}

return date.toLocaleDateString("en-IN", {
day: "2-digit",
month: "short",
year: "numeric",
});
}

function accountModeLabel(
accountMode: AccountMode
) {
if (
accountMode ===
"SELF_STAFF_SUBAGENT"
) {
return "Pro";
}

if (
accountMode ===
"SELF_STAFF"
) {
return "Classic";
}

return "Lite";
}

/* -------------------------------------------------------------------------- */
/* PAGE WRAPPER */
/* -------------------------------------------------------------------------- */

export default function AddCustomerPage() {
return (
<Suspense
fallback={
<main className="flex min-h-screen items-center justify-center bg-gray-50">
<div className="text-center">
<div className="text-4xl">
👤
</div>

<p className="mt-3 font-bold text-gray-600">
Loading customer form...
</p>
</div>
</main>
}
>
<AddCustomerContent />
</Suspense>
);
}

/* -------------------------------------------------------------------------- */
/* CONTENT */
/* -------------------------------------------------------------------------- */

function AddCustomerContent() {
const router = useRouter();
const searchParams = useSearchParams();

/* ------------------------------------------------------------------------ */
/* URL VALUES */
/* ------------------------------------------------------------------------ */

const returnTo =
String(
searchParams.get("returnTo") ||
""
).trim();

const urlSubAgentId =
String(
searchParams.get(
"subAgentId"
) || ""
).trim();

/* ------------------------------------------------------------------------ */
/* USER */
/* ------------------------------------------------------------------------ */

const [
userId,
setUserId,
] = useState("");

const [
userRole,
setUserRole,
] = useState("");

const [
accountMode,
setAccountMode,
] =
useState<AccountMode>(
"SELF_STAFF"
);

const [
accountModeLoading,
setAccountModeLoading,
] = useState(true);

/*
* Lite = Self customers only
* Classic = Self customers only
* Pro = Self + Sub-Agent customers
*
* Master Admin can see all options.
*/

const canUseSubAgents =
userRole === "ADMIN" ||
accountMode ===
"SELF_STAFF_SUBAGENT";

/* ------------------------------------------------------------------------ */
/* FORM */
/* ------------------------------------------------------------------------ */

const [
form,
setForm,
] = useState({
name: "",
phone: "",
email: "",
dateOfBirth: "",
gender: "",
address: "",
pincode: "",
district: "",
state: "Kerala",
notes: "",

sourceType:
"SELF" as
| "SELF"
| "SUB_AGENT",

subAgentId: "",
});

/* ------------------------------------------------------------------------ */
/* GENERAL STATES */
/* ------------------------------------------------------------------------ */

const [
loading,
setLoading,
] = useState(false);

const [
pinLoading,
setPinLoading,
] = useState(false);

const [
phoneChecking,
setPhoneChecking,
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
/* SUB AGENTS */
/* ------------------------------------------------------------------------ */

const [
subAgents,
setSubAgents,
] = useState<
SubAgent[]
>([]);

const [
subAgentsLoading,
setSubAgentsLoading,
] = useState(false);

const [
subAgentSearch,
setSubAgentSearch,
] = useState("");

const [
showSubAgentResults,
setShowSubAgentResults,
] = useState(false);

/* ------------------------------------------------------------------------ */
/* EXISTING PHONE CUSTOMER */
/* ------------------------------------------------------------------------ */

const [
phoneMatches,
setPhoneMatches,
] = useState<
ExistingCustomer[]
>([]);

const [
exactPhoneCustomers,
setExactPhoneCustomers,
] = useState<
ExistingCustomer[]
>([]);

const [
exactPhoneModalOpen,
setExactPhoneModalOpen,
] = useState(false);

const [
sharedPhoneConfirmed,
setSharedPhoneConfirmed,
] = useState(false);

const [
acknowledgedPhone,
setAcknowledgedPhone,
] = useState("");

/* ------------------------------------------------------------------------ */
/* SELECTED SUB AGENT */
/* ------------------------------------------------------------------------ */

const selectedSubAgent =
useMemo(() => {
return (
subAgents.find(
(subAgent) =>
subAgent.id ===
form.subAgentId
) || null
);
}, [
subAgents,
form.subAgentId,
]);

/* ------------------------------------------------------------------------ */
/* FILTER SUB AGENTS */
/* ------------------------------------------------------------------------ */

const filteredSubAgents =
useMemo(() => {
if (!canUseSubAgents) {
return [];
}

const query =
subAgentSearch
.trim()
.toLowerCase();

if (!query) {
return subAgents.slice(
0,
20
);
}

return subAgents
.filter((subAgent) => {
const searchable =
[
subAgent.code,
subAgent.name,
subAgent.phone,
subAgent.whatsapp,
subAgent.email,
]
.filter(Boolean)
.join(" ")
.toLowerCase();

return searchable.includes(
query
);
})
.slice(0, 30);
}, [
canUseSubAgents,
subAgents,
subAgentSearch,
]);

/* ------------------------------------------------------------------------ */
/* LOAD ACCOUNT MODE */
/* ------------------------------------------------------------------------ */

async function loadAccountMode(
currentUserId: string,
currentRole: string,
storedMode?: AccountMode
) {
if (
currentRole === "ADMIN"
) {
setAccountMode(
"SELF_STAFF_SUBAGENT"
);

setAccountModeLoading(
false
);

return;
}

if (
storedMode === "SELF" ||
storedMode ===
"SELF_STAFF" ||
storedMode ===
"SELF_STAFF_SUBAGENT"
) {
setAccountMode(
storedMode
);
}

try {
setAccountModeLoading(
true
);

const response =
await fetch(
`/api/account-mode?userId=${encodeURIComponent(
currentUserId
)}`,
{
method: "GET",
cache: "no-store",
}
);

const data =
await response
.json()
.catch(
() => ({})
);

if (
response.ok &&
data.success !== false &&
(
data.accountMode ===
"SELF" ||
data.accountMode ===
"SELF_STAFF" ||
data.accountMode ===
"SELF_STAFF_SUBAGENT"
)
) {
setAccountMode(
data.accountMode
);

try {
const storedUser =
localStorage.getItem(
"agentUser"
);

if (storedUser) {
const parsed =
JSON.parse(
storedUser
);

localStorage.setItem(
"agentUser",
JSON.stringify({
...parsed,
accountMode:
data.accountMode,
})
);
}
} catch (
storageError
) {
console.error(
"ACCOUNT MODE STORAGE ERROR:",
storageError
);
}
}
} catch (
accountModeError
) {
console.error(
"ACCOUNT MODE LOAD ERROR:",
accountModeError
);
} finally {
setAccountModeLoading(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* LOGIN USER */
/* ------------------------------------------------------------------------ */

useEffect(() => {
let savedUserId =
localStorage.getItem(
"userId"
);

let currentRole =
"";

let storedMode:
AccountMode | undefined =
undefined;

const storedUser =
localStorage.getItem(
"agentUser"
);

if (storedUser) {
try {
const parsed:
LoginUser =
JSON.parse(
storedUser
);

if (parsed?.id) {
if (!savedUserId) {
savedUserId =
String(parsed.id);

localStorage.setItem(
"userId",
savedUserId
);
}

currentRole =
String(
parsed.role || ""
).toUpperCase();

if (
parsed.accountMode ===
"SELF" ||
parsed.accountMode ===
"SELF_STAFF" ||
parsed.accountMode ===
"SELF_STAFF_SUBAGENT"
) {
storedMode =
parsed.accountMode;
}
}
} catch (
loginError
) {
console.error(
"LOGIN STORAGE ERROR:",
loginError
);
}
}

if (!savedUserId) {
setError(
"Login information not found. Please login again."
);

setAccountModeLoading(
false
);

return;
}

setUserId(
savedUserId
);

setUserRole(
currentRole
);

void loadAccountMode(
savedUserId,
currentRole,
storedMode
);
}, []);

/* ------------------------------------------------------------------------ */
/* FORCE SELF FOR LITE / CLASSIC */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
accountModeLoading
) {
return;
}

if (
canUseSubAgents
) {
return;
}

setForm(
(previous) => ({
...previous,
sourceType: "SELF",
subAgentId: "",
})
);

setSubAgents([]);
setSubAgentSearch("");
setShowSubAgentResults(false);
}, [
accountModeLoading,
canUseSubAgents,
]);

/* ------------------------------------------------------------------------ */
/* LOAD SUB AGENTS ONLY FOR PRO */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
!userId ||
accountModeLoading
) {
return;
}

if (
!canUseSubAgents
) {
setSubAgents([]);
return;
}

void loadSubAgents(
userId
);
}, [
userId,
accountModeLoading,
canUseSubAgents,
]);

/* ------------------------------------------------------------------------ */
/* AUTO SELECT SUB AGENT FROM URL */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
accountModeLoading ||
!canUseSubAgents
) {
return;
}

if (!urlSubAgentId) {
return;
}

if (
subAgents.length === 0
) {
return;
}

const found =
subAgents.find(
(subAgent) =>
subAgent.id ===
urlSubAgentId
);

if (!found) {
return;
}

setForm(
(previous) => ({
...previous,
sourceType:
"SUB_AGENT",
subAgentId:
found.id,
})
);

setSubAgentSearch(
`${found.code} - ${found.name}`
);

setShowSubAgentResults(
false
);
}, [
accountModeLoading,
canUseSubAgents,
urlSubAgentId,
subAgents,
]);

/* ------------------------------------------------------------------------ */
/* LOAD SUB AGENTS */
/* ------------------------------------------------------------------------ */

async function loadSubAgents(
currentUserId: string
) {
if (
!canUseSubAgents
) {
setSubAgents([]);
return;
}

try {
setSubAgentsLoading(
true
);

const response =
await fetch(
`/api/sub-agents?userId=${encodeURIComponent(
currentUserId
)}&activeOnly=true`,
{
cache:
"no-store",
}
);

let data: any = {};

try {
data =
await response.json();
} catch {
data = {};
}

if (
!response.ok ||
data.success === false
) {
setSubAgents([]);
return;
}

const list =
Array.isArray(data)
? data
: Array.isArray(
data.subAgents
)
? data.subAgents
: Array.isArray(
data.data
)
? data.data
: [];

setSubAgents(list);
} catch (
subAgentLoadError
) {
console.error(
"SUB AGENT LOAD ERROR:",
subAgentLoadError
);

setSubAgents([]);
} finally {
setSubAgentsLoading(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* SELECT SUB AGENT */
/* ------------------------------------------------------------------------ */

function selectSubAgent(
subAgent: SubAgent
) {
if (!canUseSubAgents) {
return;
}

setForm(
(previous) => ({
...previous,
sourceType:
"SUB_AGENT",
subAgentId:
subAgent.id,
})
);

setSubAgentSearch(
`${subAgent.code} - ${subAgent.name}`
);

setShowSubAgentResults(
false
);

setError("");
}

/* ------------------------------------------------------------------------ */
/* CLEAR SUB AGENT */
/* ------------------------------------------------------------------------ */

function clearSelectedSubAgent() {
setForm(
(previous) => ({
...previous,
subAgentId: "",
})
);

setSubAgentSearch("");
setShowSubAgentResults(true);
}

/* ------------------------------------------------------------------------ */
/* PHONE WATCH */
/* ------------------------------------------------------------------------ */

useEffect(() => {
const phone =
form.phone;

if (
!userId ||
phone.length < 7
) {
setPhoneMatches([]);
setExactPhoneCustomers(
[]
);

return;
}

const timer =
window.setTimeout(
() => {
void lookupExistingPhone(
phone
);
},
300
);

return () => {
window.clearTimeout(
timer
);
};
}, [
form.phone,
userId,
]);

/* ------------------------------------------------------------------------ */
/* LOOKUP PHONE */
/* ------------------------------------------------------------------------ */

async function lookupExistingPhone(
phonePrefix: string
) {
if (
!userId ||
phonePrefix.length < 7
) {
return;
}

try {
setPhoneChecking(true);

const response =
await fetch(
`/api/customers?userId=${encodeURIComponent(
userId
)}&phonePrefix=${encodeURIComponent(
phonePrefix
)}`,
{
cache:
"no-store",
}
);

let data: any = {};

try {
data =
await response.json();
} catch {
data = {};
}

if (
!response.ok ||
data.success === false
) {
setPhoneMatches([]);
return;
}

const customers =
Array.isArray(
data.customers
)
? data.customers
: Array.isArray(
data.data
)
? data.data
: [];

setPhoneMatches(
customers
);

if (
phonePrefix.length ===
10
) {
const exact =
customers.filter(
(
customer:
ExistingCustomer
) =>
String(
customer.phone ||
""
)
.replace(
/\D/g,
""
)
.slice(
-10
) ===
phonePrefix
);

setExactPhoneCustomers(
exact
);

if (
exact.length > 0 &&
acknowledgedPhone !==
phonePrefix
) {
setExactPhoneModalOpen(
true
);
}
} else {
setExactPhoneCustomers(
[]
);
}
} catch (
phoneLookupError
) {
console.error(
"PHONE LOOKUP ERROR:",
phoneLookupError
);
} finally {
setPhoneChecking(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* FIELD UPDATE */
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
} = event.target;

setForm(
(previous) => ({
...previous,
[name]: value,
})
);
}

/* ------------------------------------------------------------------------ */
/* SOURCE CHANGE */
/* ------------------------------------------------------------------------ */

function handleSourceChange(
event:
React.ChangeEvent<HTMLSelectElement>
) {
const value =
event.target
.value as
| "SELF"
| "SUB_AGENT";

if (
value ===
"SUB_AGENT" &&
!canUseSubAgents
) {
setForm(
(previous) => ({
...previous,
sourceType: "SELF",
subAgentId: "",
})
);

return;
}

setForm(
(previous) => ({
...previous,

sourceType: value,

subAgentId:
value === "SELF"
? ""
: previous.subAgentId,
})
);

if (
value === "SELF"
) {
setSubAgentSearch("");
setShowSubAgentResults(
false
);
} else {
setShowSubAgentResults(
true
);
}
}

/* ------------------------------------------------------------------------ */
/* PHONE CHANGE */
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
phone: value,
})
);

setSharedPhoneConfirmed(
false
);

setAcknowledgedPhone("");
setExactPhoneModalOpen(
false
);

if (
value.length < 7
) {
setPhoneMatches([]);
}
}

/* ------------------------------------------------------------------------ */
/* PINCODE LOOKUP */
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
} catch (
pincodeLookupError
) {
console.error(
"PINCODE LOOKUP ERROR:",
pincodeLookupError
);
} finally {
setPinLoading(false);
}
}

/* ------------------------------------------------------------------------ */
/* PINCODE CHANGE */
/* ------------------------------------------------------------------------ */

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
pincode: value,
})
);

if (
value.length === 6
) {
void lookupPincode(
value
);
}
}

/* ------------------------------------------------------------------------ */
/* REQUEST BODY */
/* ------------------------------------------------------------------------ */

function buildRequestBody(
currentUserId: string,
confirmSharedPhone: boolean
) {
const effectiveSourceType:
"SELF" | "SUB_AGENT" =
canUseSubAgents &&
form.sourceType ===
"SUB_AGENT"
? "SUB_AGENT"
: "SELF";

return {
userId:
currentUserId,

name:
form.name.trim(),

phone:
form.phone,

email:
form.email.trim()
? form.email
.trim()
.toLowerCase()
: null,

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

sourceType:
effectiveSourceType,

subAgentId:
effectiveSourceType ===
"SUB_AGENT"
? form.subAgentId
: null,

confirmSharedPhone,
};
}

/* ------------------------------------------------------------------------ */
/* CREATE CUSTOMER */
/* ------------------------------------------------------------------------ */

async function createCustomer(
confirmSharedPhone: boolean
) {
setError("");
setMessage("");

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
accountModeLoading
) {
setError(
"Please wait while account access is loading."
);

return;
}

if (
!form.name.trim()
) {
setError(
"Customer name is required."
);

return;
}

if (
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
canUseSubAgents &&
form.sourceType ===
"SUB_AGENT" &&
!form.subAgentId
) {
setError(
"Please select a Sub-Agent."
);

return;
}

try {
setLoading(true);

const response =
await fetch(
"/api/customers",
{
method: "POST",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify(
buildRequestBody(
currentUserId,
confirmSharedPhone
)
),
}
);

let data: any = {};

try {
data =
await response.json();
} catch {
data = {};
}

if (
data.requiresConfirmation &&
Array.isArray(
data.linkedCustomers
)
) {
setExactPhoneCustomers(
data.linkedCustomers
);

setExactPhoneModalOpen(
true
);

return;
}

if (
!response.ok ||
data.success === false
) {
setError(
data.message ||
"Unable to create customer."
);

return;
}

const createdCustomer =
data.customer ||
data.data ||
null;

const createdCustomerId =
String(
createdCustomer?.id ||
""
).trim();

const createdCustomerCode =
String(
createdCustomer?.customerId ||
""
).trim();

setExactPhoneModalOpen(
false
);

setMessage(
createdCustomerCode
? `Customer ${createdCustomerCode} created successfully.`
: "Customer created successfully."
);

window.setTimeout(
() => {
if (
returnTo &&
createdCustomerId
) {
const separator =
returnTo.includes(
"?"
)
? "&"
: "?";

router.push(
`${returnTo}${separator}customerId=${encodeURIComponent(
createdCustomerId
)}`
);

router.refresh();

return;
}

if (
urlSubAgentId &&
canUseSubAgents
) {
router.push(
`/sub-agents/${encodeURIComponent(
urlSubAgentId
)}`
);

router.refresh();

return;
}

router.push(
"/customers"
);

router.refresh();
},
700
);
} catch (
createCustomerError
) {
console.error(
"CREATE CUSTOMER ERROR:",
createCustomerError
);

setError(
"Unable to create customer."
);
} finally {
setLoading(false);
}
}

/* ------------------------------------------------------------------------ */
/* SUBMIT */
/* ------------------------------------------------------------------------ */

async function handleSubmit(
event:
FormEvent<HTMLFormElement>
) {
event.preventDefault();

await createCustomer(
sharedPhoneConfirmed
);
}

/* ------------------------------------------------------------------------ */
/* FAMILY PHONE CONFIRM */
/* ------------------------------------------------------------------------ */

function confirmSharedFamilyPhone() {
setSharedPhoneConfirmed(
true
);

setAcknowledgedPhone(
form.phone
);

setExactPhoneModalOpen(
false
);
}

/* ------------------------------------------------------------------------ */
/* CANCEL */
/* ------------------------------------------------------------------------ */

function cancelForm() {
if (returnTo) {
router.push(
returnTo
);

return;
}

if (
urlSubAgentId &&
canUseSubAgents
) {
router.push(
`/sub-agents/${encodeURIComponent(
urlSubAgentId
)}`
);

return;
}

router.push(
"/customers"
);
}

/* ------------------------------------------------------------------------ */
/* UI */
/* ------------------------------------------------------------------------ */

return (
<>
<main className="min-h-screen bg-gray-50 px-4 py-8">

<div className="mx-auto max-w-3xl">

<button
type="button"
onClick={
cancelForm
}
className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-bold text-gray-800 shadow-sm"
>
←{" "}
{returnTo
? "Back to Enquiry"
: urlSubAgentId &&
canUseSubAgents
? "Back to Sub-Agent"
: "Back to Customers"}
</button>

<div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">

<div className="mb-8">

<div className="flex flex-wrap items-center justify-between gap-3">

<div>
<p className="text-xs font-black uppercase tracking-wider text-blue-700">
Customer Management
</p>

<h1 className="mt-1 text-3xl font-black text-gray-950">
Add Customer
</h1>
</div>

{!accountModeLoading &&
userRole !== "ADMIN" && (
<div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-right">

<p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
Current Mode
</p>

<p className="text-sm font-black text-blue-950">
{accountModeLabel(
accountMode
)}
</p>

</div>
)}

</div>

<p className="mt-2 font-medium text-gray-600">
Enter customer details below.
</p>

{!accountModeLoading &&
!canUseSubAgents &&
userRole !== "ADMIN" && (
<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
👤{" "}
{accountModeLabel(
accountMode
)}{" "}
mode: customers are added as Self / Direct customers only.
</div>
)}

{returnTo && (
<div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-800">
✓ After saving, this customer will automatically return to the New Enquiry page and be selected.
</div>
)}

{urlSubAgentId &&
canUseSubAgents &&
selectedSubAgent && (
<div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm font-bold text-violet-800">
🤝 Customer will be added under{" "}
{selectedSubAgent.code} -{" "}
{selectedSubAgent.name}
</div>
)}

</div>

{error && (
<div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">
⚠️ {error}
</div>
)}

{message && (
<div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800">
✓ {message}
</div>
)}

{accountModeLoading ? (
<div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
<p className="font-black text-blue-900">
Loading account access...
</p>
</div>
) : (
<form
onSubmit={
handleSubmit
}
className="space-y-5"
>

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
Customer ID
</label>

<input
value="Auto Generated"
readOnly
className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 font-semibold text-gray-600"
/>
</div>

{canUseSubAgents ? (
<div>

<label className="mb-2 block text-sm font-bold text-gray-900">
Customer Source *
</label>

<select
value={
form.sourceType
}
onChange={
handleSourceChange
}
disabled={
Boolean(
urlSubAgentId
)
}
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-900 disabled:bg-gray-100"
>
<option value="SELF">
Self / Direct Customer
</option>

<option value="SUB_AGENT">
Sub-Agent Customer
</option>
</select>

</div>
) : (
<div>

<label className="mb-2 block text-sm font-bold text-gray-900">
Customer Source
</label>

<input
value="Self / Direct Customer"
readOnly
className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 font-semibold text-gray-700"
/>

</div>
)}

{canUseSubAgents &&
form.sourceType ===
"SUB_AGENT" && (
<div>

<div className="mb-2 flex items-center justify-between gap-3">

<label className="text-sm font-bold text-gray-900">
Sub-Agent *
</label>

{!urlSubAgentId && (
<button
type="button"
onClick={() =>
router.push(
"/sub-agents/add"
)
}
className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"
>
+ Create Sub-Agent
</button>
)}

</div>

{urlSubAgentId &&
selectedSubAgent ? (
<div className="rounded-xl border border-violet-300 bg-violet-50 p-4">

<p className="text-xs font-black uppercase tracking-wide text-violet-700">
Selected Sub-Agent
</p>

<p className="mt-1 text-lg font-black text-gray-950">
{
selectedSubAgent.code
}{" "}
-{" "}
{
selectedSubAgent.name
}
</p>

{selectedSubAgent.phone && (
<p className="mt-1 text-sm font-semibold text-gray-700">
📱{" "}
{
selectedSubAgent.phone
}
</p>
)}

</div>
) : (
<>

<div className="relative">

<input
type="text"
value={
subAgentSearch
}
disabled={
subAgentsLoading
}
autoComplete="off"
placeholder={
subAgentsLoading
? "Loading Sub-Agents..."
: "Search Sub-Agent ID, name, mobile or email..."
}
onFocus={() =>
setShowSubAgentResults(
true
)
}
onChange={(
event
) => {
setSubAgentSearch(
event.target.value
);

setShowSubAgentResults(
true
);

if (
form.subAgentId
) {
setForm(
(
previous
) => ({
...previous,
subAgentId:
"",
})
);
}
}}
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 font-semibold text-gray-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
/>

{(subAgentSearch ||
form.subAgentId) && (
<button
type="button"
onClick={
clearSelectedSubAgent
}
className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-lg font-black text-gray-500"
>
×
</button>
)}

</div>

<p className="mt-2 text-xs font-semibold text-gray-500">
🔎 Search by Sub-Agent ID, name, mobile or email.
</p>

{selectedSubAgent && (
<div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">

<p className="text-xs font-black uppercase text-emerald-700">
Selected Sub-Agent
</p>

<p className="mt-1 text-lg font-black text-gray-950">
{
selectedSubAgent.code
}{" "}
-{" "}
{
selectedSubAgent.name
}
</p>

<button
type="button"
onClick={
clearSelectedSubAgent
}
className="mt-3 text-xs font-black text-blue-700"
>
Change Sub-Agent
</button>

</div>
)}

{showSubAgentResults &&
!selectedSubAgent &&
!subAgentsLoading && (
<div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-300 bg-white shadow-lg">

{filteredSubAgents.length >
0 ? (
<div className="divide-y">

{filteredSubAgents.map(
(
subAgent
) => (
<button
key={
subAgent.id
}
type="button"
onClick={() =>
selectSubAgent(
subAgent
)
}
className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50"
>

<div>

<p className="font-black text-gray-950">
{
subAgent.code
}{" "}
-{" "}
{
subAgent.name
}
</p>

{subAgent.phone && (
<p className="mt-1 text-sm font-semibold text-gray-600">
📱{" "}
{
subAgent.phone
}
</p>
)}

</div>

<span className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white">
Select
</span>

</button>
)
)}

</div>
) : (
<div className="p-5 text-center">
<p className="font-black text-gray-900">
No matching Sub-Agent
</p>
</div>
)}

</div>
)}

</>
)}

</div>
)}

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
Customer Name *
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
placeholder="Enter customer name"
required
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-900"
/>
</div>

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
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
placeholder="Enter 10 digit mobile number"
maxLength={10}
required
autoComplete="off"
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-900"
/>

{phoneChecking && (
<p className="mt-2 text-xs font-bold text-blue-700">
Checking existing customers...
</p>
)}

{form.phone.length >=
7 &&
phoneMatches.length >
0 && (
<div className="mt-3 overflow-hidden rounded-xl border border-orange-300 bg-white">

<div className="bg-orange-50 px-4 py-3">
<p className="font-black text-orange-900">
Existing customer found
</p>
</div>

<div className="divide-y">

{phoneMatches.map(
(
customer
) => (
<button
key={
customer.id
}
type="button"
onClick={() =>
router.push(
`/customers/${customer.id}`
)
}
className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
>

<div>

<p className="font-black text-gray-950">
{
customer.name
}
</p>

<p className="text-sm font-bold text-blue-800">
{
customer.phone
}
</p>

<p className="text-xs text-gray-500">
{
customer.customerId
}
</p>

</div>

<span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
View
</span>

</button>
)
)}

</div>

</div>
)}

</div>

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
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
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
/>
</div>

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
Date of Birth
</label>

<input
type="date"
name="dateOfBirth"
value={
form.dateOfBirth
}
onChange={
updateField
}
max={
new Date()
.toISOString()
.split(
"T"
)[0]
}
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
/>
</div>

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
Gender
</label>

<select
name="gender"
value={
form.gender
}
onChange={
updateField
}
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
>
<option value="">
Select Gender
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

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
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
placeholder="Enter customer address"
rows={3}
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
/>
</div>

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
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
placeholder="Enter 6 digit pincode"
maxLength={6}
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
/>

{pinLoading && (
<p className="mt-2 text-sm font-semibold text-blue-600">
Finding district and state...
</p>
)}
</div>

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
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
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
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

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
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
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
/>
</div>

<div>
<label className="mb-2 block text-sm font-bold text-gray-900">
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
placeholder="Additional customer information"
rows={4}
className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
/>
</div>

<div className="flex flex-col gap-3 pt-4 sm:flex-row">

<button
type="button"
onClick={
cancelForm
}
disabled={
loading
}
className="rounded-xl border border-gray-300 px-5 py-3 font-bold text-gray-700 disabled:opacity-50"
>
Cancel
</button>

<button
type="submit"
disabled={
loading ||
phoneChecking
}
className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:opacity-50"
>
{loading
? "Saving Customer..."
: returnTo
? "Save & Return to Enquiry"
: "Save Customer"}
</button>

</div>

</form>
)}

</div>

</div>

</main>

{exactPhoneModalOpen &&
exactPhoneCustomers.length >
0 && (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

<div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

<div className="border-b border-orange-200 bg-orange-50 p-5">

<p className="text-xs font-black uppercase tracking-wider text-orange-700">
Existing Customer Found
</p>

<h2 className="mt-1 text-2xl font-black text-gray-950">
Mobile Number Already Exists
</h2>

<p className="mt-2 text-lg font-black text-blue-800">
{
form.phone
}
</p>

</div>

<div className="space-y-3 p-5">

{exactPhoneCustomers.map(
(
customer
) => (
<div
key={
customer.id
}
className="rounded-xl border border-gray-200 bg-gray-50 p-4"
>

<div className="flex items-start justify-between gap-3">

<div>

<p className="text-lg font-black text-gray-950">
{
customer.name
}
</p>

<p className="mt-1 font-bold text-blue-800">
{
customer.phone
}
</p>

<p className="mt-1 text-sm font-semibold text-gray-700">
Customer ID:{" "}
<strong>
{
customer.customerId
}
</strong>
</p>

</div>

<button
type="button"
onClick={() =>
router.push(
`/customers/${customer.id}`
)
}
className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-700"
>
View More
</button>

</div>

<div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">

<p>
<strong>
DOB:
</strong>{" "}
{formatDate(
customer.dateOfBirth
)}
</p>

<p>
<strong>
Gender:
</strong>{" "}
{
customer.gender ||
"Not provided"
}
</p>

<p>
<strong>
Status:
</strong>{" "}
{customer.isActive ===
false
? "Inactive"
: "Active"}
</p>

<p>
<strong>
Source:
</strong>{" "}
{customer.sourceType ===
"SUB_AGENT"
? customer.subAgent
?.name
? `Sub-Agent - ${customer.subAgent.name}`
: "Sub-Agent"
: "Self"}
</p>

</div>

</div>
)
)}

</div>

<div className="border-t bg-gray-50 p-5">

<p className="mb-4 text-sm font-semibold leading-6 text-gray-700">
If this is the same person, use the existing customer instead. If another family member uses the same mobile number, choose Continue as Family Member.
</p>

<div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

<button
type="button"
onClick={() => {
setAcknowledgedPhone(
form.phone
);

setExactPhoneModalOpen(
false
);
}}
className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-800"
>
Continue Editing
</button>

<button
type="button"
onClick={() => {
const existingCustomer =
exactPhoneCustomers[0];

if (
returnTo &&
existingCustomer?.id
) {
const separator =
returnTo.includes(
"?"
)
? "&"
: "?";

router.push(
`${returnTo}${separator}customerId=${encodeURIComponent(
existingCustomer.id
)}`
);

return;
}

router.push(
`/customers/${existingCustomer.id}`
);
}}
className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 font-black text-blue-800"
>
{returnTo
? "Use Existing Customer"
: "View Existing Customer"}
</button>

<button
type="button"
onClick={
confirmSharedFamilyPhone
}
className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white"
>
Continue as Family Member
</button>

</div>

</div>

</div>

</div>
)}

</>
);
}