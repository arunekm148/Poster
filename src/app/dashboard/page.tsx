"use client";

import Link from "next/link";
import {
useCallback,
useEffect,
useMemo,
useState,
} from "react";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type AccountMode =
| "SELF"
| "SELF_STAFF"
| "SELF_STAFF_SUBAGENT";

type AgentUser = {
id?: string;
userId?: string;
staffId?: string | null;
name?: string;
phone?: string;
email?: string | null;
role?: string;
accountType?: "USER" | "STAFF";
accountMode?: AccountMode;
staffCode?: string;
designation?: string | null;
department?: string | null;
logoUrl?: string | null;
state?: string | null;
district?: string | null;
};

type Customer = {
id: string;
customerId: string;
name: string;
phone: string;
email?: string | null;
dateOfBirth?: string | null;
district?: string | null;
state?: string | null;
isActive?: boolean;
};

type SubAgent = {
id: string;
userId?: string;
code?: string;
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

createdAt?: string | null;
updatedAt?: string | null;
};

type Policy = {
id: string;
customerId?: string;
policyNumber?: string;
companyName?: string;
productName?: string | null;
policyType?: string | null;

premium?: number | string | null;
actualPremium?: number | string | null;
customerPremium?: number | string | null;

sumInsured?: number | string | null;

startDate?: string | null;
expiryDate?: string | null;
createdAt?: string | null;

paymentType?: string | null;
policyStage?: string | null;
isActive?: boolean;
notes?: string | null;

customer?: {
id?: string;
customerId?: string;
name?: string;
phone?: string;
};

installments?: EmiInstallment[];
};

type EmiInstallment = {
id: string;
policyId?: string;
installmentNumber?: number;
dueDate?: string | null;
amount?: number | string | null;
status?: string;
collectedDate?: string | null;
collectedAmount?: number | string | null;
remarks?: string | null;
};

type Enquiry = {
id: string;
customerId?: string;
businessType?: string;
requirement?: string | null;
remarks?: string | null;
status?: string;
enquiryDate?: string;
nextFollowUpDate?: string | null;

customer?: {
id?: string;
customerId?: string;
name?: string;
phone?: string;
};
};

type FollowUp = {
id: string;
customerId?: string;
enquiryId?: string | null;
comment?: string;
followUpDate?: string;
nextFollowUpDate?: string | null;
status?: string;

customer?: {
id?: string;
customerId?: string;
name?: string;
phone?: string;
};
};

type BirthdayInfo = {
days: number;
label: string;
};

type BusinessFilter =
| "ALL"
| "HEALTH"
| "MOTOR";

type BusinessMetrics = {
fyPremium: number;
thisMonthPremium: number;
renewalCollectedThisMonth: number;
renewalPendingFy: number;

fyPolicyCount: number;
monthPolicyCount: number;
renewalCollectedCount: number;
renewalPendingCount: number;
};

type SupportMessage = {
id: string;
agentId?: string;
sender: "ADMIN" | "AGENT";
message: string;
createdAt: string;
readByAdmin?: boolean;
readByAgent?: boolean;
};

type AdminAnnouncement = {
id: string;
message: string;
isActive?: boolean;
createdAt?: string | null;
updatedAt?: string | null;

createdBy?: {
id?: string;
name?: string;
} | null;
};

/* -------------------------------------------------------------------------- */
/* HELPERS */
/* -------------------------------------------------------------------------- */

function getBirthdayInfo(
dateOfBirth?: string | null
): BirthdayInfo | null {
if (!dateOfBirth) {
return null;
}

const dob =
new Date(dateOfBirth);

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
today.getFullYear() + 1,
dob.getUTCMonth(),
dob.getUTCDate()
);
}

const difference =
nextBirthday.getTime() -
today.getTime();

const days =
Math.round(
difference /
(
1000 *
60 *
60 *
24
)
);

if (days === 0) {
return {
days,
label:
"Birthday Today 🎉",
};
}

if (days === 1) {
return {
days,
label:
"Birthday Tomorrow",
};
}

return {
days,
label:
`Birthday in ${days} days`,
};
}

function formatBirthday(
dateOfBirth?: string | null
) {
if (!dateOfBirth) {
return "";
}

const date =
new Date(
dateOfBirth
);

if (
Number.isNaN(
date.getTime()
)
) {
return "";
}

return date.toLocaleDateString(
"en-IN",
{
day: "2-digit",
month: "short",
timeZone: "UTC",
}
);
}

function formatMoney(
value?:
| number
| string
| null
) {
const number =
Number(
value || 0
);

if (
!Number.isFinite(
number
)
) {
return "₹0";
}

return `₹${number.toLocaleString(
"en-IN",
{
maximumFractionDigits:
2,
}
)}`;
}

function getDateOnly(
value?: string | null
) {
if (!value) {
return null;
}

const date =
new Date(value);

if (
Number.isNaN(
date.getTime()
)
) {
return null;
}

return new Date(
date.getFullYear(),
date.getMonth(),
date.getDate()
);
}

function getPolicyPremium(
policy: Policy
) {
const rawValue =
policy.customerPremium ??
policy.actualPremium ??
policy.premium ??
0;

const value =
Number(rawValue);

return Number.isFinite(
value
)
? value
: 0;
}

function getPolicyBusinessDate(
policy: Policy
) {
return getDateOnly(
policy.startDate ||
policy.createdAt
);
}

function isBetweenInclusive(
date: Date | null,
start: Date,
end: Date
) {
if (!date) {
return false;
}

return (
date.getTime() >=
start.getTime() &&
date.getTime() <=
end.getTime()
);
}

function isRenewalPolicy(
policy: Policy
) {
const notes =
String(
policy.notes || ""
)
.trim()
.toLowerCase();

return (
notes.startsWith(
"renewal of previous policy"
) ||
notes.startsWith(
"renewal of "
)
);
}

function getFinancialYearRange(
referenceDate: Date
) {
const year =
referenceDate.getFullYear();

const month =
referenceDate.getMonth();

const startYear =
month >= 3
? year
: year - 1;

const start =
new Date(
startYear,
3,
1
);

const end =
new Date(
startYear + 1,
2,
31
);

return {
start,
end,

label:
`FY ${startYear}-${String(
startYear + 1
).slice(-2)}`,
};
}

function getMonthRange(
referenceDate: Date
) {
return {
start:
new Date(
referenceDate.getFullYear(),
referenceDate.getMonth(),
1
),

end:
new Date(
referenceDate.getFullYear(),
referenceDate.getMonth() + 1,
0
),
};
}

function sumPolicyPremium(
list: Policy[]
) {
return list.reduce(
(
total,
policy
) =>
total +
getPolicyPremium(
policy
),
0
);
}

function calculateBusinessMetrics(
sourcePolicies: Policy[],
fyStart: Date,
fyEnd: Date,
monthStart: Date,
monthEnd: Date,
today: Date
): BusinessMetrics {
const fyPolicies =
sourcePolicies.filter(
(
policy
) =>
isBetweenInclusive(
getPolicyBusinessDate(
policy
),
fyStart,
fyEnd
)
);

const monthPolicies =
sourcePolicies.filter(
(
policy
) =>
isBetweenInclusive(
getPolicyBusinessDate(
policy
),
monthStart,
monthEnd
)
);

const renewalCollected =
sourcePolicies.filter(
(
policy
) =>
isRenewalPolicy(
policy
) &&
isBetweenInclusive(
getPolicyBusinessDate(
policy
),
monthStart,
monthEnd
)
);

const renewalPending =
sourcePolicies.filter(
(
policy
) => {
if (
policy.isActive ===
false
) {
return false;
}

const expiry =
getDateOnly(
policy.expiryDate
);

if (!expiry) {
return false;
}

return (
expiry.getTime() >=
today.getTime() &&
expiry.getTime() <=
fyEnd.getTime()
);
}
);

return {
fyPremium:
sumPolicyPremium(
fyPolicies
),

thisMonthPremium:
sumPolicyPremium(
monthPolicies
),

renewalCollectedThisMonth:
sumPolicyPremium(
renewalCollected
),

renewalPendingFy:
sumPolicyPremium(
renewalPending
),

fyPolicyCount:
fyPolicies.length,

monthPolicyCount:
monthPolicies.length,

renewalCollectedCount:
renewalCollected.length,

renewalPendingCount:
renewalPending.length,
};
}

