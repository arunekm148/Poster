"use client";

import {
useEffect,
useMemo,
useState,
} from "react";

import Link from "next/link";

/* -------------------------------------------------------------------------- */
/* TYPES */
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

createdAt: string;

sourceType?:
| "SELF"
| "SUB_AGENT"
| string
| null;

subAgentId?: string | null;

subAgent?: {
id?: string;

code?: string | null;

name?: string | null;

phone?: string | null;
} | null;
};

type Policy = {
id: string;

policyNumber?: string | null;

customerId?: string | null;

companyName?: string | null;

productName?: string | null;

policyType?: string | null;

premium?:
| number
| string
| null;

customerPremium?:
| number
| string
| null;

sumInsured?:
| number
| string
| null;

startDate?: string | null;

expiryDate?: string | null;

isActive?: boolean | null;

customer?: {
id?: string;
customerId?: string;
name?: string;
phone?: string;
} | null;
};

type RenewalFollowUpStatus =
| "NOT_CONTACTED"
| "CONTACTED"
| "FOLLOW_UP"
| "INTERESTED"
| "PAYMENT_PENDING"
| "RENEWED"
| "CLOSED";

type RenewalFollowUp = {
id: string;

status:
RenewalFollowUpStatus;

followUpDate?: string | null;

nextFollowUpDate?: string | null;

remarks?: string | null;

quotedPremium?:
| number
| string
| null;

outcome?: string | null;

completedAt?: string | null;

createdAt?: string | null;

policy?: {
id?: string;
policyNumber?: string | null;
companyName?: string | null;
productName?: string | null;
policyType?: string | null;
premium?:
| number
| string
| null;
customerPremium?:
| number
| string
| null;
expiryDate?: string | null;
} | null;
};

type BirthdayInfo = {
days: number;
label: string;
};

type StatusFilter =
| "ALL"
| "ACTIVE"
| "INACTIVE";

type SourceFilter =
| "ALL"
| "SELF"
| "SUB_AGENT";

/* -------------------------------------------------------------------------- */
/* USER */
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
// Ignore invalid storage.
}
}

return "";
}

/* -------------------------------------------------------------------------- */
/* DATE */
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

function formatDate(
value?: string | null
) {
if (!value) {
return "-";
}

const date =
new Date(
value
);

if (
Number.isNaN(
date.getTime()
)
) {
return "-";
}

return date.toLocaleDateString(
"en-IN",
{
day:
"2-digit",

month:
"short",

year:
"numeric",
}
);
}

function getDaysToExpiry(
value?: string | null
) {
if (!value) {
return null;
}

const expiry =
new Date(
value
);

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

return Math.ceil(
(
expiryDay.getTime() -
today.getTime()
) /
(
1000 *
60 *
60 *
24
)
);
}

/* -------------------------------------------------------------------------- */
/* MONEY */
/* -------------------------------------------------------------------------- */

function formatMoney(
value?:
| number
| string
| null
) {
if (
value === null ||
value === undefined ||
value === ""
) {
return "-";
}

const number =
Number(
value
);

if (
Number.isNaN(
number
)
) {
return String(
value
);
}

return number.toLocaleString(
"en-IN"
);
}

/* -------------------------------------------------------------------------- */
/* BIRTHDAY */
/* -------------------------------------------------------------------------- */

function getBirthdayInfo(
dateOfBirth?: string | null
): BirthdayInfo | null {
if (
!dateOfBirth
) {
return null;
}

const dob =
new Date(
dateOfBirth
);

if (
Number.isNaN(
dob.getTime()
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

let nextBirthday =
new Date(
today.getFullYear(),
dob.getUTCMonth(),
dob.getUTCDate()
);

if (
nextBirthday <
today
) {
nextBirthday =
new Date(
today.getFullYear() +
1,

dob.getUTCMonth(),

dob.getUTCDate()
);
}

const days =
Math.round(
(
nextBirthday.getTime() -
today.getTime()
) /
(
1000 *
60 *
60 *
24
)
);

if (
days === 0
) {
return {
days,
label:
"Birthday Today",
};
}

if (
days === 1
) {
return {
days,
label:
"Birthday Tomorrow",
};
}

if (
days <= 7
) {
return {
days,
label:
`Birthday in ${days} days`,
};
}

return {
days,
label: "",
};
}

/* -------------------------------------------------------------------------- */
/* WHATSAPP */
/* -------------------------------------------------------------------------- */

function getWhatsAppNumber(
phone?: string | null
) {
const digits =
String(
phone || ""
).replace(
/\D/g,
""
);

if (
!digits
) {
return "";
}

if (
digits.startsWith(
"91"
) &&
digits.length >= 12
) {
return digits;
}

if (
digits.length === 10
) {
return `91${digits}`;
}

return digits;
}

/* -------------------------------------------------------------------------- */
/* ADDRESS */
/* -------------------------------------------------------------------------- */

function getFullAddress(
customer: Customer
) {
const parts =
[
customer.address,
customer.district,
customer.state,
].filter(
Boolean
);

let address =
parts.join(
", "
);

if (
customer.pincode
) {
address =
address
? `${address} - ${customer.pincode}`
: customer.pincode;
}

return (
address ||
"Address not provided"
);
}

/* -------------------------------------------------------------------------- */
/* SOURCE */
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

function getCustomerSourceLabel(
customer: Customer
) {
if (
!isSubAgentCustomer(
customer
)
) {
return "Self";
}

const code =
customer.subAgent
?.code?.trim();

const name =
customer.subAgent
?.name?.trim();

if (
code &&
name
) {
return `Sub Agent • ${code} • ${name}`;
}

if (
name
) {
return `Sub Agent • ${name}`;
}

if (
code
) {
return `Sub Agent • ${code}`;
}

return "Sub Agent";
}

/* -------------------------------------------------------------------------- */
/* RENEWAL STATUS */
/* -------------------------------------------------------------------------- */

function getRenewalStatusLabel(
status?: string | null
) {
switch (
String(
status || ""
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
return "Closed";

default:
return (
status || "-"
);
}
}

function getRenewalStatusStyle(
status?: string | null
) {
const value =
String(
status || ""
).toUpperCase();

if (
value ===
"RENEWED"
) {
return "bg-emerald-100 text-emerald-800";
}

if (
value ===
"INTERESTED"
) {
return "bg-blue-100 text-blue-800";
}

if (
value ===
"PAYMENT_PENDING"
) {
return "bg-violet-100 text-violet-800";
}

if (
value ===
"FOLLOW_UP" ||
value ===
"CONTACTED"
) {
return "bg-orange-100 text-orange-800";
}

if (
value ===
"CLOSED"
) {
return "bg-red-100 text-red-800";
}

return "bg-slate-100 text-slate-700";
}

/* -------------------------------------------------------------------------- */
/* PAGE */
/* -------------------------------------------------------------------------- */

export default function CustomersPage() {
const [
customers,
setCustomers,
] =
useState<Customer[]>(
[]
);

const [
loading,
setLoading,
] =
useState(
true
);

const [
search,
setSearch,
] =
useState(
""
);

const [
statusFilter,
setStatusFilter,
] =
useState<StatusFilter>(
"ACTIVE"
);

const [
sourceFilter,
setSourceFilter,
] =
useState<SourceFilter>(
"ALL"
);

const [
message,
setMessage,
] =
useState(
""
);

const [
deletingId,
setDeletingId,
] =
useState<
string | null
>(
null
);

const [
changingStatusId,
setChangingStatusId,
] =
useState<
string | null
>(
null
);

const [
expandedCustomers,
setExpandedCustomers,
] =
useState<
Set<string>
>(
new Set()
);

/* ------------------------------------------------------------------------ */
/* RENEWAL MODAL STATE */
/* ------------------------------------------------------------------------ */

const [
renewalCustomer,
setRenewalCustomer,
] =
useState<
Customer | null
>(
null
);

const [
renewalPolicies,
setRenewalPolicies,
] =
useState<
Policy[]
>(
[]
);

const [
renewalHistory,
setRenewalHistory,
] =
useState<
RenewalFollowUp[]
>(
[]
);

const [
loadingRenewal,
setLoadingRenewal,
] =
useState(
false
);

const [
renewalError,
setRenewalError,
] =
useState(
""
);

const [
renewalSuccess,
setRenewalSuccess,
] =
useState(
""
);

const [
selectedPolicyId,
setSelectedPolicyId,
] =
useState(
""
);

const [
renewalStatus,
setRenewalStatus,
] =
useState<RenewalFollowUpStatus>(
"FOLLOW_UP"
);

const [
renewalFollowUpDate,
setRenewalFollowUpDate,
] =
useState(
todayForInput()
);

const [
renewalNextDate,
setRenewalNextDate,
] =
useState(
""
);

const [
renewalQuotedPremium,
setRenewalQuotedPremium,
] =
useState(
""
);

const [
renewalRemarks,
setRenewalRemarks,
] =
useState(
""
);

const [
savingRenewal,
setSavingRenewal,
] =
useState(
false
);

/* ------------------------------------------------------------------------ */
/* LOAD CUSTOMERS */
/* ------------------------------------------------------------------------ */

useEffect(() => {
void loadCustomers();
}, []);

async function loadCustomers() {
try {
setLoading(
true
);

const userId =
getLoggedInUserId();

if (
!userId
) {
setCustomers(
[]
);

window.alert(
"Logged-in user information was not found. Please login again."
);

return;
}

const response =
await fetch(
`/api/customers?userId=${encodeURIComponent(
userId
)}&limit=500`,
{
cache:
"no-store",
}
);

let data: {
success?: boolean;
message?: string;
customers?: Customer[];
data?: Customer[];
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
window.alert(
data.message ||
"Unable to load customers."
);

setCustomers(
[]
);

return;
}

const list =
Array.isArray(
data.customers
)
? data.customers
: Array.isArray(
data.data
)
? data.data
: [];

setCustomers(
list
);
} catch (
error
) {
console.error(
"LOAD CUSTOMERS ERROR:",
error
);

setCustomers(
[]
);

window.alert(
"Unable to load customers."
);
} finally {
setLoading(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* EXPAND */
/* ------------------------------------------------------------------------ */

function toggleCustomer(
customerId: string
) {
setExpandedCustomers(
(
current
) => {
const next =
new Set(
current
);

if (
next.has(
customerId
)
) {
next.delete(
customerId
);
} else {
next.add(
customerId
);
}

return next;
}
);
}

/* ------------------------------------------------------------------------ */
/* OPEN RENEWAL FOLLOW-UP MODAL */
/* ------------------------------------------------------------------------ */

async function openRenewalFollowUp(
customer: Customer
) {
try {
setRenewalCustomer(
customer
);

setLoadingRenewal(
true
);

setRenewalError(
""
);

setRenewalSuccess(
""
);

setRenewalPolicies(
[]
);

setRenewalHistory(
[]
);

setSelectedPolicyId(
""
);

setRenewalStatus(
"FOLLOW_UP"
);

setRenewalFollowUpDate(
todayForInput()
);

setRenewalNextDate(
""
);

setRenewalQuotedPremium(
""
);

setRenewalRemarks(
""
);

const userId =
getLoggedInUserId();

if (
!userId
) {
throw new Error(
"Login information not found."
);
}

const [
policyResponse,
historyResponse,
] =
await Promise.all(
[
fetch(
`/api/policies?userId=${encodeURIComponent(
userId
)}`,
{
cache:
"no-store",
}
),

fetch(
`/api/renewal-follow-ups?userId=${encodeURIComponent(
userId
)}&customerId=${encodeURIComponent(
customer.id
)}`,
{
cache:
"no-store",
}
),
]
);

let policyData:
any = {};

let historyData:
any = {};

try {
policyData =
await policyResponse.json();
} catch {
policyData = {};
}

try {
historyData =
await historyResponse.json();
} catch {
historyData = {};
}

if (
!policyResponse.ok ||
policyData.success ===
false
) {
throw new Error(
policyData.message ||
"Unable to load customer policies."
);
}

if (
!historyResponse.ok ||
historyData.success ===
false
) {
throw new Error(
historyData.message ||
"Unable to load renewal history."
);
}

const policyList:
Policy[] =
Array.isArray(
policyData
)
? policyData
: Array.isArray(
policyData.policies
)
? policyData.policies
: Array.isArray(
policyData.data
)
? policyData.data
: [];

const customerPolicies =
policyList
.filter(
(
policy
) => {
const linkedCustomerId =
policy.customer
?.id ||
policy.customerId ||
"";

return (
linkedCustomerId ===
customer.id &&
policy.isActive !==
false
);
}
)
.sort(
(
a,
b
) => {
const aDate =
a.expiryDate
? new Date(
a.expiryDate
).getTime()
: Number.MAX_SAFE_INTEGER;

const bDate =
b.expiryDate
? new Date(
b.expiryDate
).getTime()
: Number.MAX_SAFE_INTEGER;

return (
aDate -
bDate
);
}
);

setRenewalPolicies(
customerPolicies
);

const historyList:
RenewalFollowUp[] =
Array.isArray(
historyData.followUps
)
? historyData.followUps
: Array.isArray(
historyData.data
)
? historyData.data
: [];

setRenewalHistory(
historyList
);

if (
customerPolicies.length >
0
) {
const nearestPolicy =
[
...customerPolicies,
].sort(
(
a,
b
) => {
const aDays =
getDaysToExpiry(
a.expiryDate
);

const bDays =
getDaysToExpiry(
b.expiryDate
);

if (
aDays ===
null
) {
return 1;
}

if (
bDays ===
null
) {
return -1;
}

const aScore =
aDays < 0
? Math.abs(
aDays
)
: aDays;

const bScore =
bDays < 0
? Math.abs(
bDays
)
: bDays;

return (
aScore -
bScore
);
}
)[0];

if (
nearestPolicy
) {
setSelectedPolicyId(
nearestPolicy.id
);

const premium =
nearestPolicy.customerPremium ??
nearestPolicy.premium;

if (
premium !== null &&
premium !== undefined &&
premium !== ""
) {
setRenewalQuotedPremium(
String(
premium
)
);
}
}
}
} catch (
error
) {
console.error(
"OPEN RENEWAL FOLLOW-UP ERROR:",
error
);

setRenewalError(
error instanceof
Error
? error.message
: "Unable to load renewal follow-up."
);
} finally {
setLoadingRenewal(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* SELECT POLICY */
/* ------------------------------------------------------------------------ */

function handlePolicySelection(
policyId: string
) {
setSelectedPolicyId(
policyId
);

const policy =
renewalPolicies.find(
(
item
) =>
item.id ===
policyId
);

if (
!policy
) {
setRenewalQuotedPremium(
""
);

return;
}

const premium =
policy.customerPremium ??
policy.premium;

setRenewalQuotedPremium(
premium !== null &&
premium !== undefined &&
premium !== ""
? String(
premium
)
: ""
);
}

/* ------------------------------------------------------------------------ */
/* CLOSE RENEWAL MODAL */
/* ------------------------------------------------------------------------ */

function closeRenewalModal() {
if (
savingRenewal
) {
return;
}

setRenewalCustomer(
null
);

setRenewalPolicies(
[]
);

setRenewalHistory(
[]
);

setSelectedPolicyId(
""
);

setRenewalError(
""
);

setRenewalSuccess(
""
);

setRenewalRemarks(
""
);

setRenewalQuotedPremium(
""
);

setRenewalNextDate(
""
);
}

/* ------------------------------------------------------------------------ */
/* SAVE RENEWAL FOLLOW-UP */
/* ------------------------------------------------------------------------ */

async function saveRenewalFollowUp(
event:
React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (
!renewalCustomer
) {
return;
}

try {
setSavingRenewal(
true
);

setRenewalError(
""
);

setRenewalSuccess(
""
);

const userId =
getLoggedInUserId();

if (
!userId
) {
throw new Error(
"Login information not found."
);
}

if (
!selectedPolicyId
) {
throw new Error(
"Please select a policy."
);
}

if (
!renewalFollowUpDate
) {
throw new Error(
"Please select follow-up date."
);
}

if (
!renewalRemarks.trim()
) {
throw new Error(
"Agent follow-up remark is required."
);
}

if (
renewalStatus ===
"FOLLOW_UP" &&
!renewalNextDate
) {
throw new Error(
"Please select next follow-up date."
);
}

const response =
await fetch(
"/api/renewal-follow-ups",
{
method:
"POST",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify({
userId,

customerId:
renewalCustomer.id,

policyId:
selectedPolicyId,

status:
renewalStatus,

followUpDate:
renewalFollowUpDate,

nextFollowUpDate:
renewalNextDate ||
null,

remarks:
renewalRemarks.trim(),

quotedPremium:
renewalQuotedPremium
? Number(
renewalQuotedPremium
)
: null,
}),
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

setRenewalSuccess(
data.message ||
"Renewal follow-up saved successfully."
);

if (
data.followUp
) {
setRenewalHistory(
(
previous
) => [
data.followUp,
...previous,
]
);
} else {
await reloadRenewalHistory(
renewalCustomer.id
);
}

setRenewalRemarks(
""
);

setRenewalNextDate(
""
);

setRenewalFollowUpDate(
todayForInput()
);

setRenewalStatus(
"FOLLOW_UP"
);
} catch (
error
) {
console.error(
"SAVE RENEWAL FOLLOW-UP ERROR:",
error
);

setRenewalError(
error instanceof
Error
? error.message
: "Unable to save renewal follow-up."
);
} finally {
setSavingRenewal(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* RELOAD RENEWAL HISTORY */
/* ------------------------------------------------------------------------ */

async function reloadRenewalHistory(
customerId: string
) {
const userId =
getLoggedInUserId();

if (
!userId
) {
return;
}

try {
const response =
await fetch(
`/api/renewal-follow-ups?userId=${encodeURIComponent(
userId
)}&customerId=${encodeURIComponent(
customerId
)}`,
{
cache:
"no-store",
}
);

const data =
await response.json();

if (
response.ok &&
data.success !==
false
) {
setRenewalHistory(
Array.isArray(
data.followUps
)
? data.followUps
: []
);
}
} catch (
error
) {
console.error(
"RELOAD RENEWAL HISTORY:",
error
);
}
}

/* ------------------------------------------------------------------------ */
/* ACTIVATE / DEACTIVATE */
/* ------------------------------------------------------------------------ */

async function toggleCustomerStatus(
customer: Customer
) {
const currentlyActive =
customer.isActive !==
false;

if (
currentlyActive
) {
const reason =
window.prompt(
`Inactive Reason for ${customer.name}\n\nExamples:\n• Customer requested deactivation\n• Moved to another agent\n• Service stopped\n• Duplicate customer\n• Wrong details\n• Other`
);

if (
reason === null
) {
return;
}

const cleanedReason =
reason.trim();

if (
!cleanedReason
) {
window.alert(
"Inactive reason is required."
);

return;
}

const confirmed =
window.confirm(
`Deactivate ${customer.name}?\n\nReason: ${cleanedReason}`
);

if (
!confirmed
) {
return;
}

try {
setChangingStatusId(
customer.id
);

setMessage(
""
);

const response =
await fetch(
`/api/customers/${customer.id}`,
{
method:
"PATCH",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify({
isActive:
false,

inactiveReason:
cleanedReason,
}),
}
);

const data =
await response.json();

if (
!response.ok ||
!data.success
) {
window.alert(
data.message ||
"Unable to deactivate customer."
);

return;
}

setCustomers(
(
previous
) =>
previous.map(
(
item
) =>
item.id ===
customer.id
? {
...item,

isActive:
false,

inactiveReason:
cleanedReason,

inactiveAt:
data.customer
?.inactiveAt ||
new Date().toISOString(),
}
: item
)
);

setMessage(
`${customer.name} deactivated successfully.`
);
} catch {
window.alert(
"Unable to deactivate customer."
);
} finally {
setChangingStatusId(
null
);
}

return;
}

const confirmed =
window.confirm(
`Activate ${customer.name} again?`
);

if (
!confirmed
) {
return;
}

try {
setChangingStatusId(
customer.id
);

const response =
await fetch(
`/api/customers/${customer.id}`,
{
method:
"PATCH",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify({
isActive:
true,
}),
}
);

const data =
await response.json();

if (
!response.ok ||
!data.success
) {
window.alert(
data.message ||
"Unable to activate customer."
);

return;
}

setCustomers(
(
previous
) =>
previous.map(
(
item
) =>
item.id ===
customer.id
? {
...item,

isActive:
true,

inactiveReason:
null,

inactiveAt:
null,
}
: item
)
);

setMessage(
`${customer.name} activated successfully.`
);
} catch {
window.alert(
"Unable to activate customer."
);
} finally {
setChangingStatusId(
null
);
}
}

/* ------------------------------------------------------------------------ */
/* DELETE CUSTOMER */
/* ------------------------------------------------------------------------ */

async function deleteCustomer(
customer: Customer
) {
const confirmed =
window.confirm(
`Delete ${customer.name}?\n\nCustomer ID: ${customer.customerId}\n\nIf policies are linked, deletion will be blocked.`
);

if (
!confirmed
) {
return;
}

try {
setDeletingId(
customer.id
);

const response =
await fetch(
`/api/customers/${customer.id}`,
{
method:
"DELETE",
}
);

const data =
await response.json();

if (
!response.ok ||
!data.success
) {
window.alert(
data.message ||
"Unable to delete customer."
);

return;
}

setCustomers(
(
previous
) =>
previous.filter(
(
item
) =>
item.id !==
customer.id
)
);

window.alert(
`${customer.name} deleted successfully.`
);
} catch {
window.alert(
"Unable to delete customer."
);
} finally {
setDeletingId(
null
);
}
}

/* ------------------------------------------------------------------------ */
/* COUNTS */
/* ------------------------------------------------------------------------ */

const activeCount =
useMemo(
() =>
customers.filter(
(
customer
) =>
customer.isActive !==
false
).length,
[
customers,
]
);

const inactiveCount =
useMemo(
() =>
customers.filter(
(
customer
) =>
customer.isActive ===
false
).length,
[
customers,
]
);

const selfCustomerCount =
useMemo(
() =>
customers.filter(
(
customer
) =>
!isSubAgentCustomer(
customer
)
).length,
[
customers,
]
);

const subAgentCustomerCount =
useMemo(
() =>
customers.filter(
(
customer
) =>
isSubAgentCustomer(
customer
)
).length,
[
customers,
]
);

/* ------------------------------------------------------------------------ */
/* BIRTHDAY */
/* ------------------------------------------------------------------------ */

const upcomingBirthdays =
useMemo(
() =>
customers
.filter(
(
customer
) =>
customer.isActive !==
false
)
.map(
(
customer
) => ({
customer,

birthday:
getBirthdayInfo(
customer.dateOfBirth
),
})
)
.filter(
(
item
) =>
item.birthday &&
item.birthday.days <=
7
)
.sort(
(
a,
b
) =>
(
a.birthday?.days ??
999
) -
(
b.birthday?.days ??
999
)
),
[
customers,
]
);

/* ------------------------------------------------------------------------ */
/* FILTER */
/* ------------------------------------------------------------------------ */

const filteredCustomers =
useMemo(
() => {
let list =
[
...customers,
];

if (
statusFilter ===
"ACTIVE"
) {
list =
list.filter(
(
customer
) =>
customer.isActive !==
false
);
}

if (
statusFilter ===
"INACTIVE"
) {
list =
list.filter(
(
customer
) =>
customer.isActive ===
false
);
}

if (
sourceFilter ===
"SELF"
) {
list =
list.filter(
(
customer
) =>
!isSubAgentCustomer(
customer
)
);
}

if (
sourceFilter ===
"SUB_AGENT"
) {
list =
list.filter(
(
customer
) =>
isSubAgentCustomer(
customer
)
);
}

const value =
search
.trim()
.toLowerCase();

if (
value
) {
list =
list.filter(
(
customer
) =>
[
customer.customerId,
customer.name,
customer.phone,
customer.email,
customer.address,
customer.district,
customer.state,
customer.pincode,
customer.inactiveReason,
customer.sourceType,
customer.subAgent?.code,
customer.subAgent?.name,
getCustomerSourceLabel(
customer
),
getFullAddress(
customer
),
].some(
(
field
) =>
String(
field ||
""
)
.toLowerCase()
.includes(
value
)
)
);
}

return list;
},
[
customers,
search,
statusFilter,
sourceFilter,
]
);

/* ------------------------------------------------------------------------ */
/* SELECTED RENEWAL POLICY */
/* ------------------------------------------------------------------------ */

const selectedRenewalPolicy =
useMemo(
() =>
renewalPolicies.find(
(
policy
) =>
policy.id ===
selectedPolicyId
) ||
null,
[
renewalPolicies,
selectedPolicyId,
]
);

/* ------------------------------------------------------------------------ */
/* UI */
/* ------------------------------------------------------------------------ */

return (
<main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

{/* HEADER */}

<header className="border-b border-slate-200 bg-white shadow-sm">

<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">

<div className="flex items-center gap-3">

<Link
href="/dashboard"
className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-black text-slate-950"
>
←
</Link>

<div>

<p className="text-xs font-black uppercase tracking-wider text-blue-700">
Customer Management
</p>

<h1 className="text-2xl font-black">
Customers
</h1>

</div>

</div>

<div className="flex flex-wrap items-center justify-end gap-2">

<Link
href="/customers/import"
className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800"
>
📊 Import Excel
</Link>

<Link
href="/customers/add"
className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
>
+ Add Customer
</Link>

</div>

</div>

</header>

<section className="mx-auto max-w-6xl px-4 py-6">

{/* COUNTS */}

{!loading && (
<div className="grid grid-cols-3 gap-3">

<div className="rounded-2xl border bg-white p-4 shadow-sm">

<p className="text-xs font-bold text-slate-700">
Total
</p>

<p className="mt-1 text-3xl font-black">
{customers.length}
</p>

</div>

<div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">

<p className="text-xs font-bold text-slate-700">
Active
</p>

<p className="mt-1 text-3xl font-black text-emerald-700">
{activeCount}
</p>

</div>

<div className="rounded-2xl border bg-white p-4 shadow-sm">

<p className="text-xs font-bold text-slate-700">
Inactive
</p>

<p className="mt-1 text-3xl font-black text-slate-700">
{inactiveCount}
</p>

</div>

</div>
)}

{/* BIRTHDAY */}

{!loading &&
upcomingBirthdays.length >
0 && (
<div className="mt-4 rounded-2xl border border-pink-200 bg-pink-50 p-4">

<p className="font-black text-pink-900">
🎂 Birthday Reminder
</p>

<p className="mt-1 text-sm font-semibold text-pink-800">
{
upcomingBirthdays.length
}{" "}
birthday reminder
{upcomingBirthdays.length ===
1
? ""
: "s"}{" "}
in the next 7 days
</p>

</div>
)}

{/* SEARCH */}

<div className="mt-5 rounded-2xl border bg-white p-4 shadow-sm">

<label className="text-sm font-black text-slate-950">
Search Customers
</label>

<input
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
placeholder="Customer ID, name, mobile, email or address..."
className="mt-2 w-full rounded-xl border border-slate-500 bg-white px-4 py-3.5 text-base font-bold text-black caret-blue-700 placeholder:font-semibold placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
/>

{/* STATUS */}

<div className="mt-4">

<p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
Status
</p>

<div className="flex flex-wrap gap-2">

<FilterButton
selected={
statusFilter ===
"ALL"
}
onClick={() =>
setStatusFilter(
"ALL"
)
}
>
All ({customers.length})
</FilterButton>

<button
type="button"
onClick={() =>
setStatusFilter(
"ACTIVE"
)
}
className={`rounded-xl px-4 py-2 text-sm font-black ${
statusFilter ===
"ACTIVE"
? "bg-emerald-700 text-white"
: "border bg-white text-slate-900"
}`}
>
Active ({activeCount})
</button>

<button
type="button"
onClick={() =>
setStatusFilter(
"INACTIVE"
)
}
className={`rounded-xl px-4 py-2 text-sm font-black ${
statusFilter ===
"INACTIVE"
? "bg-slate-700 text-white"
: "border bg-white text-slate-900"
}`}
>
Inactive ({inactiveCount})
</button>

</div>

</div>

{/* SOURCE */}

<div className="mt-4 border-t border-slate-200 pt-4">

<p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
Customer Source
</p>

<div className="flex flex-wrap gap-2">

<button
type="button"
onClick={() =>
setSourceFilter(
"ALL"
)
}
className={`rounded-xl px-4 py-2 text-sm font-black ${
sourceFilter ===
"ALL"
? "bg-blue-700 text-white"
: "border border-blue-200 bg-white text-blue-800"
}`}
>
👥 All Agents ({customers.length})
</button>

<button
type="button"
onClick={() =>
setSourceFilter(
"SELF"
)
}
className={`rounded-xl px-4 py-2 text-sm font-black ${
sourceFilter ===
"SELF"
? "bg-indigo-700 text-white"
: "border border-indigo-200 bg-white text-indigo-800"
}`}
>
👤 Self ({selfCustomerCount})
</button>

<button
type="button"
onClick={() =>
setSourceFilter(
"SUB_AGENT"
)
}
className={`rounded-xl px-4 py-2 text-sm font-black ${
sourceFilter ===
"SUB_AGENT"
? "bg-violet-700 text-white"
: "border border-violet-200 bg-white text-violet-800"
}`}
>
🤝 Sub Agent ({subAgentCustomerCount})
</button>

</div>

</div>

</div>

{/* MESSAGE */}

{message && (
<div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
✅ {message}
</div>
)}

{/* LOADING */}

{loading && (
<div className="mt-5 rounded-2xl border bg-white p-10 text-center">

<p className="font-black">
Loading customers...
</p>

</div>
)}

{/* CUSTOMER LIST */}

{!loading && (
<div className="mt-6 space-y-3">

{filteredCustomers.map(
(
customer
) => {
const isExpanded =
expandedCustomers.has(
customer.id
);

const active =
customer.isActive !==
false;

const hasPhone =
Boolean(
String(
customer.phone ||
""
).trim()
);

const whatsapp =
getWhatsAppNumber(
customer.phone
);

const birthday =
getBirthdayInfo(
customer.dateOfBirth
);

const subAgentCustomer =
isSubAgentCustomer(
customer
);

const sourceLabel =
getCustomerSourceLabel(
customer
);

return (
<article
key={
customer.id
}
className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
>

<div className="p-4 md:p-5">

<div className="flex items-start justify-between gap-3">

<div className="min-w-0">

<div className="flex flex-wrap items-center gap-2">

<h3 className="text-xl font-black">
{
customer.name
}
</h3>

<span
className={`rounded-lg px-2.5 py-1 text-xs font-black ${
active
? "bg-emerald-100 text-emerald-800"
: "bg-slate-200 text-slate-800"
}`}
>
{active
? "Active"
: "Inactive"}
</span>

</div>

<div className="mt-2">

<span
className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${
subAgentCustomer
? "bg-violet-100 text-violet-800"
: "bg-blue-100 text-blue-800"
}`}
>
{subAgentCustomer
? "🤝"
: "👤"}{" "}
{
sourceLabel
}
</span>

</div>

<p className="mt-2 text-sm font-semibold text-slate-700">
Customer ID:{" "}
<strong className="text-slate-950">
{
customer.customerId
}
</strong>
</p>

<p className="mt-3 text-sm font-bold">
📱{" "}
{hasPhone
? customer.phone
: "Mobile not provided"}
</p>

<p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
📍{" "}
{getFullAddress(
customer
)}
</p>

</div>

<button
type="button"
onClick={() =>
toggleCustomer(
customer.id
)
}
className="shrink-0 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-black text-blue-800"
>
{isExpanded
? "Close ▲"
: "View More ▼"}
</button>

</div>

{/* MAIN ACTIONS */}

<div className="mt-4 flex flex-wrap gap-2">

{hasPhone && (
<a
href={`tel:${customer.phone}`}
className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800"
>
📞 Call
</a>
)}

{whatsapp && (
<a
href={`https://wa.me/${whatsapp}`}
target="_blank"
rel="noopener noreferrer"
className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white"
>
WhatsApp
</a>
)}

<Link
href={`/policies?customerId=${encodeURIComponent(
customer.id
)}`}
className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-800"
>
📄 View Policies
</Link>

{/* NEW MODAL BUTTON */}

<button
type="button"
onClick={() =>
void openRenewalFollowUp(
customer
)
}
className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-800 transition hover:bg-amber-100"
>
📅 Renewal Follow-up
</button>

{active && (
<Link
href={`/policies/add?customerId=${encodeURIComponent(
customer.id
)}${
customer.subAgentId
? `&subAgentId=${encodeURIComponent(
customer.subAgentId
)}`
: ""
}`}
className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm"
>
+ Add Policy
</Link>
)}

</div>

{/* BIRTHDAY */}

{active &&
birthday &&
birthday.days <=
7 && (
<div className="mt-3 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-black text-pink-900">
🎂 {
birthday.label
}
</div>
)}

{/* INACTIVE */}

{!active &&
customer.inactiveReason && (
<div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3">

<p className="text-xs font-black uppercase text-orange-700">
Inactive Reason
</p>

<p className="mt-1 font-bold text-orange-950">
{
customer.inactiveReason
}
</p>

</div>
)}

</div>

{/* EXPANDED */}

{isExpanded && (
<div className="border-t bg-slate-50 p-4 md:p-5">

<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

<InfoBox
label="Customer Source"
value={
sourceLabel
}
/>

{subAgentCustomer && (
<InfoBox
label="Sub Agent Code"
value={
customer.subAgent
?.code ||
"Not available"
}
/>
)}

{subAgentCustomer && (
<InfoBox
label="Sub Agent Name"
value={
customer.subAgent
?.name ||
"Not available"
}
/>
)}

<InfoBox
label="Email"
value={
customer.email ||
"Not provided"
}
/>

<InfoBox
label="Date of Birth"
value={
formatDate(
customer.dateOfBirth
)
}
/>

<InfoBox
label="Gender"
value={
customer.gender ||
"Not provided"
}
/>

<InfoBox
label="District"
value={
customer.district ||
"Not provided"
}
/>

<InfoBox
label="State"
value={
customer.state ||
"Not provided"
}
/>

<InfoBox
label="Pincode"
value={
customer.pincode ||
"Not provided"
}
/>

<div className="rounded-xl border bg-white p-3 sm:col-span-2 lg:col-span-3">

<p className="text-xs font-black uppercase text-slate-700">
Full Address
</p>

<p className="mt-1 font-bold leading-6 text-slate-950">
{getFullAddress(
customer
)}
</p>

</div>

{customer.notes && (
<div className="rounded-xl border bg-white p-3 sm:col-span-2 lg:col-span-3">

<p className="text-xs font-black uppercase text-slate-700">
Notes
</p>

<p className="mt-1 whitespace-pre-wrap font-semibold text-slate-950">
{
customer.notes
}
</p>

</div>
)}

</div>

{/* EXPANDED ACTIONS */}

<div className="mt-4 flex flex-wrap gap-2 border-t pt-4">

<Link
href={`/customers/${customer.id}`}
className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
>
👁 View Customer
</Link>

{active && (
<Link
href={`/customers/edit/${customer.id}`}
className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-black text-blue-800"
>
✏️ Edit
</Link>
)}

<Link
href={`/policies?customerId=${encodeURIComponent(
customer.id
)}`}
className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-800"
>
📄 View Policies
</Link>

<button
type="button"
onClick={() =>
void openRenewalFollowUp(
customer
)
}
className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-800"
>
📅 Renewal Follow-up
</button>

{active && (
<Link
href={`/policies/add?customerId=${encodeURIComponent(
customer.id
)}${
customer.subAgentId
? `&subAgentId=${encodeURIComponent(
customer.subAgentId
)}`
: ""
}`}
className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
>
+ Add Policy
</Link>
)}

<button
type="button"
disabled={
changingStatusId ===
customer.id
}
onClick={() =>
void toggleCustomerStatus(
customer
)
}
className={`rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-50 ${
active
? "border border-orange-300 bg-orange-50 text-orange-900"
: "bg-emerald-700 text-white"
}`}
>
{changingStatusId ===
customer.id
? "Saving..."
: active
? "⏸ Deactivate"
: "✓ Activate Again"}
</button>

<button
type="button"
disabled={
deletingId ===
customer.id
}
onClick={() =>
void deleteCustomer(
customer
)
}
className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-black text-red-800 disabled:opacity-50"
>
{deletingId ===
customer.id
? "Checking..."
: "🗑 Delete"}
</button>

</div>

</div>
)}

</article>
);
}
)}

{/* EMPTY */}

{filteredCustomers.length ===
0 && (
<div className="rounded-2xl border bg-white p-10 text-center">

<div className="text-4xl">
👥
</div>

<p className="mt-3 font-black">
No customers found
</p>

</div>
)}

</div>
)}

</section>

{/* -------------------------------------------------------------------- */}
{/* RENEWAL FOLLOW-UP MODAL */}
{/* -------------------------------------------------------------------- */}

{renewalCustomer && (
<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 p-3 sm:p-5">

<div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">

{/* MODAL HEADER */}

<div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b bg-white p-4 sm:p-5">

<div>

<p className="text-xs font-black uppercase tracking-wider text-amber-700">
Insurance Renewal
</p>

<h2 className="mt-1 text-xl font-black sm:text-2xl">
Renewal Follow-up
</h2>

<p className="mt-1 text-sm font-bold text-slate-600">
{
renewalCustomer.name
}
{" • "}
{
renewalCustomer.customerId
}
</p>

</div>

<button
type="button"
onClick={
closeRenewalModal
}
disabled={
savingRenewal
}
className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white text-lg font-black text-slate-700 disabled:opacity-50"
>
✕
</button>

</div>

<div className="p-4 sm:p-5">

{/* CUSTOMER CONTACT */}

<div className="flex flex-wrap gap-2">

{renewalCustomer.phone && (
<a
href={`tel:${renewalCustomer.phone}`}
className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800"
>
📞 Call
</a>
)}

{getWhatsAppNumber(
renewalCustomer.phone
) && (
<a
href={`https://wa.me/${getWhatsAppNumber(
renewalCustomer.phone
)}`}
target="_blank"
rel="noopener noreferrer"
className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white"
>
💬 WhatsApp
</a>
)}

<Link
href={`/policies?customerId=${encodeURIComponent(
renewalCustomer.id
)}`}
className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-800"
>
📄 All Policies
</Link>

</div>

{/* LOADING */}

{loadingRenewal && (
<div className="mt-5 rounded-2xl border bg-slate-50 p-8 text-center">

<div className="text-4xl">
⏳
</div>

<p className="mt-2 font-black">
Loading renewal details...
</p>

</div>
)}

{/* ERROR */}

{renewalError && (
<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
⚠️ {
renewalError
}
</div>
)}

{/* SUCCESS */}

{renewalSuccess && (
<div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
✅ {
renewalSuccess
}
</div>
)}

{!loadingRenewal && (
<>
{/* NO POLICY */}

{renewalPolicies.length ===
0 && (
<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">

<p className="font-black text-amber-950">
No active policy found
</p>

<p className="mt-1 text-sm font-semibold text-amber-800">
A renewal follow-up needs an existing policy.
</p>

<Link
href={`/policies/add?customerId=${encodeURIComponent(
renewalCustomer.id
)}`}
className="mt-4 inline-block rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
>
+ Add Policy
</Link>

</div>
)}

{/* FORM */}

{renewalPolicies.length >
0 && (
<form
onSubmit={
saveRenewalFollowUp
}
className="mt-5"
>

{/* POLICY */}

<div>

<label className="text-sm font-black text-slate-900">
Policy *
</label>

<select
value={
selectedPolicyId
}
onChange={(
event
) =>
handlePolicySelection(
event.target.value
)
}
required
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
>

<option value="">
Select policy
</option>

{renewalPolicies.map(
(
policy
) => (
<option
key={
policy.id
}
value={
policy.id
}
>
{policy.policyNumber ||
"Policy"}

{" • "}

{policy.companyName ||
"Company"}

{" • "}

{formatDate(
policy.expiryDate
)}
</option>
)
)}

</select>

</div>

{/* SELECTED POLICY CARD */}

{selectedRenewalPolicy && (
<div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">

<div className="flex flex-wrap items-start justify-between gap-3">

<div>

<p className="text-xs font-black uppercase text-blue-700">
Selected Policy
</p>

<p className="mt-1 text-lg font-black text-blue-950">
{
selectedRenewalPolicy.policyNumber ||
"Policy"
}
</p>

<p className="mt-1 text-sm font-semibold text-blue-900">
{
selectedRenewalPolicy.companyName ||
"-"
}

{selectedRenewalPolicy.productName
? ` • ${selectedRenewalPolicy.productName}`
: ""}
</p>

</div>

{(() => {
const days =
getDaysToExpiry(
selectedRenewalPolicy.expiryDate
);

if (
days === null
) {
return null;
}

return (
<span
className={`rounded-xl px-3 py-2 text-xs font-black ${
days <
0
? "bg-red-100 text-red-800"
: days ===
0
? "bg-red-100 text-red-800"
: days <=
30
? "bg-orange-100 text-orange-800"
: "bg-yellow-100 text-yellow-800"
}`}
>
{days <
0
? `${Math.abs(
days
)} days overdue`
: days ===
0
? "Due today"
: `${days} days remaining`}
</span>
);
})()}

</div>

<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">

<MiniInfo
label="Expiry"
value={
formatDate(
selectedRenewalPolicy.expiryDate
)
}
/>

<MiniInfo
label="Current Premium"
value={`₹ ${formatMoney(
selectedRenewalPolicy.customerPremium ??
selectedRenewalPolicy.premium
)}`}
/>

<MiniInfo
label="Policy Type"
value={
selectedRenewalPolicy.policyType ||
"-"
}
/>

</div>

</div>
)}

{/* STATUS */}

<div className="mt-5">

<label className="text-sm font-black text-slate-900">
Renewal Status *
</label>

<select
value={
renewalStatus
}
onChange={(
event
) =>
setRenewalStatus(
event.target
.value as
RenewalFollowUpStatus
)
}
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-950"
>

<option value="NOT_CONTACTED">
☎️ Not Contacted
</option>

<option value="CONTACTED">
📞 Contacted
</option>

<option value="FOLLOW_UP">
📅 Follow-up Required
</option>

<option value="INTERESTED">
👍 Interested
</option>

<option value="PAYMENT_PENDING">
💰 Payment Pending
</option>

<option value="RENEWED">
✅ Renewed
</option>

<option value="CLOSED">
❌ Closed
</option>

</select>

</div>

{/* DATES */}

<div className="mt-4 grid gap-4 sm:grid-cols-2">

<div>

<label className="text-sm font-black text-slate-900">
Follow-up Date *
</label>

<input
type="date"
value={
renewalFollowUpDate
}
onChange={(
event
) =>
setRenewalFollowUpDate(
event.target.value
)
}
required
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-950"
/>

</div>

<div>

<label className="text-sm font-black text-slate-900">
Next Follow-up Date
{renewalStatus ===
"FOLLOW_UP"
? " *"
: ""}
</label>

<input
type="date"
value={
renewalNextDate
}
onChange={(
event
) =>
setRenewalNextDate(
event.target.value
)
}
required={
renewalStatus ===
"FOLLOW_UP"
}
className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-950"
/>

</div>

</div>

{/* QUOTE */}

<div className="mt-4">

<label className="text-sm font-black text-slate-900">
Renewal Quote / Premium
</label>

<div className="relative mt-2">

<span className="absolute left-4 top-3 font-black text-slate-500">
₹
</span>

<input
type="number"
min="0"
step="0.01"
value={
renewalQuotedPremium
}
onChange={(
event
) =>
setRenewalQuotedPremium(
event.target.value
)
}
placeholder="Enter quoted renewal premium"
className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-4 font-bold text-slate-950"
/>

</div>

</div>

{/* REMARK */}

<div className="mt-4">

<label className="text-sm font-black text-slate-900">
Agent Follow-up Remark *
</label>

<textarea
value={
renewalRemarks
}
onChange={(
event
) =>
setRenewalRemarks(
event.target.value
)
}
rows={4}
required
placeholder="Example: Spoke to customer. Renewal quote shared. Customer asked to call again on Monday..."
className="mt-2 min-h-[105px] w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
/>

</div>

{/* FORM BUTTONS */}

<div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">

<button
type="button"
disabled={
savingRenewal
}
onClick={
closeRenewalModal
}
className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
>
Cancel
</button>

{selectedRenewalPolicy && (
<Link
href={`/policies/add?renewFrom=${encodeURIComponent(
selectedRenewalPolicy.id
)}`}
className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-black text-blue-800"
>
🔄 Renew Policy
</Link>
)}

<button
type="submit"
disabled={
savingRenewal
}
className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
>
{savingRenewal
? "Saving..."
: "💾 Save Follow-up"}
</button>

</div>

</form>
)}

{/* HISTORY */}

{renewalHistory.length >
0 && (
<div className="mt-7 border-t pt-5">

<div className="flex items-center justify-between gap-3">

<div>

<h3 className="text-lg font-black">
Renewal History
</h3>

<p className="text-sm font-semibold text-slate-500">
Previous renewal discussions for this customer
</p>

</div>

<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
{
renewalHistory.length
}
</span>

</div>

<div className="mt-4 space-y-3">

{renewalHistory.map(
(
followUp
) => (
<div
key={
followUp.id
}
className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
>

<div className="flex flex-wrap items-start justify-between gap-2">

<div>

<p className="font-black">
{
followUp.policy
?.policyNumber ||
"Policy"
}
</p>

<p className="mt-1 text-xs font-semibold text-slate-500">
{
followUp.policy
?.companyName ||
""
}

{followUp.policy
?.productName
? ` • ${followUp.policy.productName}`
: ""}
</p>

</div>

<span
className={`rounded-lg px-2.5 py-1 text-xs font-black ${getRenewalStatusStyle(
followUp.status
)}`}
>
{getRenewalStatusLabel(
followUp.status
)}
</span>

</div>

<div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">

<MiniInfo
label="Follow-up"
value={
formatDate(
followUp.followUpDate
)
}
/>

<MiniInfo
label="Next"
value={
formatDate(
followUp.nextFollowUpDate
)
}
/>

<MiniInfo
label="Quote"
value={
followUp.quotedPremium !==
null &&
followUp.quotedPremium !==
undefined
? `₹ ${formatMoney(
followUp.quotedPremium
)}`
: "-"
}
/>

</div>

{followUp.remarks && (
<div className="mt-3 rounded-xl border bg-white p-3">

<p className="text-xs font-black uppercase text-slate-500">
Agent Remark
</p>

<p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-800">
{
followUp.remarks
}
</p>

</div>
)}

</div>
)
)}

</div>

</div>
)}

</>
)}

</div>

</div>

</div>
)}

</main>
);
}

/* -------------------------------------------------------------------------- */
/* FILTER BUTTON */
/* -------------------------------------------------------------------------- */

function FilterButton({
selected,
onClick,
children,
}: {
selected:
boolean;

onClick:
() => void;

children:
React.ReactNode;
}) {
return (
<button
type="button"
onClick={
onClick
}
className={`rounded-xl px-4 py-2 text-sm font-black ${
selected
? "bg-slate-950 text-white"
: "border bg-white text-slate-900"
}`}
>
{children}
</button>
);
}

/* -------------------------------------------------------------------------- */
/* INFO BOX */
/* -------------------------------------------------------------------------- */

function InfoBox({
label,
value,
}: {
label:
string;

value:
string;
}) {
return (
<div className="rounded-xl border border-slate-200 bg-white p-3">

<p className="text-xs font-black uppercase text-slate-700">
{label}
</p>

<p className="mt-1 break-words text-sm font-bold text-slate-950">
{value}
</p>

</div>
);
}

/* -------------------------------------------------------------------------- */
/* MINI INFO */
/* -------------------------------------------------------------------------- */

function MiniInfo({
label,
value,
}: {
label:
string;

value:
string;
}) {
return (
<div className="rounded-xl bg-white p-3">

<p className="text-[11px] font-black uppercase text-slate-500">
{label}
</p>

<p className="mt-1 break-words text-sm font-black text-slate-900">
{value}
</p>

</div>
);
}