function isStaffAccount(
user?: AgentUser | null
) {
const accountType =
String(
user?.accountType ||
""
)
.trim()
.toUpperCase();

const role =
String(
user?.role ||
""
)
.trim()
.toUpperCase()
.replace(/[\s-]+/g, "_");

return (
accountType ===
"STAFF" ||
role ===
"STAFF" ||
role ===
"SUPERVISOR"
);
}

function isMasterAdminRole(
role?: string
) {
const normalized =
String(
role || ""
)
.trim()
.toUpperCase()
.replace(/[\s-]+/g, "_");

return [
"ADMIN",
"MASTER_ADMIN",
"MASTERADMIN",
"SUPER_ADMIN",
"SUPERADMIN",
].includes(
normalized
);
}

/* -------------------------------------------------------------------------- */
/* SMALL UI */
/* -------------------------------------------------------------------------- */

function PerformanceCard({
icon,
title,
value,
count,
valueClass,
}: {
icon: string;
title: string;
value: string;
count: number;
valueClass: string;
}) {
return (
<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

<div className="flex items-start justify-between gap-3">

<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-xl">
{icon}
</div>

<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
{count}
</span>

</div>

<p className="mt-3 text-xs font-bold uppercase leading-5 text-slate-500">
{title}
</p>

<p
className={`mt-1 break-words text-xl font-black ${valueClass}`}
>
{value}
</p>

</div>
);
}

function getAccountModeLabel(
mode: AccountMode
) {
if (mode === "SELF") {
return "Lite";
}

if (
mode ===
"SELF_STAFF_SUBAGENT"
) {
return "Pro";
}

return "Classic";
}

function getAccountModeDescription(
mode: AccountMode
) {
if (mode === "SELF") {
return "Self use";
}

if (
mode ===
"SELF_STAFF_SUBAGENT"
) {
return "Self + Staff + Sub Agent";
}

return "Self + Staff";
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
const router =
useRouter();

const [
user,
setUser,
] =
useState<
AgentUser | null
>(null);

const [
accountMode,
setAccountMode,
] =
useState<AccountMode>(
"SELF_STAFF"
);

const [
accountModeSaving,
setAccountModeSaving,
] =
useState(false);

const [
accountModeMessage,
setAccountModeMessage,
] =
useState("");

const [
customers,
setCustomers,
] =
useState<
Customer[]
>([]);

const [
subAgents,
setSubAgents,
] =
useState<
SubAgent[]
>([]);

const [
policies,
setPolicies,
] =
useState<
Policy[]
>([]);

const [
enquiries,
setEnquiries,
] =
useState<
Enquiry[]
>([]);

const [
followUps,
setFollowUps,
] =
useState<
FollowUp[]
>([]);

const [
announcements,
setAnnouncements,
] =
useState<
AdminAnnouncement[]
>([]);

const [
loading,
setLoading,
] =
useState(true);

const [
dashboardLoading,
setDashboardLoading,
] =
useState(true);

const [
businessFilter,
setBusinessFilter,
] =
useState<BusinessFilter>(
"ALL"
);

/* ------------------------------------------------------------------------ */
/* PLATFORM FEATURE FLAGS                                                   */
/* ------------------------------------------------------------------------ */

const [
examModuleEnabled,
setExamModuleEnabled,
] =
useState(false);

const [
examModuleSettingLoaded,
setExamModuleSettingLoaded,
] =
useState(false);

/* ------------------------------------------------------------------------ */
/* LIVE DATE / TIME + COMPACT REMINDER */
/* ------------------------------------------------------------------------ */

const [
currentDateTime,
setCurrentDateTime,
] =
useState<Date | null>(
null
);

const [
quickNote,
setQuickNote,
] =
useState(
""
);

const [
quickNoteSaved,
setQuickNoteSaved,
] =
useState(
false
);

const [
quickNoteEditing,
setQuickNoteEditing,
] =
useState(
false
);

/* ------------------------------------------------------------------------ */
/* ADMIN SUPPORT */
/* ------------------------------------------------------------------------ */

const [
supportOpen,
setSupportOpen,
] =
useState(false);

const [
supportText,
setSupportText,
] =
useState("");

const [
supportMessages,
setSupportMessages,
] =
useState<
SupportMessage[]
>([]);

const [
supportLoading,
setSupportLoading,
] =
useState(false);

const [
supportSending,
setSupportSending,
] =
useState(false);

const [
supportError,
setSupportError,
] =
useState("");

const loadSupportMessages =
useCallback(
async (
agentId: string,
quiet = false
) => {
try {
if (!quiet) {
setSupportLoading(
true
);
}

setSupportError(
""
);

const response =
await fetch(
`/api/support?agentId=${encodeURIComponent(
agentId
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
throw new Error(
data.message ||
"Unable to load support messages."
);
}

const list =
Array.isArray(
data.messages
)
? data.messages
: Array.isArray(
data.data
)
? data.data
: [];

setSupportMessages(
list
);
} catch (error) {
console.error(
"LOAD AGENT SUPPORT ERROR:",
error
);

setSupportError(
error instanceof Error
? error.message
: "Unable to load support messages."
);
} finally {
if (!quiet) {
setSupportLoading(
false
);
}
}
},
[]
);

async function sendSupportMessage() {
const text =
supportText.trim();

if (
!text ||
!user?.id ||
supportSending
) {
return;
}

try {
setSupportSending(
true
);

setSupportError(
""
);

const response =
await fetch(
"/api/support",
{
method:
"POST",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify({
agentId:
user.id,

message:
text,
}),
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
throw new Error(
data.message ||
"Unable to send support message."
);
}

setSupportText(
""
);

await loadSupportMessages(
user.id,
true
);
} catch (error) {
console.error(
"SEND SUPPORT ERROR:",
error
);

setSupportError(
error instanceof Error
? error.message
: "Unable to send support message."
);
} finally {
setSupportSending(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* ACCOUNT MODE */
/* ------------------------------------------------------------------------ */

const loadAccountMode =
useCallback(
async (
userId: string
) => {
try {
const response =
await fetch(
`/api/account-mode?userId=${encodeURIComponent(
userId
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
throw new Error(
data.message ||
"Unable to load account mode."
);
}

const nextMode =
String(
data.accountMode ||
"SELF_STAFF"
).toUpperCase();

if (
nextMode === "SELF" ||
nextMode === "SELF_STAFF" ||
nextMode === "SELF_STAFF_SUBAGENT"
) {
setAccountMode(
nextMode as AccountMode
);

setUser(
(current) =>
current
? {
...current,
accountMode:
nextMode as AccountMode,
}
: current
);

try {
const savedUser =
localStorage.getItem(
"agentUser"
);

if (savedUser) {
const parsed =
JSON.parse(
savedUser
);

localStorage.setItem(
"agentUser",
JSON.stringify({
...parsed,
accountMode:
nextMode,
})
);
}
} catch {
//
}
}
} catch (error) {
console.error(
"LOAD ACCOUNT MODE ERROR:",
error
);
}
},
[]
);

async function changeAccountMode(
nextMode: AccountMode
) {
if (
!user?.id ||
String(
user.role ||
""
).toUpperCase() !==
"AGENT" ||
accountModeSaving ||
nextMode ===
accountMode
) {
return;
}

try {
setAccountModeSaving(
true
);

setAccountModeMessage(
""
);

const response =
await fetch(
"/api/account-mode",
{
method:
"PATCH",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify({
userId:
user.id,

accountMode:
nextMode,
}),
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
throw new Error(
data.message ||
"Unable to change mode."
);
}

const savedMode =
String(
data.accountMode ||
nextMode
).toUpperCase() as AccountMode;

setAccountMode(
savedMode
);

setUser(
(current) =>
current
? {
...current,
accountMode:
savedMode,
}
: current
);

try {
const savedUser =
localStorage.getItem(
"agentUser"
);

if (savedUser) {
const parsed =
JSON.parse(
savedUser
);

localStorage.setItem(
"agentUser",
JSON.stringify({
...parsed,
accountMode:
savedMode,
})
);
}
} catch {
//
}

setAccountModeMessage(
`${getAccountModeLabel(
savedMode
)} mode selected.`
);

window.setTimeout(
() => {
setAccountModeMessage(
""
);
},
2200
);
} catch (error) {
console.error(
"CHANGE ACCOUNT MODE ERROR:",
error
);

setAccountModeMessage(
error instanceof Error
? error.message
: "Unable to change mode."
);
} finally {
setAccountModeSaving(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* LOAD DASHBOARD */
/* ------------------------------------------------------------------------ */

const loadDashboardData =
useCallback(
async (
userId: string
) => {
try {
setDashboardLoading(
true
);

const [
customerResult,
subAgentResult,
policyResult,
enquiryResult,
followUpResult,
announcementResult,
] =
await Promise.allSettled(
[
fetch(
`/api/customers?userId=${encodeURIComponent(
userId
)}`,
{
cache:
"no-store",
}
).then(
async (
response
) => ({
response,
data:
await response.json(),
})
),

fetch(
`/api/sub-agents?userId=${encodeURIComponent(
userId
)}`,
{
cache:
"no-store",
}
).then(
async (
response
) => ({
response,
data:
await response.json(),
})
),

fetch(
`/api/policies?userId=${encodeURIComponent(
userId
)}`,
{
cache:
"no-store",
}
).then(
async (
response
) => ({
response,
data:
await response.json(),
})
),

fetch(
`/api/enquiries?userId=${encodeURIComponent(
userId
)}`,
{
cache:
"no-store",
}
).then(
async (
response
) => ({
response,
data:
await response.json(),
})
),

fetch(
`/api/follow-ups?userId=${encodeURIComponent(
userId
)}`,
{
cache:
"no-store",
}
).then(
async (
response
) => ({
response,
data:
await response.json(),
})
),

fetch(
"/api/announcements",
{
cache:
"no-store",
}
).then(
async (
response
) => ({
response,
data:
await response.json(),
})
),
]
);

/* CUSTOMERS */

if (
customerResult.status ===
"fulfilled"
) {
const {
response,
data,
} =
customerResult.value;

if (
response.ok &&
data.success !==
false
) {
setCustomers(
Array.isArray(
data.customers
)
? data.customers
: Array.isArray(
data.data
)
? data.data
: Array.isArray(
data
)
? data
: []
);
} else {
setCustomers([]);
}
} else {
setCustomers([]);
}

/* SUB AGENTS */

if (
subAgentResult.status ===
"fulfilled"
) {
const {
response,
data,
} =
subAgentResult.value;

if (
response.ok &&
data.success !==
false
) {
if (
Array.isArray(
data
)
) {
setSubAgents(
data
);
} else if (
Array.isArray(
data.subAgents
)
) {
setSubAgents(
data.subAgents
);
} else if (
Array.isArray(
data.subagents
)
) {
setSubAgents(
data.subagents
);
} else if (
Array.isArray(
data.data
)
) {
setSubAgents(
data.data
);
} else {
setSubAgents(
[]
);
}
} else {
setSubAgents([]);
}
} else {
setSubAgents([]);
}

/* POLICIES */

if (
policyResult.status ===
"fulfilled"
) {
const {
response,
data,
} =
policyResult.value;

if (
response.ok &&
data.success !==
false
) {
setPolicies(
Array.isArray(
data.policies
)
? data.policies
: Array.isArray(
data.data
)
? data.data
: Array.isArray(
data
)
? data
: []
);
} else {
setPolicies([]);
}
} else {
setPolicies([]);
}

/* ENQUIRIES */

if (
enquiryResult.status ===
"fulfilled"
) {
const {
response,
data,
} =
enquiryResult.value;

if (
response.ok &&
data.success !==
false
) {
setEnquiries(
Array.isArray(
data.enquiries
)
? data.enquiries
: Array.isArray(
data.data
)
? data.data
: Array.isArray(
data
)
? data
: []
);
} else {
setEnquiries([]);
}
} else {
setEnquiries([]);
}

/* FOLLOW UPS */

if (
followUpResult.status ===
"fulfilled"
) {
const {
response,
data,
} =
followUpResult.value;

if (
response.ok &&
data.success !==
false
) {
setFollowUps(
Array.isArray(
data.followUps
)
? data.followUps
: Array.isArray(
data.followups
)
? data.followups
: Array.isArray(
data.data
)
? data.data
: Array.isArray(
data
)
? data
: []
);
} else {
setFollowUps([]);
}
} else {
setFollowUps([]);
}

/* ANNOUNCEMENTS */

if (
announcementResult.status ===
"fulfilled"
) {
const {
response,
data,
} =
announcementResult.value;

if (
response.ok &&
data.success !==
false
) {
setAnnouncements(
Array.isArray(
data.announcements
)
? data.announcements
: Array.isArray(
data.data
)
? data.data
: Array.isArray(
data
)
? data
: []
);
} else {
setAnnouncements(
[]
);
}
} else {
setAnnouncements(
[]
);
}
} catch (error) {
console.error(
"DASHBOARD LOAD ERROR:",
error
);
} finally {
setDashboardLoading(
false
);
}
},
[]
);

/* ------------------------------------------------------------------------ */
/* EXAM MODULE FEATURE FLAG                                                  */
/* ------------------------------------------------------------------------ */

const loadExamModuleSetting =
useCallback(
async () => {
try {
const response =
await fetch(
"/api/admin/platform-settings?key=EXAM_MODULE_ENABLED",
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
throw new Error(
data.message ||
"Unable to load Exam Module setting."
);
}

const enabled =
String(
data.setting?.value ||
"false"
)
.trim()
.toLowerCase() ===
"true";

setExamModuleEnabled(
enabled
);
} catch (error) {
console.error(
"LOAD EXAM MODULE SETTING ERROR:",
error
);

/*
 * Safety default:
 * if the setting cannot be read,
 * keep the agent-facing exam module hidden.
 */
setExamModuleEnabled(
false
);
} finally {
setExamModuleSettingLoaded(
true
);
}
},
[]
);

/* ------------------------------------------------------------------------ */
/* USER */
/* ------------------------------------------------------------------------ */

useEffect(() => {
try {
const savedUser =
localStorage.getItem(
"agentUser"
);

if (!savedUser) {
router.replace(
"/login"
);

return;
}

const parsedUser:
AgentUser =
JSON.parse(
savedUser
);

if (
!parsedUser?.id
) {
localStorage.removeItem(
"agentUser"
);

localStorage.removeItem(
"userId"
);

router.replace(
"/login"
);

return;
}

setUser(
parsedUser
);

const savedMode =
parsedUser.accountMode;

if (
savedMode === "SELF" ||
savedMode === "SELF_STAFF" ||
savedMode === "SELF_STAFF_SUBAGENT"
) {
setAccountMode(
savedMode
);
}

const dashboardUserId =
isStaffAccount(
parsedUser
)
? parsedUser.userId
: parsedUser.id;

if (!dashboardUserId) {
throw new Error(
"Dashboard user ID is missing"
);
}

localStorage.setItem(
"userId",
dashboardUserId
);

if (
!isStaffAccount(
parsedUser
) &&
String(
parsedUser.role ||
""
).toUpperCase() ===
"AGENT"
) {
void loadAccountMode(
dashboardUserId
);
}

void loadDashboardData(
dashboardUserId
);

void loadExamModuleSetting();
} catch (error) {
console.error(
"LOAD USER ERROR:",
error
);

localStorage.removeItem(
"agentUser"
);

localStorage.removeItem(
"userId"
);

router.replace(
"/login"
);
} finally {
setLoading(
false
);
}
}, [
router,
loadDashboardData,
loadAccountMode,
loadExamModuleSetting,
]);

/* ------------------------------------------------------------------------ */
/* LIVE CLOCK */
/* ------------------------------------------------------------------------ */

useEffect(() => {
const updateClock = () => {
setCurrentDateTime(
new Date()
);
};

updateClock();

const timer =
window.setInterval(
updateClock,
1000
);

return () => {
window.clearInterval(
timer
);
};
}, []);

/* ------------------------------------------------------------------------ */
/* COMPACT REMINDER STORAGE */
/* ------------------------------------------------------------------------ */

useEffect(() => {
try {
const savedNote =
localStorage.getItem(
"dashboardQuickNote"
);

if (savedNote) {
setQuickNote(
savedNote
);
}
} catch (error) {
console.error(
"LOAD QUICK NOTE ERROR:",
error
);
}
}, []);

function saveQuickNote() {
try {
localStorage.setItem(
"dashboardQuickNote",
quickNote
);

setQuickNoteSaved(
true
);

setQuickNoteEditing(
false
);

window.setTimeout(
() => {
setQuickNoteSaved(
false
);
},
1500
);
} catch (error) {
console.error(
"SAVE QUICK NOTE ERROR:",
error
);
}
}

function clearQuickNote() {
const confirmed =
window.confirm(
"Clear the dashboard quick note?"
);

if (!confirmed) {
return;
}

setQuickNote(
""
);

localStorage.removeItem(
"dashboardQuickNote"
);

setQuickNoteSaved(
false
);

setQuickNoteEditing(
false
);
}

/* ------------------------------------------------------------------------ */
/* SUPPORT CHAT AUTO REFRESH */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
!supportOpen ||
!user?.id
) {
return;
}

void loadSupportMessages(
user.id
);

const timer =
window.setInterval(
() => {
void loadSupportMessages(
user.id!,
true
);
},
10000
);

return () => {
window.clearInterval(
timer
);
};
}, [
supportOpen,
user?.id,
loadSupportMessages,
]);

/* ------------------------------------------------------------------------ */
/* MASTER ADMIN */
/* ------------------------------------------------------------------------ */

const showMasterAdmin =
useMemo(
() =>
isMasterAdminRole(
user?.role
),
[
user?.role,
]
);

const staffSession =
useMemo(
() =>
isStaffAccount(
user
),
[
user,
]
);

const canUseStaff =
!staffSession &&
(
showMasterAdmin ||
accountMode ===
"SELF_STAFF" ||
accountMode ===
"SELF_STAFF_SUBAGENT"
);

const canUseSubAgents =
showMasterAdmin ||
accountMode ===
"SELF_STAFF_SUBAGENT";

/* ------------------------------------------------------------------------ */
/* SUB AGENTS */
/* ------------------------------------------------------------------------ */

const activeSubAgents =
useMemo(() => {
return subAgents.filter(
(
subAgent
) =>
subAgent.isActive !==
false
);
}, [
subAgents,
]);

/* ------------------------------------------------------------------------ */
/* DATES */
/* ------------------------------------------------------------------------ */

const today =
useMemo(() => {
const now =
new Date();

return new Date(
now.getFullYear(),
now.getMonth(),
now.getDate()
);
}, []);

const thirtyDaysLater =
useMemo(() => {
const date =
new Date(
today
);

date.setDate(
date.getDate() +
30
);

return date;
}, [
today,
]);

const financialYear =
useMemo(
() =>
getFinancialYearRange(
today
),
[
today,
]
);

const currentMonth =
useMemo(
() =>
getMonthRange(
today
),
[
today,
]
);

/* ------------------------------------------------------------------------ */
/* POLICIES */
/* ------------------------------------------------------------------------ */

const activePolicies =
useMemo(() => {
return policies.filter(
(
policy
) =>
policy.isActive !==
false
);
}, [
policies,
]);

const totalPremium =
useMemo(() => {
return activePolicies.reduce(
(
total,
policy
) =>
total +
getPolicyPremium(
policy
),
0
);
}, [
activePolicies,
]);

const performancePolicies =
useMemo(() => {
if (
businessFilter ===
"ALL"
) {
return policies;
}

return policies.filter(
(
policy
) =>
String(
policy.policyType ||
""
).toUpperCase() ===
businessFilter
);
}, [
policies,
businessFilter,
]);

const businessMetrics =
useMemo(
() =>
calculateBusinessMetrics(
performancePolicies,
financialYear.start,
financialYear.end,
currentMonth.start,
currentMonth.end,
today
),
[
performancePolicies,
financialYear,
currentMonth,
today,
]
);

const allBusinessMetrics =
useMemo(
() =>
calculateBusinessMetrics(
policies,
financialYear.start,
financialYear.end,
currentMonth.start,
currentMonth.end,
today
),
[
policies,
financialYear,
currentMonth,
today,
]
);

const renewalPolicies =
useMemo(() => {
return activePolicies
.filter(
(
policy
) => {
const expiry =
getDateOnly(
policy.expiryDate
);

if (!expiry) {
return false;
}

return (
expiry >=
today &&
expiry <=
thirtyDaysLater
);
}
)
.sort(
(
a,
b
) =>
(
getDateOnly(
a.expiryDate
)?.getTime() ||
0
) -
(
getDateOnly(
b.expiryDate
)?.getTime() ||
0
)
);
}, [
activePolicies,
today,
thirtyDaysLater,
]);

/* ------------------------------------------------------------------------ */
/* EMI */
/* ------------------------------------------------------------------------ */

const allInstallments =
useMemo(() => {
return activePolicies.flatMap(
(
policy
) => {
const installments =
Array.isArray(
policy.installments
)
? policy.installments
: [];

return installments.map(
(
installment
) => ({
...installment,
policy,
})
);
}
);
}, [
activePolicies,
]);

const emiDue =
useMemo(() => {
return allInstallments.filter(
(
item
) => {
const status =
String(
item.status ||
""
).toUpperCase();

const dueDate =
getDateOnly(
item.dueDate
);

if (
!dueDate ||
status ===
"COLLECTED"
) {
return false;
}

return (
dueDate.getTime() ===
today.getTime()
);
}
);
}, [
allInstallments,
today,
]);

const emiOverdue =
useMemo(() => {
return allInstallments.filter(
(
item
) => {
const status =
String(
item.status ||
""
).toUpperCase();

const dueDate =
getDateOnly(
item.dueDate
);

if (
!dueDate ||
status ===
"COLLECTED"
) {
return false;
}

return (
status ===
"MISSED" ||
dueDate <
today
);
}
);
}, [
allInstallments,
today,
]);

const emiDueAmount =
useMemo(() => {
return [
...emiDue,
...emiOverdue,
].reduce(
(
total,
item
) => {
const amount =
Number(
item.amount ||
0
);

return (
total +
(
Number.isFinite(
amount
)
? amount
: 0
)
);
},
0
);
}, [
emiDue,
emiOverdue,
]);

/* ------------------------------------------------------------------------ */
/* ENQUIRIES */
/* ------------------------------------------------------------------------ */

const newEnquiries =
useMemo(() => {
return enquiries.filter(
(
enquiry
) =>
String(
enquiry.status ||
""
).toUpperCase() ===
"NEW"
);
}, [
enquiries,
]);

const enquiryFollowUps =
useMemo(() => {
return enquiries.filter(
(
enquiry
) =>
String(
enquiry.status ||
""
).toUpperCase() ===
"FOLLOW_UP"
);
}, [
enquiries,
]);

/* ------------------------------------------------------------------------ */
/* FOLLOW UPS */
/* ------------------------------------------------------------------------ */

const pendingFollowUps =
useMemo(() => {
return followUps.filter(
(
followUp
) =>
String(
followUp.status ||
""
).toUpperCase() ===
"PENDING"
);
}, [
followUps,
]);

const todayFollowUps =
useMemo(() => {
return pendingFollowUps.filter(
(
followUp
) => {
const date =
getDateOnly(
followUp.followUpDate
);

return (
date?.getTime() ===
today.getTime()
);
}
);
}, [
pendingFollowUps,
today,
]);

const overdueFollowUps =
useMemo(() => {
return pendingFollowUps.filter(
(
followUp
) => {
const date =
getDateOnly(
followUp.followUpDate
);

return (
date !== null &&
date <
today
);
}
);
}, [
pendingFollowUps,
today,
]);

/* ------------------------------------------------------------------------ */
/* BIRTHDAYS */
/* ------------------------------------------------------------------------ */

const upcomingBirthdays =
useMemo(() => {
return customers
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
item.birthday !==
null &&
item.birthday.days >=
0 &&
item.birthday.days <=
7
)
.sort(
(
a,
b
) =>
(
a.birthday
?.days ??
999
) -
(
b.birthday
?.days ??
999
)
);
}, [
customers,
]);

const birthdaysToday =
upcomingBirthdays.filter(
(
item
) =>
item.birthday
?.days === 0
).length;

/* ------------------------------------------------------------------------ */
/* LOGOUT */
/* ------------------------------------------------------------------------ */

function handleLogout() {
localStorage.removeItem(
"agentUser"
);

localStorage.removeItem(
"userId"
);

router.replace(
"/login"
);
}

/* ------------------------------------------------------------------------ */
/* LOADING */
/* ------------------------------------------------------------------------ */

if (loading) {
return (
<main className="flex min-h-screen items-center justify-center bg-slate-50">

<div className="text-center">

<div className="mb-3 text-4xl">
🛡️
</div>

<p className="font-medium text-slate-600">
Loading dashboard...
</p>

</div>

</main>
);
}

if (!user) {
return null;
}

/* ------------------------------------------------------------------------ */
/* UI */
/* ------------------------------------------------------------------------ */

return (
<main className="min-h-screen bg-slate-50 pb-24 md:pb-8">

{/* HEADER */}

<header className="overflow-hidden bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">

<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

<div>

<p className="text-xs text-blue-200">
Welcome back
</p>

<h1 className="text-xl font-black">
{user.name ||
"Agent"}
</h1>

<p className="mt-0.5 text-xs text-blue-200">
{staffSession
? String(
user.role ||
"STAFF"
).toUpperCase() ===
"SUPERVISOR"
? "Supervisor Dashboard"
: "Staff Dashboard"
: "Agent Dashboard"}
</p>

<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-white">

<span>
📅{" "}
{currentDateTime
? currentDateTime.toLocaleDateString(
"en-IN",
{
weekday: "long",
day: "2-digit",
month: "long",
year: "numeric",
}
)
: "Loading date..."}
</span>

<span className="hidden text-blue-300 sm:inline">
•
</span>

<span className="tabular-nums text-amber-300">
🕒{" "}
{currentDateTime
? currentDateTime.toLocaleTimeString(
"en-IN",
{
hour: "2-digit",
minute: "2-digit",
second: "2-digit",
hour12: true,
}
)
: "--:--:--"}
</span>

</div>

</div>

<div className="flex flex-col items-end gap-2">

{!showMasterAdmin &&
!staffSession && (
<>
<div className="flex items-center rounded-xl border border-white/15 bg-white/10 p-1 shadow-inner">

{(
[
{
value:
"SELF" as AccountMode,
label:
"Lite",
},
{
value:
"SELF_STAFF" as AccountMode,
label:
"Classic",
},
{
value:
"SELF_STAFF_SUBAGENT" as AccountMode,
label:
"Pro",
},
]
).map(
(option) => {
const active =
accountMode ===
option.value;

return (
<button
key={
option.value
}
type="button"
disabled={
accountModeSaving
}
onClick={() =>
void changeAccountMode(
option.value
)
}
className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${
active
? "bg-white text-blue-950 shadow"
: "text-blue-100 hover:bg-white/10"
} disabled:cursor-not-allowed disabled:opacity-60`}
>
{option.label}
</button>
);
}
)}

</div>

<div className="text-right text-[10px] font-bold text-blue-200">
{accountModeSaving
? "Changing mode..."
: getAccountModeDescription(
accountMode
)}
</div>

{accountModeMessage && (
<div className="max-w-[260px] rounded-lg bg-emerald-400/15 px-2 py-1 text-right text-[10px] font-bold text-emerald-100">
{accountModeMessage}
</div>
)}
</>
)}

<div className="flex items-center gap-2">

{showMasterAdmin && (
<Link
href="/admin"
className="flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:bg-amber-300"
>
<span>
🛡️
</span>

<span className="hidden sm:inline">
Master Admin
</span>
</Link>
)}

<Link
href="/profile"
className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg"
>
👤
</Link>

<button
type="button"
onClick={
handleLogout
}
className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold"
>
Logout
</button>

</div>

</div>

</div>

{/* LIVE ADMIN ANNOUNCEMENT TICKER */}

{announcements.length >
0 && (
<div className="border-t border-white/10 bg-blue-900/60">

<div className="mx-auto flex max-w-7xl items-center overflow-hidden px-4 py-2.5">

<div className="mr-4 flex shrink-0 items-center gap-2 rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-black text-slate-950">

<span>
📢
</span>

<span>
ADMIN
</span>

</div>

<div className="relative min-w-0 flex-1 overflow-hidden">

<div className="adminTicker whitespace-nowrap text-sm font-semibold text-blue-50">

{announcements.map(
(
announcement,
index
) => (
<span
key={
announcement.id
}
className="inline-block"
>
{
announcement.message
}

{index <
announcements.length -
1 && (
<span className="mx-8 text-yellow-300">
•
</span>
)}
</span>
)
)}

<span className="mx-8 text-yellow-300">
•
</span>

{announcements.map(
(
announcement,
index
) => (
<span
key={`copy-${announcement.id}`}
className="inline-block"
>
{
announcement.message
}

{index <
announcements.length -
1 && (
<span className="mx-8 text-yellow-300">
•
</span>
)}
</span>
)
)}

</div>

</div>

</div>

</div>
)}

</header>

{/* MAIN */}

<section className="mx-auto max-w-7xl px-4 py-5">

{/* MASTER ADMIN ACCESS */}

{showMasterAdmin && (
<Link
href="/admin"
className="mb-5 flex items-center justify-between rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm transition hover:shadow-md"
>

<div className="flex items-center gap-3">

<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow-sm">
🛡️
</div>

<div>

<p className="text-xs font-black uppercase tracking-wider text-amber-700">
Administrator
</p>

<h2 className="text-base font-black text-slate-950">
Master Admin Dashboard
</h2>

<p className="mt-0.5 text-xs font-semibold text-slate-500">
Manage agents, announcements, companies, posters and support.
</p>

</div>

</div>

<div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 font-black text-white">
→
</div>

</Link>
)}

{/* MARKETING + IC-38 EXAM PREPARATION */}

<div className="mt-5 grid gap-4 lg:grid-cols-3">

{/* MARKETING CENTRE - MORE SPACE */}

<div
className={`rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-lg ${
examModuleSettingLoaded &&
examModuleEnabled
? "lg:col-span-2"
: "lg:col-span-3"
}`}
>

<div className="flex h-full flex-col gap-5 md:flex-row md:items-center md:justify-between">

<div className="max-w-2xl">

<p className="text-xs font-black uppercase tracking-wider text-blue-200">
Marketing Centre
</p>

<h2 className="mt-2 text-xl font-black md:text-2xl">
🎨 Create Insurance Posters
</h2>

<p className="mt-2 text-sm font-semibold leading-6 text-blue-100">
Create personalised insurance posters for WhatsApp, social media and customer promotions.
</p>

<div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-blue-100">
<span className="rounded-full bg-white/10 px-3 py-1.5">Motor</span>
<span className="rounded-full bg-white/10 px-3 py-1.5">Health</span>
<span className="rounded-full bg-white/10 px-3 py-1.5">Life</span>
<span className="rounded-full bg-white/10 px-3 py-1.5">Festival</span>
</div>

</div>

<Link
href="/posters?v=20260828"
className="shrink-0 rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-blue-900 shadow-sm transition hover:bg-blue-50"
>
Browse Posters →
</Link>

</div>

</div>

{/* IC-38 EXAM PREPARATION */}

{examModuleSettingLoaded &&
examModuleEnabled && (
<Link
href="/exam-preparation"
className="group rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-lg transition hover:border-violet-400 hover:shadow-xl"
>

<div className="flex h-full flex-col justify-between gap-5">

<div>

<div className="flex items-center justify-between gap-3">

<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-700 text-2xl text-white shadow-sm">
🎓
</div>

<span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
Practice
</span>

</div>

<p className="mt-4 text-xs font-black uppercase tracking-wider text-violet-700">
Agent Learning Centre
</p>

<h2 className="mt-1 text-xl font-black text-slate-950">
IC-38 Exam Preparation
</h2>

<p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
Study material, chapter practice and mock tests in multiple Indian languages.
</p>

</div>

<div className="flex items-center justify-between border-t border-violet-100 pt-4">

<span className="text-xs font-black text-violet-700">
Start Preparation
</span>

<span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 font-black text-white transition group-hover:translate-x-1">
→
</span>

</div>

</div>

</Link>
)}

</div>

{/* COMPACT REMINDER */}

<div className="mt-4">

<div className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 shadow-sm">

<div className="flex items-start justify-between gap-3">

<div className="min-w-0 flex-1">

<div className="flex items-center gap-2">

<span className="text-lg">
📌
</span>

<p className="text-xs font-black uppercase tracking-wide text-amber-800">
My Reminder
</p>

{quickNoteSaved && (
<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
Saved
</span>
)}

</div>

{!quickNoteEditing && (
<p className={`mt-1 text-sm font-bold leading-5 ${
quickNote
? "text-slate-900"
: "text-amber-700"
}`}>
{quickNote
? quickNote
: "Add one quick reminder for today."}
</p>
)}

</div>

{!quickNoteEditing && (
<button
type="button"
onClick={() =>
setQuickNoteEditing(
true
)
}
className="shrink-0 rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-black text-amber-950 transition hover:bg-amber-300"
>
{quickNote
? "Edit"
: "+ Add"}
</button>
)}

</div>

{quickNoteEditing && (
<div className="mt-3">

<textarea
value={
quickNote
}
onChange={(
event
) => {
setQuickNote(
event.target.value
);

setQuickNoteSaved(
false
);
}}
placeholder="Example: Call Mr. Raj at 4 PM..."
rows={2}
maxLength={160}
autoFocus
className="w-full resize-none rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
/>

<div className="mt-2 flex flex-wrap items-center justify-between gap-2">

<p className="text-[10px] font-bold text-amber-700">
{quickNote.length}/160
</p>

<div className="flex flex-wrap justify-end gap-2">

{quickNote && (
<button
type="button"
onClick={
clearQuickNote
}
className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-black text-red-700"
>
Clear
</button>
)}

<button
type="button"
onClick={() =>
setQuickNoteEditing(
false
)
}
className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700"
>
Cancel
</button>

<button
type="button"
onClick={
saveQuickNote
}
disabled={
!quickNote.trim()
}
className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
>
Save
</button>

</div>

</div>

</div>
)}

</div>

</div>

{/* TOP SUMMARY */}

<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

<Link
href="/customers"
className="rounded-2xl border bg-white p-4 shadow-sm"
>
<div className="text-2xl">
👥
</div>

<p className="mt-2 text-xs font-semibold text-slate-500">
Customers
</p>

<p className="text-2xl font-black text-slate-950">
{dashboardLoading
? "..."
: customers.length}
</p>
</Link>

{canUseSubAgents && (
<Link
href="/sub-agents"
className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm"
>
<div className="text-2xl">
🤝
</div>

<p className="mt-2 text-xs font-semibold text-violet-700">
Sub Agents
</p>

<p className="text-2xl font-black text-violet-900">
{dashboardLoading
? "..."
: activeSubAgents.length}
</p>

<p className="mt-1 text-[10px] font-bold text-violet-600">
View List →
</p>
</Link>
)}

{canUseStaff && (
<Link
href="/staff/add"
className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm transition hover:border-blue-400 hover:shadow-md"
>
<div className="text-2xl">
👨‍💼
</div>

<p className="mt-2 text-xs font-semibold text-blue-700">
Staff Management
</p>

<p className="text-lg font-black text-blue-950">
+ Add Staff
</p>

<p className="mt-1 text-[10px] font-bold text-blue-600">
Login & Permissions →
</p>
</Link>
)}

<Link
href="/policies"
className="rounded-2xl border bg-white p-4 shadow-sm"
>
<div className="text-2xl">
📄
</div>

<p className="mt-2 text-xs font-semibold text-slate-500">
Active Policies
</p>

<p className="text-2xl font-black text-slate-950">
{dashboardLoading
? "..."
: activePolicies.length}
</p>
</Link>

<Link
href="/renewals"
className="rounded-2xl border bg-white p-4 shadow-sm"
>
<div className="text-2xl">
⏰
</div>

<p className="mt-2 text-xs font-semibold text-slate-500">
Renewals Due
</p>

<p className="text-2xl font-black text-orange-700">
{dashboardLoading
? "..."
: renewalPolicies.length}
</p>
</Link>

<div className="rounded-2xl border bg-white p-4 shadow-sm">

<div className="text-2xl">
₹
</div>

<p className="mt-2 text-xs font-semibold text-slate-500">
Active Premium
</p>

<p className="text-xl font-black text-emerald-700">
{dashboardLoading
? "..."
: formatMoney(
totalPremium
)}
</p>

</div>

</div>

{/* BUSINESS PERFORMANCE */}

<div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">

<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

<div>

<p className="text-xs font-black uppercase tracking-wider text-blue-700">
Business Performance
</p>

<h2 className="mt-1 text-lg font-black text-slate-950">
Premium & Renewal
</h2>

<p className="mt-1 text-xs font-medium text-slate-500">
{financialYear.label}
</p>

</div>

<div className="flex rounded-2xl bg-slate-100 p-1">

<button
type="button"
onClick={() =>
setBusinessFilter(
"ALL"
)
}
className={`rounded-xl px-4 py-2 text-xs font-black ${
businessFilter ===
"ALL"
? "bg-blue-700 text-white"
: "text-slate-600"
}`}
>
All
</button>

<button
type="button"
onClick={() =>
setBusinessFilter(
"HEALTH"
)
}
className={`rounded-xl px-4 py-2 text-xs font-black ${
businessFilter ===
"HEALTH"
? "bg-blue-700 text-white"
: "text-slate-600"
}`}
>
❤️ Health
</button>

<button
type="button"
onClick={() =>
setBusinessFilter(
"MOTOR"
)
}
className={`rounded-xl px-4 py-2 text-xs font-black ${
businessFilter ===
"MOTOR"
? "bg-blue-700 text-white"
: "text-slate-600"
}`}
>
🚗 Motor
</button>

</div>

</div>

<div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">

<PerformanceCard
icon="₹"
title="FY Premium"
value={
dashboardLoading
? "..."
: formatMoney(
businessMetrics.fyPremium
)
}
count={
businessMetrics.fyPolicyCount
}
valueClass="text-emerald-700"
/>

<PerformanceCard
icon="📅"
title="This Month Premium"
value={
dashboardLoading
? "..."
: formatMoney(
businessMetrics.thisMonthPremium
)
}
count={
businessMetrics.monthPolicyCount
}
valueClass="text-blue-700"
/>

<PerformanceCard
icon="✅"
title="Renewal Collected This Month"
value={
dashboardLoading
? "..."
: formatMoney(
businessMetrics.renewalCollectedThisMonth
)
}
count={
businessMetrics.renewalCollectedCount
}
valueClass="text-violet-700"
/>

<PerformanceCard
icon="⏳"
title="Renewal Pending This FY"
value={
dashboardLoading
? "..."
: formatMoney(
businessMetrics.renewalPendingFy
)
}
count={
businessMetrics.renewalPendingCount
}
valueClass="text-orange-700"
/>

</div>

</div>

{/* DAILY WORK */}

<div className="mt-6">

<h2 className="mb-3 text-lg font-black text-slate-950">
Daily Work
</h2>

<div className="grid grid-cols-3 gap-2 md:grid-cols-6">

<Link
href="/enquiries"
className="rounded-2xl border bg-white p-3 text-center shadow-sm"
>
<div className="text-xl">
📥
</div>

<p className="mt-1 text-[11px] font-semibold text-slate-500">
New Enquiries
</p>

<p className="text-xl font-black text-blue-700">
{dashboardLoading
? "..."
: newEnquiries.length}
</p>
</Link>

<Link
href="/enquiries"
className="rounded-2xl border bg-white p-3 text-center shadow-sm"
>
<div className="text-xl">
📞
</div>

<p className="mt-1 text-[11px] font-semibold text-slate-500">
Enquiry Follow-up
</p>

<p className="text-xl font-black text-violet-700">
{dashboardLoading
? "..."
: enquiryFollowUps.length}
</p>
</Link>

<Link
href="/follow-ups"
className="rounded-2xl border bg-white p-3 text-center shadow-sm"
>
<div className="text-xl">
📅
</div>

<p className="mt-1 text-[11px] font-semibold text-slate-500">
Today Follow-ups
</p>

<p className="text-xl font-black text-blue-700">
{dashboardLoading
? "..."
: todayFollowUps.length}
</p>
</Link>

<Link
href="/follow-ups"
className="rounded-2xl border border-red-100 bg-red-50 p-3 text-center shadow-sm"
>
<div className="text-xl">
⚠️
</div>

<p className="mt-1 text-[11px] font-semibold text-red-600">
Overdue Follow-ups
</p>

<p className="text-xl font-black text-red-700">
{dashboardLoading
? "..."
: overdueFollowUps.length}
</p>
</Link>

<Link
href="/emi"
className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-center shadow-sm"
>
<div className="text-xl">
💳
</div>

<p className="mt-1 text-[11px] font-semibold text-orange-700">
EMI Due Today
</p>

<p className="text-xl font-black text-orange-700">
{dashboardLoading
? "..."
: emiDue.length}
</p>
</Link>

<Link
href="/emi"
className="rounded-2xl border border-red-100 bg-red-50 p-3 text-center shadow-sm"
>
<div className="text-xl">
🚨
</div>

<p className="mt-1 text-[11px] font-semibold text-red-600">
EMI Overdue
</p>

<p className="text-xl font-black text-red-700">
{dashboardLoading
? "..."
: emiOverdue.length}
</p>
</Link>

</div>

</div>

{/* EMI + RENEWAL */}

<div className="mt-6 grid gap-4 lg:grid-cols-2">

<div className="rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 p-5 text-white shadow-sm">

<div className="flex items-start justify-between">

<div>

<p className="text-xs font-bold uppercase text-orange-100">
EMI Collection
</p>

<h2 className="mt-1 text-lg font-black">
💳 Pending Collection
</h2>

</div>

<Link
href="/emi"
className="text-xs font-bold text-white"
>
View All →
</Link>

</div>

<p className="mt-4 text-sm text-orange-100">
Total Pending
</p>

<p className="text-3xl font-black">
{dashboardLoading
? "..."
: formatMoney(
emiDueAmount
)}
</p>

</div>

<div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">

<div className="flex items-start justify-between">

<div>

<p className="text-xs font-black uppercase text-blue-700">
Renewal Information
</p>

<h2 className="mt-1 text-lg font-black text-slate-950">
🔄 Renewal Collection
</h2>

</div>

<Link
href="/renewals"
className="text-xs font-black text-blue-700"
>
View All →
</Link>

</div>

<div className="mt-4 grid grid-cols-2 gap-3">

<div className="rounded-2xl bg-white p-3">

<p className="text-xs font-semibold text-slate-500">
Due in 30 Days
</p>

<p className="mt-1 text-2xl font-black text-orange-700">
{dashboardLoading
? "..."
: renewalPolicies.length}
</p>

</div>

<div className="rounded-2xl bg-white p-3">

<p className="text-xs font-semibold text-slate-500">
Pending This FY
</p>

<p className="mt-1 text-lg font-black text-blue-800">
{dashboardLoading
? "..."
: formatMoney(
allBusinessMetrics.renewalPendingFy
)}
</p>

</div>

</div>

</div>

</div>

{/* FOLLOW UPS + BIRTHDAYS */}

<div className="mt-6 grid gap-4 lg:grid-cols-2">

<div className="rounded-3xl border bg-white p-5 shadow-sm">

<div className="flex items-center justify-between">

<h2 className="font-black text-slate-950">
📞 Follow-ups
</h2>

<Link
href="/follow-ups"
className="text-xs font-black text-blue-700"
>
View All
</Link>

</div>

{todayFollowUps.length ===
0 &&
overdueFollowUps.length ===
0 ? (
<div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">

<div className="text-2xl">
✅
</div>

<p className="mt-2 text-sm font-bold text-emerald-800">
No pending follow-ups
</p>

</div>
) : (
<div className="mt-4 space-y-2">

{[
...overdueFollowUps,
...todayFollowUps,
]
.slice(
0,
3
)
.map(
(
followUp
) => (
<div
key={
followUp.id
}
className="rounded-2xl border bg-slate-50 p-3"
>

<p className="font-black text-slate-900">
{followUp.customer
?.name ||
"Customer"}
</p>

<p className="mt-1 text-xs text-slate-600">
{followUp.comment ||
"Customer follow-up"}
</p>

</div>
)
)}

</div>
)}

</div>

<div className="rounded-3xl border bg-white p-5 shadow-sm">

<div className="flex items-center justify-between">

<h2 className="font-black text-slate-950">
🎂 Birthdays
</h2>

<Link
href="/customers"
className="text-xs font-black text-blue-700"
>
View All
</Link>

</div>

{birthdaysToday >
0 && (
<div className="mt-3 rounded-xl bg-pink-50 px-3 py-2 text-xs font-black text-pink-800">

🎉{" "}
{
birthdaysToday
}{" "}
birthday
{birthdaysToday ===
1
? ""
: "s"}{" "}
today

</div>
)}

{upcomingBirthdays.length ===
0 ? (
<div className="mt-4 rounded-2xl border border-pink-200 bg-pink-50 p-5 text-center">

<div className="text-2xl">
🎂
</div>

<p className="mt-2 text-sm font-bold text-pink-800">
No upcoming birthdays
</p>

</div>
) : (
<div className="mt-4 space-y-2">

{upcomingBirthdays
.slice(
0,
3
)
.map(
({
customer,
birthday,
}) => (
<div
key={
customer.id
}
className="rounded-2xl border bg-slate-50 p-3"
>

<p className="font-black text-slate-900">
{
customer.name
}
</p>

<p className="text-xs font-semibold text-blue-700">
{formatBirthday(
customer.dateOfBirth
)}
</p>

<p className="mt-1 text-xs text-slate-500">
{
birthday?.label
}
</p>

</div>
)
)}

</div>
)}

</div>

</div>

{/* QUICK ACTIONS */}

<div className="mt-6">

<h2 className="mb-3 text-lg font-black text-slate-950">
Quick Actions
</h2>

<div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">

<Link
href="/enquiries/add"
className="rounded-2xl bg-indigo-700 p-3 text-center text-white"
>
<div className="text-xl">
📥
</div>

<p className="mt-1 text-xs font-bold text-white">
Enquiry
</p>
</Link>

<Link
href="/customers/add"
className="rounded-2xl bg-blue-700 p-3 text-center text-white"
>
<div className="text-xl">
➕
</div>

<p className="mt-1 text-xs font-bold text-white">
Customer
</p>
</Link>

{canUseSubAgents && (
<Link
href="/sub-agents"
className="rounded-2xl bg-violet-700 p-3 text-center text-white"
>
<div className="text-xl">
🤝
</div>

<p className="mt-1 text-xs font-bold text-white">
Sub Agents
</p>
</Link>
)}

<Link
href="/policies/add"
className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-center shadow-sm"
>
<div className="text-xl">
📄
</div>

<p className="mt-1 text-xs font-bold text-blue-800">
Policy
</p>
</Link>

<Link
href="/follow-ups"
className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center shadow-sm"
>
<div className="text-xl">
📞
</div>

<p className="mt-1 text-xs font-bold text-emerald-800">
Follow-up
</p>
</Link>

<Link
href="/emi"
className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-center shadow-sm"
>
<div className="text-xl">
💳
</div>

<p className="mt-1 text-xs font-bold text-orange-800">
EMI
</p>
</Link>

<Link
href="/renewals"
className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-center shadow-sm"
>
<div className="text-xl">
🔄
</div>

<p className="mt-1 text-xs font-bold text-cyan-800">
Renewals
</p>
</Link>

</div>

</div>

</section>

{/* ADMIN CHAT FLOATING BUTTON */}

<button
type="button"
onClick={() =>
setSupportOpen(
true
)
}
className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-blue-700 px-4 py-3 font-black text-white shadow-2xl transition hover:bg-blue-800 md:bottom-6 md:right-6"
>

<span className="text-xl">
💬
</span>

<span className="hidden sm:inline">
Admin Support
</span>

</button>

{/* ADMIN SUPPORT CHAT */}

{supportOpen && (
<div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 sm:items-center">

<div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

{/* CHAT HEADER */}

<div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-5 py-4 text-white">

<div className="flex items-center gap-3">

<div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl">
💬
</div>

<div>

<p className="font-black">
Admin Support
</p>

<p className="text-xs text-blue-200">
Help & Feature Requests
</p>

</div>

</div>

<button
type="button"
onClick={() =>
setSupportOpen(
false
)
}
className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-black"
>
×
</button>

</div>

{/* CHAT MESSAGES */}

<div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">

{supportError && (
<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
⚠️ {supportError}
</div>
)}

{supportLoading ? (
<div className="rounded-xl border bg-white p-5 text-center text-sm font-bold text-slate-500">
Loading messages...
</div>
) : supportMessages.length ===
0 ? (
<div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">

<div className="text-2xl">
💬
</div>

<p className="mt-2 text-sm font-black text-blue-900">
Start a conversation with Admin
</p>

<p className="mt-1 text-xs font-semibold text-blue-700">
Send questions, suggestions or feature requests.
</p>

</div>
) : (
supportMessages.map(
(
item
) => (
<div
key={
item.id
}
className={`flex ${
item.sender ===
"AGENT"
? "justify-end"
: "justify-start"
}`}
>

<div
className={`max-w-[82%] rounded-2xl px-4 py-3 ${
item.sender ===
"AGENT"
? "rounded-br-md bg-blue-700 text-white"
: "rounded-bl-md border bg-white text-slate-900"
}`}
>

<p className="whitespace-pre-wrap text-sm font-semibold leading-5">
{
item.message
}
</p>

<p
className={`mt-1 text-[10px] ${
item.sender ===
"AGENT"
? "text-blue-200"
: "text-slate-400"
}`}
>
{item.sender ===
"AGENT"
? "You"
: "Admin"}
</p>

</div>

</div>
)
)
)}

</div>

{/* CHAT INPUT */}

<div className="border-t bg-white p-3">

<div className="flex items-end gap-2">

<textarea
value={
supportText
}
onChange={(
event
) =>
setSupportText(
event.target.value
)
}
onKeyDown={(
event
) => {
if (
event.key ===
"Enter" &&
!event.shiftKey
) {
event.preventDefault();

void sendSupportMessage();
}
}}
placeholder="Type your message to Admin..."
rows={
2
}
className="min-h-[46px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
/>

<button
type="button"
onClick={() =>
void sendSupportMessage()
}
disabled={
supportSending ||
!supportText.trim()
}
className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-xl text-white disabled:cursor-not-allowed disabled:opacity-40"
>
{supportSending
? "…"
: "➤"}
</button>

</div>

<p className="mt-2 text-[10px] font-semibold text-slate-400">
Enter to send · Shift + Enter for new line
</p>

</div>

</div>

</div>
)}

{/* MOBILE NAV */}

<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg md:hidden">

<div className="grid h-16 grid-cols-5">

<Link
href="/dashboard"
className="flex flex-col items-center justify-center text-blue-700"
>
<span>
🏠
</span>

<span className="text-xs">
Home
</span>
</Link>

<Link
href="/enquiries"
className="flex flex-col items-center justify-center text-gray-600"
>
<span>
📥
</span>

<span className="text-xs">
Enquiry
</span>
</Link>

<Link
href="/customers/add"
className="flex flex-col items-center justify-center"
>
<div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-2xl text-white">
+
</div>

<span className="text-xs">
Add
</span>
</Link>

<Link
href="/renewals"
className="flex flex-col items-center justify-center text-gray-600"
>
<span>
🔄
</span>

<span className="text-xs">
Renewal
</span>
</Link>

<Link
href="/profile"
className="flex flex-col items-center justify-center text-gray-600"
>
<span>
👤
</span>

<span className="text-xs">
Profile
</span>
</Link>

</div>

</nav>

{/* TICKER ANIMATION */}

<style jsx>{`
.adminTicker {
display: inline-block;
min-width: max-content;
animation: adminTickerMove 38s linear infinite;
will-change: transform;
}

.adminTicker:hover {
animation-play-state: paused;
}

@keyframes adminTickerMove {
0% {
transform: translateX(0);
}

100% {
transform: translateX(-50%);
}
}
`}</style>

</main>
);
}