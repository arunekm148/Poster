"use client";

import {
ChangeEvent,
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
id: string;
customerId: string;
name: string;
phone: string;
email?: string | null;
};

type Company = {
id: string;
name: string;
categories?: string[];
logoUrl?: string | null;
};

type BusinessType =
| "HEALTH"
| "MOTOR"
| "LIFE"
| "OTHER";

type PaymentType =
| "FULL"
| "EMI";

type PolicyTenure =
| "MANUAL"
| "1M"
| "3M"
| "6M"
| "1Y"
| "2Y"
| "3Y"
| "4Y"
| "5Y"
| "6Y"
| "7Y"
| "8Y"
| "9Y"
| "10Y";

type HealthBusinessType =
| ""
| "FRESH"
| "PORTABILITY"
| "MIGRATION";

type MotorVehicleClass =
| ""
| "TWO_WHEELER"
| "PRIVATE_CAR"
| "PASSENGER_CARRYING"
| "GOODS_CARRYING"
| "MISC_SPECIAL";

type MotorCoverType =
| ""
| "COMPREHENSIVE"
| "THIRD_PARTY"
| "STANDALONE_OD"
| "STANDARD";

type LifeProductType =
| ""
| "TRADITIONAL"
| "UNIT_LINKED"
| "TERM"
| "PENSION_ANNUITY"
| "OTHER";

type LifeCategory =
| ""
| "TERM"
| "UNIT_LINKED"
| "ENDOWMENT"
| "WHOLE_LIFE"
| "MONEY_BACK"
| "PENSION"
| "CHILD_PLAN"
| "GROUP_LIFE"
| "OTHER";

type ExistingPolicy = {
id: string;

policyNumber?: string | null;

companyId?: string | null;
companyName?: string | null;
insurerName?: string | null;

productName?: string | null;
policyType?: string | null;

premium?: number | string | null;
actualPremium?: number | string | null;
sumInsured?: number | string | null;

startDate?: string | null;
expiryDate?: string | null;
endDate?: string | null;

paymentType?: string | null;

notes?: string | null;
policyPdfUrl?: string | null;

customerId?: string | null;
customerName?: string | null;

healthBusinessType?:
| HealthBusinessType
| null;

previousInsurerName?:
| string
| null;

previousPolicyNumber?:
| string
| null;

previousSumInsured?:
| number
| string
| null;

previousPolicyExpiry?:
| string
| null;

continuousCoverYears?:
| number
| string
| null;

motorVehicleClass?:
| MotorVehicleClass
| null;

motorVehicleSubClass?:
| string
| null;

motorCoverType?:
| MotorCoverType
| null;

motorOtherVehicleType?:
| string
| null;

vehicleRegistrationNumber?:
| string
| null;

vehicleMake?:
| string
| null;

vehicleModel?:
| string
| null;

vehicleYear?:
| number
| string
| null;

vehicleIdv?:
| number
| string
| null;

vehicleNcbPercent?:
| number
| string
| null;

lifeProductType?:
| LifeProductType
| null;

otherLifeProductName?:
| string
| null;

customer?:
| Customer
| null;

company?: {
id?: string;
name?: string;
} | null;
};

/* -------------------------------------------------------------------------- */
/* HELPERS */
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

return [
date.getUTCFullYear(),

String(
date.getUTCMonth() + 1
).padStart(
2,
"0"
),

String(
date.getUTCDate()
).padStart(
2,
"0"
),
].join("-");
}

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

const amount =
Number(value);

if (
Number.isNaN(
amount
)
) {
return String(
value
);
}

return `₹${amount.toLocaleString(
"en-IN"
)}`;
}

/* -------------------------------------------------------------------------- */
/* EXPIRY */
/* -------------------------------------------------------------------------- */

function calculateExpiryDate(
startDate: string,
tenure: PolicyTenure
): string {
if (
!startDate ||
tenure === "MANUAL"
) {
return "";
}

const parts =
startDate.split("-");

if (
parts.length !== 3
) {
return "";
}

const year =
Number(parts[0]);

const month =
Number(parts[1]);

const day =
Number(parts[2]);

if (
!year ||
!month ||
!day
) {
return "";
}

const expiry =
new Date(
Date.UTC(
year,
month - 1,
day
)
);

if (
tenure.endsWith("M")
) {
const months =
Number(
tenure.replace(
"M",
""
)
);

const originalDay =
expiry.getUTCDate();

expiry.setUTCDate(1);

expiry.setUTCMonth(
expiry.getUTCMonth() +
months
);

const lastDay =
new Date(
Date.UTC(
expiry.getUTCFullYear(),
expiry.getUTCMonth() +
1,
0
)
).getUTCDate();

expiry.setUTCDate(
Math.min(
originalDay,
lastDay
)
);
}

if (
tenure.endsWith("Y")
) {
const years =
Number(
tenure.replace(
"Y",
""
)
);

const originalMonth =
expiry.getUTCMonth();

const originalDay =
expiry.getUTCDate();

expiry.setUTCDate(1);

expiry.setUTCFullYear(
expiry.getUTCFullYear() +
years
);

expiry.setUTCMonth(
originalMonth
);

const lastDay =
new Date(
Date.UTC(
expiry.getUTCFullYear(),
originalMonth + 1,
0
)
).getUTCDate();

expiry.setUTCDate(
Math.min(
originalDay,
lastDay
)
);
}

/*
* Insurance expiry is one day
* before anniversary.
*/

expiry.setUTCDate(
expiry.getUTCDate() - 1
);

return [
expiry.getUTCFullYear(),

String(
expiry.getUTCMonth() + 1
).padStart(
2,
"0"
),

String(
expiry.getUTCDate()
).padStart(
2,
"0"
),
].join("-");
}

/* -------------------------------------------------------------------------- */
/* UNIQUE VALUES */
/* -------------------------------------------------------------------------- */

function uniqueValues(
values: Array<
string | null | undefined
>
) {
const map =
new Map<
string,
string
>();

for (
const value of values
) {
const text =
String(
value || ""
).trim();

if (!text) {
continue;
}

const key =
text.toLowerCase();

if (
!map.has(key)
) {
map.set(
key,
text
);
}
}

return Array.from(
map.values()
).sort(
(
a,
b
) =>
a.localeCompare(
b
)
);
}

/* -------------------------------------------------------------------------- */
/* NORMALIZE POLICY TYPE */
/* -------------------------------------------------------------------------- */

function normalizeBusinessType(
value?: string | null
): BusinessType {
const type =
String(
value || ""
).toUpperCase();

if (
type === "HEALTH"
) {
return "HEALTH";
}

if (
type === "MOTOR"
) {
return "MOTOR";
}

if (
type === "LIFE"
) {
return "LIFE";
}

return "OTHER";
}

/* -------------------------------------------------------------------------- */
/* LIFE CATEGORY */
/* -------------------------------------------------------------------------- */

function lifeCategoryFromPolicy(
policy:
| ExistingPolicy
| null
): LifeCategory {
if (!policy) {
return "";
}

const type =
String(
policy.lifeProductType ||
""
).toUpperCase();

const detail =
String(
policy.otherLifeProductName ||
""
)
.trim()
.toLowerCase();

if (
type === "TERM"
) {
return "TERM";
}

if (
type ===
"UNIT_LINKED"
) {
return "UNIT_LINKED";
}

if (
type ===
"PENSION_ANNUITY"
) {
return "PENSION";
}

if (
detail.includes(
"whole"
)
) {
return "WHOLE_LIFE";
}

if (
detail.includes(
"money"
)
) {
return "MONEY_BACK";
}

if (
detail.includes(
"child"
)
) {
return "CHILD_PLAN";
}

if (
detail.includes(
"group"
)
) {
return "GROUP_LIFE";
}

if (
type ===
"TRADITIONAL"
) {
return "ENDOWMENT";
}

if (
type === "OTHER"
) {
return "OTHER";
}

return "";
}

/* -------------------------------------------------------------------------- */
/* MOTOR SUB CLASS OPTIONS */
/* -------------------------------------------------------------------------- */

const MOTOR_SUBCLASS_OPTIONS: Record<
Exclude<
MotorVehicleClass,
""
>,
string[]
> = {
TWO_WHEELER: [
"Motorcycle",
"Scooter",
"Electric Two-Wheeler",
"Moped",
],

PRIVATE_CAR: [
"Hatchback",
"Sedan",
"SUV",
"MUV",
"Electric Car",
"Hybrid Car",
],

PASSENGER_CARRYING: [
"Taxi",
"Auto Rickshaw",
"Bus",
"School Bus",
"Staff Bus",
"Passenger Van",
],

GOODS_CARRYING: [
"Pickup",
"Tempo",
"Truck",
"Mini Truck",
"Goods Auto",
"Delivery Van",
],

MISC_SPECIAL: [
"Tractor",
"Excavator",
"Crane",
"JCB / Earth Mover",
"Construction Vehicle",
"Special Purpose Vehicle",
],
};

/* -------------------------------------------------------------------------- */
/* PAGE */
/* -------------------------------------------------------------------------- */

export default function AddPolicyPage() {
return (
<Suspense
fallback={
<main className="flex min-h-screen items-center justify-center bg-slate-100">
<div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
<div className="text-4xl">
📄
</div>

<p className="mt-3 font-black text-slate-700">
Loading Policy Form...
</p>
</div>
</main>
}
>
<AddPolicyContent />
</Suspense>
);
}

function AddPolicyContent() {
const router =
useRouter();

const searchParams =
useSearchParams();

const urlCustomerId =
searchParams.get(
"customerId"
) || "";

const renewFrom =
searchParams.get(
"renewFrom"
) || "";

const isRenewal =
Boolean(
renewFrom
);

/* ------------------------------------------------------------------------ */
/* USER */
/* ------------------------------------------------------------------------ */

const [
userId,
setUserId,
] = useState("");

/* ------------------------------------------------------------------------ */
/* CUSTOMER */
/* ------------------------------------------------------------------------ */

const [
customers,
setCustomers,
] =
useState<
Customer[]
>([]);

const [
customerSearch,
setCustomerSearch,
] = useState("");

const [
customerId,
setCustomerId,
] = useState("");

const [
selectedCustomer,
setSelectedCustomer,
] =
useState<
Customer | null
>(null);

const [
loadingCustomers,
setLoadingCustomers,
] = useState(false);

const [
customerSearchStarted,
setCustomerSearchStarted,
] = useState(false);

const [
loadingSelectedCustomer,
setLoadingSelectedCustomer,
] = useState(false);

/* ------------------------------------------------------------------------ */
/* POLICY HISTORY */
/* ------------------------------------------------------------------------ */

const [
existingPolicies,
setExistingPolicies,
] =
useState<
ExistingPolicy[]
>([]);

const [
loadingSuggestions,
setLoadingSuggestions,
] = useState(false);

/* ------------------------------------------------------------------------ */
/* COMPANY MASTER */
/* ------------------------------------------------------------------------ */

const [
companies,
setCompanies,
] =
useState<
Company[]
>([]);

const [
loadingCompanies,
setLoadingCompanies,
] = useState(false);

const [
companyId,
setCompanyId,
] = useState("");

/* ------------------------------------------------------------------------ */
/* RENEWAL */
/* ------------------------------------------------------------------------ */

const [
previousPolicy,
setPreviousPolicy,
] =
useState<
ExistingPolicy | null
>(null);

const [
loadingPreviousPolicy,
setLoadingPreviousPolicy,
] = useState(false);

const [
renewalLoaded,
setRenewalLoaded,
] = useState(false);

/* ------------------------------------------------------------------------ */
/* MAIN POLICY */
/* ------------------------------------------------------------------------ */

const [
policyNumber,
setPolicyNumber,
] = useState("");

const [
companyName,
setCompanyName,
] = useState("");

const [
productName,
setProductName,
] = useState("");

const [
policyType,
setPolicyType,
] =
useState<BusinessType>(
"HEALTH"
);

const [
sumInsured,
setSumInsured,
] = useState("");

const [
premium,
setPremium,
] = useState("");

/* ------------------------------------------------------------------------ */
/* HEALTH */
/* ------------------------------------------------------------------------ */

const [
healthBusinessType,
setHealthBusinessType,
] =
useState<HealthBusinessType>(
""
);

const [
previousInsurerName,
setPreviousInsurerName,
] = useState("");

const [
previousPolicyNumber,
setPreviousPolicyNumber,
] = useState("");

const [
previousSumInsured,
setPreviousSumInsured,
] = useState("");

const [
previousPolicyExpiry,
setPreviousPolicyExpiry,
] = useState("");

const [
continuousCoverYears,
setContinuousCoverYears,
] = useState("");

/* ------------------------------------------------------------------------ */
/* MOTOR */
/* ------------------------------------------------------------------------ */

const [
motorVehicleClass,
setMotorVehicleClass,
] =
useState<MotorVehicleClass>(
""
);

const [
motorVehicleSubClass,
setMotorVehicleSubClass,
] = useState("");

const [
motorCoverType,
setMotorCoverType,
] =
useState<MotorCoverType>(
""
);

const [
motorOtherVehicleType,
setMotorOtherVehicleType,
] = useState("");

const [
vehicleRegistrationNumber,
setVehicleRegistrationNumber,
] = useState("");

const [
vehicleMake,
setVehicleMake,
] = useState("");

const [
vehicleModel,
setVehicleModel,
] = useState("");

const [
vehicleYear,
setVehicleYear,
] = useState("");

const [
vehicleIdv,
setVehicleIdv,
] = useState("");

const [
vehicleNcbPercent,
setVehicleNcbPercent,
] = useState("");

/* ------------------------------------------------------------------------ */
/* LIFE */
/* ------------------------------------------------------------------------ */

const [
lifeCategory,
setLifeCategory,
] =
useState<LifeCategory>(
""
);

const [
customLifeProductName,
setCustomLifeProductName,
] = useState("");

/* ------------------------------------------------------------------------ */
/* PERIOD */
/* ------------------------------------------------------------------------ */

const [
startDate,
setStartDate,
] = useState("");

const [
policyTenure,
setPolicyTenure,
] =
useState<PolicyTenure>(
"1Y"
);

const [
expiryDate,
setExpiryDate,
] = useState("");

/* ------------------------------------------------------------------------ */
/* PAYMENT */
/* ------------------------------------------------------------------------ */

const [
paymentType,
setPaymentType,
] =
useState<PaymentType>(
"FULL"
);

const [
financier,
setFinancier,
] = useState("");

const [
financedAmount,
setFinancedAmount,
] = useState("");

const [
emiAmount,
setEmiAmount,
] = useState("");

const [
emiTenure,
setEmiTenure,
] = useState("");

const [
firstEmiDate,
setFirstEmiDate,
] = useState("");

/* ------------------------------------------------------------------------ */
/* NOTES */
/* ------------------------------------------------------------------------ */

const [
notes,
setNotes,
] = useState("");

/* ------------------------------------------------------------------------ */
/* PDF */
/* ------------------------------------------------------------------------ */

const [
policyPdf,
setPolicyPdf,
] =
useState<
File | null
>(null);

const [
policyPdfUrl,
setPolicyPdfUrl,
] = useState("");

const [
uploadingPdf,
setUploadingPdf,
] = useState(false);

/* ------------------------------------------------------------------------ */
/* STATUS */
/* ------------------------------------------------------------------------ */

const [
saving,
setSaving,
] = useState(false);

const [
error,
setError,
] = useState("");

const [
success,
setSuccess,
] = useState("");

const customerLocked =
Boolean(
(
urlCustomerId ||
isRenewal
) &&
selectedCustomer
);

/* ------------------------------------------------------------------------ */
/* DERIVED LIFE BACKEND VALUES */
/* ------------------------------------------------------------------------ */

const lifeBackend =
useMemo(
() => {
let lifeProductType:
LifeProductType =
"";

let otherLifeProductName =
"";

switch (
lifeCategory
) {
case "TERM":
lifeProductType =
"TERM";
break;

case "UNIT_LINKED":
lifeProductType =
"UNIT_LINKED";
break;

case "ENDOWMENT":
lifeProductType =
"TRADITIONAL";

otherLifeProductName =
"Endowment / Traditional";
break;

case "WHOLE_LIFE":
lifeProductType =
"TRADITIONAL";

otherLifeProductName =
"Whole Life";
break;

case "MONEY_BACK":
lifeProductType =
"TRADITIONAL";

otherLifeProductName =
"Money Back";
break;

case "PENSION":
lifeProductType =
"PENSION_ANNUITY";

otherLifeProductName =
"Pension / Retirement";
break;

case "CHILD_PLAN":
lifeProductType =
"OTHER";

otherLifeProductName =
"Child Plan";
break;

case "GROUP_LIFE":
lifeProductType =
"OTHER";

otherLifeProductName =
"Group Life";
break;

case "OTHER":
lifeProductType =
"OTHER";

otherLifeProductName =
customLifeProductName.trim();
break;

default:
break;
}

return {
lifeProductType,
otherLifeProductName,
};
},
[
lifeCategory,
customLifeProductName,
]
);

/* ------------------------------------------------------------------------ */
/* LOAD USER */
/* ------------------------------------------------------------------------ */

useEffect(() => {
try {
let storedUserId =
localStorage.getItem(
"userId"
);

if (!storedUserId) {
const agentUser =
localStorage.getItem(
"agentUser"
);

if (agentUser) {
const parsed =
JSON.parse(
agentUser
);

if (
parsed?.id
) {
storedUserId =
String(
parsed.id
);

localStorage.setItem(
"userId",
storedUserId
);
}
}
}

if (
!storedUserId
) {
setError(
"Logged-in user information not found. Please login again."
);

return;
}

setUserId(
storedUserId
);
} catch (err) {
console.error(
"USER LOAD ERROR:",
err
);

setError(
"Unable to read logged-in user information."
);
}
}, []);

/* ------------------------------------------------------------------------ */
/* LOAD COMPANY MASTER */
/* ------------------------------------------------------------------------ */

useEffect(() => {
let cancelled =
false;

async function loadCompanies() {
try {
setLoadingCompanies(
true
);

/*
* Company master has categories:
* HEALTH / MOTOR / LIFE.
*
* OTHER loads all active companies.
*/

const url =
policyType ===
"OTHER"
? "/api/companies"
: `/api/companies?category=${encodeURIComponent(
policyType
)}`;

const response =
await fetch(
url,
{
cache:
"no-store",
}
);

const data =
await response.json();

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
"Unable to load insurance companies."
);
}

const list:
Company[] =
Array.isArray(
data.companies
)
? data.companies
: [];

if (
!cancelled
) {
setCompanies(
list
);

/*
* When renewal already supplied
* company name, connect it to the
* matching Company master record.
*/

if (
companyName.trim()
) {
const matching =
list.find(
(
company
) =>
company.name
.trim()
.toLowerCase() ===
companyName
.trim()
.toLowerCase()
);

if (
matching
) {
setCompanyId(
matching.id
);
}
}
}
} catch (err) {
console.error(
"LOAD COMPANIES ERROR:",
err
);

if (
!cancelled
) {
setCompanies(
[]
);
}
} finally {
if (
!cancelled
) {
setLoadingCompanies(
false
);
}
}
}

loadCompanies();

return () => {
cancelled =
true;
};
}, [
policyType,
]);

/* ------------------------------------------------------------------------ */
/* LOAD POLICY HISTORY */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (!userId) {
return;
}

let cancelled =
false;

async function loadPolicySuggestions() {
try {
setLoadingSuggestions(
true
);

const response =
await fetch(
`/api/policies?userId=${encodeURIComponent(
userId
)}`,
{
cache:
"no-store",
}
);

const data =
await response.json();

if (
!response.ok
) {
return;
}

const policies =
Array.isArray(
data
)
? data
: Array.isArray(
data?.policies
)
? data.policies
: Array.isArray(
data?.data
)
? data.data
: [];

if (
!cancelled
) {
setExistingPolicies(
policies
);
}
} catch (err) {
console.error(
"LOAD POLICY HISTORY ERROR:",
err
);
} finally {
if (
!cancelled
) {
setLoadingSuggestions(
false
);
}
}
}

loadPolicySuggestions();

return () => {
cancelled =
true;
};
}, [
userId,
]);

/* ------------------------------------------------------------------------ */
/* PRODUCT OPTIONS */
/* ------------------------------------------------------------------------ */

const productOptions =
useMemo(
() => {
const normalizedCompany =
companyName
.trim()
.toLowerCase();

const matchingPolicies =
normalizedCompany
? existingPolicies.filter(
(
policy
) => {
const company =
policy.company
?.name ||
policy.companyName ||
policy.insurerName ||
"";

return (
company
.trim()
.toLowerCase() ===
normalizedCompany
);
}
)
: existingPolicies;

return uniqueValues(
matchingPolicies.map(
(
policy
) =>
policy.productName
)
);
},
[
existingPolicies,
companyName,
]
);

/* ------------------------------------------------------------------------ */
/* MIGRATION = SAME COMPANY */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
policyType ===
"HEALTH" &&
healthBusinessType ===
"MIGRATION" &&
companyName.trim()
) {
setPreviousInsurerName(
companyName.trim()
);
}
}, [
policyType,
healthBusinessType,
companyName,
]);

/* ------------------------------------------------------------------------ */
/* LOAD RENEWAL POLICY */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
!userId ||
!renewFrom ||
renewalLoaded
) {
return;
}

let cancelled =
false;

async function loadRenewalPolicy() {
try {
setLoadingPreviousPolicy(
true
);

setError("");

let policy:
| ExistingPolicy
| undefined;

try {
const response =
await fetch(
`/api/policies?userId=${encodeURIComponent(
userId
)}&policyId=${encodeURIComponent(
renewFrom
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
data?.success &&
data?.policy
) {
policy =
data.policy;
}
} catch (
singlePolicyError
) {
console.error(
"SINGLE RENEWAL POLICY LOAD ERROR:",
singlePolicyError
);
}

if (!policy) {
policy =
existingPolicies.find(
(
item
) =>
String(
item.id
) ===
String(
renewFrom
)
);
}

if (!policy) {
const response =
await fetch(
`/api/policies?userId=${encodeURIComponent(
userId
)}`,
{
cache:
"no-store",
}
);

const data =
await response.json();

if (
!response.ok
) {
throw new Error(
data?.message ||
"Unable to load previous policy."
);
}

const list:
ExistingPolicy[] =
Array.isArray(
data
)
? data
: Array.isArray(
data?.policies
)
? data.policies
: Array.isArray(
data?.data
)
? data.data
: [];

policy =
list.find(
(
item
) =>
String(
item.id
) ===
String(
renewFrom
)
);
}

if (!policy) {
throw new Error(
"Previous policy could not be found."
);
}

if (
cancelled
) {
return;
}

setPreviousPolicy(
policy
);

/* ------------------------------------------------------------------ */
/* BASIC DETAILS */
/* ------------------------------------------------------------------ */

const oldCompany =
policy.company
?.name ||
policy.companyName ||
policy.insurerName ||
"";

const oldCompanyId =
policy.company
?.id ||
policy.companyId ||
"";

const detectedPolicyType =
normalizeBusinessType(
policy.policyType
);

setCompanyName(
oldCompany
);

setCompanyId(
oldCompanyId
);

setProductName(
policy.productName ||
""
);

setPolicyType(
detectedPolicyType
);

/*
* Motor uses IDV,
* not Sum Insured.
*/

if (
detectedPolicyType !==
"MOTOR"
) {
setSumInsured(
policy.sumInsured !==
null &&
policy.sumInsured !==
undefined
? String(
policy.sumInsured
)
: ""
);
} else {
setSumInsured(
""
);
}

const oldPremium =
policy.actualPremium ??
policy.premium;

setPremium(
oldPremium !==
null &&
oldPremium !==
undefined
? String(
oldPremium
)
: ""
);

setPolicyNumber(
policy.policyNumber ||
""
);

/* ------------------------------------------------------------------ */
/* HEALTH */
/* ------------------------------------------------------------------ */

if (
detectedPolicyType ===
"HEALTH"
) {
setHealthBusinessType(
policy.healthBusinessType ||
"FRESH"
);

setPreviousInsurerName(
policy.previousInsurerName ||
""
);

setPreviousPolicyNumber(
policy.previousPolicyNumber ||
""
);

setPreviousSumInsured(
policy.previousSumInsured !==
null &&
policy.previousSumInsured !==
undefined
? String(
policy.previousSumInsured
)
: ""
);

setPreviousPolicyExpiry(
dateForInput(
policy.previousPolicyExpiry
)
);

setContinuousCoverYears(
policy.continuousCoverYears !==
null &&
policy.continuousCoverYears !==
undefined
? String(
policy.continuousCoverYears
)
: ""
);
}

/* ------------------------------------------------------------------ */
/* MOTOR */
/* ------------------------------------------------------------------ */

if (
detectedPolicyType ===
"MOTOR"
) {
setMotorVehicleClass(
policy.motorVehicleClass ||
""
);

setMotorVehicleSubClass(
policy.motorVehicleSubClass ||
""
);

setMotorCoverType(
policy.motorCoverType ||
""
);

setMotorOtherVehicleType(
policy.motorOtherVehicleType ||
""
);

setVehicleRegistrationNumber(
policy.vehicleRegistrationNumber ||
""
);

setVehicleMake(
policy.vehicleMake ||
""
);

setVehicleModel(
policy.vehicleModel ||
""
);

setVehicleYear(
policy.vehicleYear !==
null &&
policy.vehicleYear !==
undefined
? String(
policy.vehicleYear
)
: ""
);

setVehicleIdv(
policy.vehicleIdv !==
null &&
policy.vehicleIdv !==
undefined
? String(
policy.vehicleIdv
)
: ""
);

setVehicleNcbPercent(
policy.vehicleNcbPercent !==
null &&
policy.vehicleNcbPercent !==
undefined
? String(
policy.vehicleNcbPercent
)
: ""
);
}

/* ------------------------------------------------------------------ */
/* LIFE */
/* ------------------------------------------------------------------ */

if (
detectedPolicyType ===
"LIFE"
) {
const category =
lifeCategoryFromPolicy(
policy
);

setLifeCategory(
category
);

if (
category ===
"OTHER"
) {
setCustomLifeProductName(
policy.otherLifeProductName ||
""
);
}
}

/* ------------------------------------------------------------------ */
/* NEW START DATE */
/* ------------------------------------------------------------------ */

const oldExpiry =
policy.expiryDate ||
policy.endDate ||
"";

if (oldExpiry) {
const oldExpiryDate =
new Date(
oldExpiry
);

if (
!Number.isNaN(
oldExpiryDate.getTime()
)
) {
oldExpiryDate.setUTCDate(
oldExpiryDate.getUTCDate() +
1
);

const newStart =
[
oldExpiryDate.getUTCFullYear(),

String(
oldExpiryDate.getUTCMonth() +
1
).padStart(
2,
"0"
),

String(
oldExpiryDate.getUTCDate()
).padStart(
2,
"0"
),
].join("-");

setStartDate(
newStart
);

setPolicyTenure(
"1Y"
);

setExpiryDate(
calculateExpiryDate(
newStart,
"1Y"
)
);
}
}

/* ------------------------------------------------------------------ */
/* SAME CUSTOMER */
/* ------------------------------------------------------------------ */

if (
policy.customer?.id
) {
setCustomerId(
policy.customer.id
);

setSelectedCustomer(
policy.customer
);

setCustomerSearch(
policy.customer.name
);
} else if (
policy.customerId
) {
try {
const customerResponse =
await fetch(
`/api/customers/${encodeURIComponent(
policy.customerId
)}`,
{
cache:
"no-store",
}
);

const customerData =
await customerResponse.json();

if (
customerResponse.ok &&
customerData?.success &&
customerData?.customer
) {
const customer =
customerData.customer as Customer;

if (
!cancelled
) {
setCustomerId(
customer.id
);

setSelectedCustomer(
customer
);

setCustomerSearch(
customer.name
);
}
}
} catch (
customerError
) {
console.error(
"RENEWAL CUSTOMER LOAD ERROR:",
customerError
);
}
}

setNotes(
`Renewal of previous policy ${
policy.policyNumber ||
renewFrom
}`
);

setRenewalLoaded(
true
);
} catch (err) {
console.error(
"LOAD RENEWAL ERROR:",
err
);

if (
!cancelled
) {
setError(
err instanceof Error
? err.message
: "Unable to load previous policy."
);
}
} finally {
if (
!cancelled
) {
setLoadingPreviousPolicy(
false
);
}
}
}

loadRenewalPolicy();

return () => {
cancelled =
true;
};
}, [
userId,
renewFrom,
renewalLoaded,
existingPolicies,
]);

/* ------------------------------------------------------------------------ */
/* LOAD CUSTOMER FROM URL */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
!userId ||
!urlCustomerId ||
isRenewal
) {
return;
}

if (
selectedCustomer?.id ===
urlCustomerId
) {
return;
}

let cancelled =
false;

async function loadSelectedCustomer() {
try {
setLoadingSelectedCustomer(
true
);

setError("");

const response =
await fetch(
`/api/customers/${encodeURIComponent(
urlCustomerId
)}`,
{
cache:
"no-store",
}
);

const data =
await response.json();

if (
!response.ok ||
!data.success ||
!data.customer
) {
throw new Error(
data.message ||
"Unable to load selected customer."
);
}

if (
cancelled
) {
return;
}

const customer =
data.customer as Customer;

setCustomerId(
customer.id
);

setSelectedCustomer(
customer
);

setCustomerSearch(
customer.name
);

setCustomers(
[]
);

setCustomerSearchStarted(
false
);
} catch (err) {
console.error(
"CUSTOMER LOAD ERROR:",
err
);

if (
!cancelled
) {
setError(
err instanceof Error
? err.message
: "Unable to load selected customer."
);
}
} finally {
if (
!cancelled
) {
setLoadingSelectedCustomer(
false
);
}
}
}

loadSelectedCustomer();

return () => {
cancelled =
true;
};
}, [
userId,
urlCustomerId,
isRenewal,
selectedCustomer?.id,
]);

/* ------------------------------------------------------------------------ */
/* CUSTOMER SEARCH */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
!userId ||
customerLocked
) {
return;
}

const searchValue =
customerSearch.trim();

if (
selectedCustomer &&
searchValue ===
selectedCustomer.name
) {
return;
}

if (
searchValue.length <
2
) {
setCustomers(
[]
);

setLoadingCustomers(
false
);

setCustomerSearchStarted(
false
);

return;
}

const controller =
new AbortController();

const timer =
window.setTimeout(
async () => {
try {
setLoadingCustomers(
true
);

setCustomerSearchStarted(
true
);

const params =
new URLSearchParams({
userId,
search:
searchValue,
limit:
"20",
});

const response =
await fetch(
`/api/customers?${params.toString()}`,
{
cache:
"no-store",

signal:
controller.signal,
}
);

const data =
await response.json();

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
"Unable to search customers."
);
}

const results =
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
results
);
} catch (err) {
if (
err instanceof
DOMException &&
err.name ===
"AbortError"
) {
return;
}

console.error(
"CUSTOMER SEARCH ERROR:",
err
);

setCustomers(
[]
);
} finally {
if (
!controller.signal
.aborted
) {
setLoadingCustomers(
false
);
}
}
},
350
);

return () => {
window.clearTimeout(
timer
);

controller.abort();
};
}, [
userId,
customerSearch,
selectedCustomer,
customerLocked,
]);

/* ------------------------------------------------------------------------ */
/* AUTO EXPIRY */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
policyTenure ===
"MANUAL"
) {
return;
}

setExpiryDate(
calculateExpiryDate(
startDate,
policyTenure
)
);
}, [
startDate,
policyTenure,
]);

/* ------------------------------------------------------------------------ */
/* CUSTOMER FUNCTIONS */
/* ------------------------------------------------------------------------ */

function selectCustomer(
customer: Customer
) {
setCustomerId(
customer.id
);

setSelectedCustomer(
customer
);

setCustomerSearch(
customer.name
);

setCustomers(
[]
);

setCustomerSearchStarted(
false
);

setError("");
}

function handleCustomerSearchChange(
value: string
) {
setCustomerSearch(
value
);

if (
selectedCustomer &&
value !==
selectedCustomer.name
) {
setCustomerId("");

setSelectedCustomer(
null
);
}
}

function clearCustomer() {
if (
urlCustomerId ||
isRenewal
) {
return;
}

setCustomerId("");

setSelectedCustomer(
null
);

setCustomerSearch("");

setCustomers(
[]
);

setCustomerSearchStarted(
false
);
}

/* ------------------------------------------------------------------------ */
/* COMPANY */
/* ------------------------------------------------------------------------ */

function handleCompanyChange(
selectedId: string
) {
setCompanyId(
selectedId
);

const company =
companies.find(
(
item
) =>
item.id ===
selectedId
);

setCompanyName(
company?.name ||
""
);

setProductName(
""
);

if (
policyType ===
"HEALTH" &&
healthBusinessType ===
"MIGRATION"
) {
setPreviousInsurerName(
company?.name ||
""
);
}
}

/* ------------------------------------------------------------------------ */
/* CHANGE INSURANCE TYPE */
/* ------------------------------------------------------------------------ */

function handlePolicyTypeChange(
value: BusinessType
) {
setPolicyType(
value
);

setError("");

/*
* New category = new company list.
*/

setCompanyId(
""
);

setCompanyName(
""
);

setProductName(
""
);

/*
* MOTOR uses IDV,
* not generic Sum Insured.
*/

if (
value === "MOTOR"
) {
setSumInsured(
""
);
}

if (
value !==
"HEALTH"
) {
setHealthBusinessType(
""
);

setPreviousInsurerName(
""
);

setPreviousPolicyNumber(
""
);

setPreviousSumInsured(
""
);

setPreviousPolicyExpiry(
""
);

setContinuousCoverYears(
""
);
}

if (
value !==
"MOTOR"
) {
setMotorVehicleClass(
""
);

setMotorVehicleSubClass(
""
);

setMotorCoverType(
""
);

setMotorOtherVehicleType(
""
);

setVehicleRegistrationNumber(
""
);

setVehicleMake(
""
);

setVehicleModel(
""
);

setVehicleYear(
""
);

setVehicleIdv(
""
);

setVehicleNcbPercent(
""
);
}

if (
value !==
"LIFE"
) {
setLifeCategory(
""
);

setCustomLifeProductName(
""
);
}
}

/* ------------------------------------------------------------------------ */
/* HEALTH TYPE */
/* ------------------------------------------------------------------------ */

function handleHealthTypeChange(
value:
HealthBusinessType
) {
setHealthBusinessType(
value
);

setError("");

if (
value === "FRESH"
) {
setPreviousInsurerName(
""
);

setPreviousPolicyNumber(
""
);

setPreviousSumInsured(
""
);

setPreviousPolicyExpiry(
""
);

setContinuousCoverYears(
""
);
}

if (
value ===
"MIGRATION" &&
companyName.trim()
) {
setPreviousInsurerName(
companyName.trim()
);
}
}

/* ------------------------------------------------------------------------ */
/* MOTOR CLASS */
/* ------------------------------------------------------------------------ */

function handleMotorClassChange(
value:
MotorVehicleClass
) {
setMotorVehicleClass(
value
);

setMotorVehicleSubClass(
""
);

setMotorOtherVehicleType(
""
);

setError("");
}

/* ------------------------------------------------------------------------ */
/* LIFE CATEGORY */
/* ------------------------------------------------------------------------ */

function handleLifeCategoryChange(
value:
LifeCategory
) {
setLifeCategory(
value
);

setError("");

if (
value !== "OTHER"
) {
setCustomLifeProductName(
""
);
}
}

/* ------------------------------------------------------------------------ */
/* TENURE */
/* ------------------------------------------------------------------------ */

function handleTenureChange(
value:
PolicyTenure
) {
setPolicyTenure(
value
);

if (
value ===
"MANUAL"
) {
setExpiryDate(
""
);
}
}

/* ------------------------------------------------------------------------ */
/* PDF */
/* ------------------------------------------------------------------------ */

function handlePdfChange(
event:
ChangeEvent<HTMLInputElement>
) {
setError("");

setPolicyPdfUrl(
""
);

const file =
event.target
.files?.[0];

if (!file) {
setPolicyPdf(
null
);

return;
}

const isPdf =
file.type ===
"application/pdf" ||
file.name
.toLowerCase()
.endsWith(
".pdf"
);

if (!isPdf) {
setPolicyPdf(
null
);

setError(
"Only PDF files are allowed."
);

event.target.value =
"";

return;
}

if (
file.size >
10 *
1024 *
1024
) {
setPolicyPdf(
null
);

setError(
"Policy PDF must be below 10 MB."
);

event.target.value =
"";

return;
}

setPolicyPdf(
file
);
}

async function uploadPolicyPdf(): Promise<string> {
if (!policyPdf) {
return "";
}

try {
setUploadingPdf(
true
);

const formData =
new FormData();

formData.append(
"file",
policyPdf
);

formData.append(
"type",
"policy"
);

const response =
await fetch(
"/api/upload",
{
method:
"POST",

body:
formData,
}
);

const data =
await response.json();

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
"Unable to upload policy PDF."
);
}

const uploadedUrl =
data.fileUrl ||
data.url ||
"";

if (
!uploadedUrl
) {
throw new Error(
"Upload completed but file URL was not returned."
);
}

setPolicyPdfUrl(
uploadedUrl
);

return uploadedUrl;
} finally {
setUploadingPdf(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* VALIDATION */
/* ------------------------------------------------------------------------ */

function validateForm(): string {
if (!userId) {
return "Please login again.";
}

if (!customerId) {
return "Please select a customer.";
}

/* ---------------------------------------------------------------------- */
/* HEALTH */
/* ---------------------------------------------------------------------- */

if (
policyType ===
"HEALTH"
) {
if (
!healthBusinessType
) {
return "Please select Fresh, Portability or Migration.";
}

if (
(
healthBusinessType ===
"PORTABILITY" ||
healthBusinessType ===
"MIGRATION"
) &&
previousSumInsured
) {
const amount =
Number(
previousSumInsured
);

if (
!Number.isFinite(
amount
) ||
amount < 0
) {
return "Please enter a valid previous sum insured.";
}
}

if (
(
healthBusinessType ===
"PORTABILITY" ||
healthBusinessType ===
"MIGRATION"
) &&
continuousCoverYears
) {
const years =
Number(
continuousCoverYears
);

if (
!Number.isInteger(
years
) ||
years < 0
) {
return "Please enter valid continuous cover years.";
}
}
}

/* ---------------------------------------------------------------------- */
/* MOTOR */
/* ---------------------------------------------------------------------- */

if (
policyType ===
"MOTOR"
) {
if (
!motorVehicleClass
) {
return "Please select motor vehicle classification.";
}

if (
!motorCoverType
) {
return "Please select motor cover type.";
}

if (
vehicleYear
) {
const year =
Number(
vehicleYear
);

const maxYear =
new Date()
.getFullYear() +
1;

if (
!Number.isInteger(
year
) ||
year < 1900 ||
year > maxYear
) {
return "Please enter a valid vehicle year.";
}
}

if (
vehicleIdv
) {
const idv =
Number(
vehicleIdv
);

if (
!Number.isFinite(
idv
) ||
idv < 0
) {
return "Please enter a valid vehicle IDV.";
}
}

if (
vehicleNcbPercent
) {
const ncb =
Number(
vehicleNcbPercent
);

if (
!Number.isFinite(
ncb
) ||
ncb < 0 ||
ncb > 100
) {
return "NCB percentage must be between 0 and 100.";
}
}
}

/* ---------------------------------------------------------------------- */
/* LIFE */
/* ---------------------------------------------------------------------- */

if (
policyType ===
"LIFE"
) {
if (
!lifeCategory
) {
return "Please select a life insurance product category.";
}

if (
lifeCategory ===
"OTHER" &&
!customLifeProductName.trim()
) {
return "Please enter the other life product name.";
}
}

/* ---------------------------------------------------------------------- */
/* COMMON */
/* ---------------------------------------------------------------------- */

if (
!policyNumber.trim()
) {
return isRenewal
? "Renewal policy number is required."
: "Policy number is required.";
}

if (
!companyName.trim()
) {
return "Please select an insurance company.";
}

if (
!startDate
) {
return "Policy start date is required.";
}

if (
!expiryDate
) {
return "Policy expiry date is required.";
}

const start =
new Date(
`${startDate}T00:00:00.000Z`
);

const expiry =
new Date(
`${expiryDate}T00:00:00.000Z`
);

if (
Number.isNaN(
start.getTime()
)
) {
return "Invalid policy start date.";
}

if (
Number.isNaN(
expiry.getTime()
)
) {
return "Invalid policy expiry date.";
}

if (
expiry < start
) {
return "Policy expiry date cannot be before policy start date.";
}

/*
* MOTOR does not use generic
* Sum Insured.
*/

if (
policyType !==
"MOTOR" &&
sumInsured
) {
const value =
Number(
sumInsured
);

if (
!Number.isFinite(
value
) ||
value < 0
) {
return "Please enter a valid sum insured.";
}
}

if (
premium
) {
const value =
Number(
premium
);

if (
!Number.isFinite(
value
) ||
value < 0
) {
return "Please enter a valid premium.";
}
}

if (
paymentType ===
"EMI"
) {
if (
!financier.trim()
) {
return "Financier is required for EMI policy.";
}

const financed =
Number(
financedAmount
);

if (
!financedAmount ||
!Number.isFinite(
financed
) ||
financed <= 0
) {
return "Enter a valid financed amount.";
}

const monthlyEmi =
Number(
emiAmount
);

if (
!emiAmount ||
!Number.isFinite(
monthlyEmi
) ||
monthlyEmi <= 0
) {
return "Enter a valid EMI amount.";
}

const tenure =
Number(
emiTenure
);

if (
!Number.isInteger(
tenure
) ||
tenure <= 0
) {
return "Enter a valid EMI tenure.";
}

if (
tenure > 120
) {
return "EMI tenure cannot exceed 120 months.";
}

if (
!firstEmiDate
) {
return "Select first EMI date.";
}
}

return "";
}

/* ------------------------------------------------------------------------ */
/* SUBMIT */
/* ------------------------------------------------------------------------ */

async function handleSubmit(
event:
FormEvent<HTMLFormElement>
) {
event.preventDefault();

if (
saving ||
uploadingPdf
) {
return;
}

setError("");

setSuccess("");

const validationError =
validateForm();

if (
validationError
) {
setError(
validationError
);

window.scrollTo({
top: 0,
behavior:
"smooth",
});

return;
}

try {
setSaving(
true
);

let uploadedPdfUrl =
policyPdfUrl;

if (
policyPdf &&
!uploadedPdfUrl
) {
uploadedPdfUrl =
await uploadPolicyPdf();
}

const payload = {
userId,
customerId,

/*
* Company master values.
*/

companyId:
companyId ||
null,

companyName:
companyName.trim(),

policyNumber:
policyNumber.trim(),

productName:
productName.trim() ||
null,

policyType,

/* ------------------------------------------------------------------ */
/* HEALTH */
/* ------------------------------------------------------------------ */

healthBusinessType:
policyType ===
"HEALTH"
? healthBusinessType
: null,

previousInsurerName:
policyType ===
"HEALTH" &&
healthBusinessType !==
"FRESH"
? previousInsurerName.trim() ||
null
: null,

previousPolicyNumber:
policyType ===
"HEALTH" &&
healthBusinessType !==
"FRESH"
? previousPolicyNumber.trim() ||
null
: null,

previousSumInsured:
policyType ===
"HEALTH" &&
healthBusinessType !==
"FRESH" &&
previousSumInsured
? Number(
previousSumInsured
)
: null,

previousPolicyExpiry:
policyType ===
"HEALTH" &&
healthBusinessType !==
"FRESH" &&
previousPolicyExpiry
? previousPolicyExpiry
: null,

continuousCoverYears:
policyType ===
"HEALTH" &&
healthBusinessType !==
"FRESH" &&
continuousCoverYears
? Number(
continuousCoverYears
)
: null,

/* ------------------------------------------------------------------ */
/* MOTOR */
/* ------------------------------------------------------------------ */

motorVehicleClass:
policyType ===
"MOTOR"
? motorVehicleClass
: null,

motorVehicleSubClass:
policyType ===
"MOTOR"
? motorVehicleSubClass.trim() ||
null
: null,

motorCoverType:
policyType ===
"MOTOR"
? motorCoverType
: null,

motorOtherVehicleType:
policyType ===
"MOTOR"
? motorOtherVehicleType.trim() ||
null
: null,

vehicleRegistrationNumber:
policyType ===
"MOTOR"
? vehicleRegistrationNumber
.trim()
.toUpperCase() ||
null
: null,

vehicleMake:
policyType ===
"MOTOR"
? vehicleMake.trim() ||
null
: null,

vehicleModel:
policyType ===
"MOTOR"
? vehicleModel.trim() ||
null
: null,

vehicleYear:
policyType ===
"MOTOR" &&
vehicleYear
? Number(
vehicleYear
)
: null,

vehicleIdv:
policyType ===
"MOTOR" &&
vehicleIdv
? Number(
vehicleIdv
)
: null,

vehicleNcbPercent:
policyType ===
"MOTOR" &&
vehicleNcbPercent
? Number(
vehicleNcbPercent
)
: null,

/* ------------------------------------------------------------------ */
/* LIFE */
/* ------------------------------------------------------------------ */

lifeProductType:
policyType ===
"LIFE"
? lifeBackend.lifeProductType
: null,

otherLifeProductName:
policyType ===
"LIFE"
? lifeBackend.otherLifeProductName ||
null
: null,

/* ------------------------------------------------------------------ */
/* COMMON */
/* ------------------------------------------------------------------ */

/*
* IMPORTANT:
*
* MOTOR uses Vehicle IDV.
* Never send generic Sum Insured
* for Motor.
*/

sumInsured:
policyType ===
"MOTOR"
? null
: sumInsured
? Number(
sumInsured
)
: null,

premium:
premium
? Number(
premium
)
: null,

actualPremium:
premium
? Number(
premium
)
: null,

startDate,
expiryDate,

policyPdfUrl:
uploadedPdfUrl ||
null,

paymentType,

financier:
paymentType ===
"EMI"
? financier.trim()
: null,

financedAmount:
paymentType ===
"EMI"
? Number(
financedAmount
)
: null,

emiAmount:
paymentType ===
"EMI"
? Number(
emiAmount
)
: null,

emiTenure:
paymentType ===
"EMI"
? Number(
emiTenure
)
: null,

firstEmiDate:
paymentType ===
"EMI"
? firstEmiDate
: null,

notes:
notes.trim() ||
null,

policyStage:
"ISSUED",

placementSource:
"SELF",

renewFrom:
isRenewal
? renewFrom
: null,
};

const response =
await fetch(
"/api/policies",
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

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
(
isRenewal
? "Unable to save renewed policy."
: "Unable to add policy."
)
);
}

setSuccess(
isRenewal
? "Renewed policy saved successfully. Previous policy has been kept in history."
: paymentType ===
"EMI"
? "Policy and EMI schedule added successfully."
: "Policy added successfully."
);

window.setTimeout(
() => {
router.push(
"/customers"
);

router.refresh();
},
700
);
} catch (err) {
console.error(
"SAVE POLICY ERROR:",
err
);

setError(
err instanceof Error
? err.message
: "Unable to save policy."
);

window.scrollTo({
top: 0,
behavior:
"smooth",
});
} finally {
setSaving(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* CLASSES */
/* ------------------------------------------------------------------------ */

const inputClass =
"mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const labelClass =
"block text-sm font-bold text-slate-700";

const sectionClass =
"rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6";

const selectedCard =
"border-blue-600 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.20)] ring-2 ring-blue-100";

const normalCard =
"border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700";

const motorSubClasses =
motorVehicleClass
? MOTOR_SUBCLASS_OPTIONS[
motorVehicleClass
]
: [];

/* ------------------------------------------------------------------------ */
/* UI */
/* ------------------------------------------------------------------------ */

return (
<main className="relative min-h-screen overflow-hidden bg-slate-50 p-4 pb-28">

<div className="relative mx-auto max-w-3xl">

{/* HEADER */}

<div className="mb-6 overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-xl sm:p-8">

<Link
href={
isRenewal
? "/renewals"
: "/customers"
}
className="inline-flex rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-blue-100"
>
← Back
</Link>

<div className="mt-6 flex items-start gap-4">

<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl">
{isRenewal
? "🔄"
: "📄"}
</div>

<div>
<p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
Policy Management
</p>

<h1 className="mt-1 text-2xl font-black sm:text-3xl">
{isRenewal
? "Renew Insurance Policy"
: "Add Insurance Policy"}
</h1>

<p className="mt-2 text-sm leading-6 text-blue-100">
{isRenewal
? "Previous policy will remain safely in history. Confirm the renewal details below."
: "Add policy, classification, premium, tenure, document and payment information."}
</p>
</div>

</div>

</div>

{/* ERROR */}

{error && (
<div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
⚠️ {error}
</div>
)}

{/* SUCCESS */}

{success && (
<div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700">
✓ {success}
</div>
)}

{/* RENEWAL LOADING */}

{isRenewal &&
loadingPreviousPolicy && (
<div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-5 font-semibold text-blue-700">
🔄 Loading previous policy details...
</div>
)}

{/* PREVIOUS POLICY */}

{isRenewal &&
previousPolicy && (
<section className="mb-5 rounded-[28px] border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm sm:p-6">

<div className="flex items-start justify-between gap-4">

<div>
<p className="text-xs font-black uppercase tracking-wider text-amber-700">
Previous Policy — Kept in History
</p>

<h2 className="mt-2 text-xl font-black text-slate-900">
{previousPolicy.policyNumber ||
"Previous Policy"}
</h2>
</div>

<span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-800">
OLD POLICY
</span>

</div>

<div className="mt-5 grid gap-3 sm:grid-cols-2">

<SummaryBox
label="Customer"
value={
previousPolicy.customer
?.name ||
previousPolicy.customerName ||
"-"
}
/>

<SummaryBox
label="Insurance Company"
value={
previousPolicy.company
?.name ||
previousPolicy.companyName ||
previousPolicy.insurerName ||
"-"
}
/>

<SummaryBox
label="Product / Plan"
value={
previousPolicy.productName ||
"-"
}
/>

<SummaryBox
label="Insurance Type"
value={
previousPolicy.policyType ||
"-"
}
/>

{previousPolicy.policyType !==
"MOTOR" && (
<SummaryBox
label="Sum Insured / Sum Assured"
value={formatMoney(
previousPolicy.sumInsured
)}
/>
)}

{previousPolicy.policyType ===
"MOTOR" && (
<SummaryBox
label="Vehicle IDV"
value={formatMoney(
previousPolicy.vehicleIdv
)}
/>
)}

<SummaryBox
label="Previous Premium"
value={formatMoney(
previousPolicy.actualPremium ??
previousPolicy.premium
)}
/>

<SummaryBox
label="Start Date"
value={formatDate(
previousPolicy.startDate
)}
/>

<SummaryBox
label="Expiry Date"
value={formatDate(
previousPolicy.expiryDate ||
previousPolicy.endDate
)}
/>

</div>

<div className="mt-4 rounded-2xl bg-amber-100 p-4 text-sm font-semibold leading-6 text-amber-900">
🔒 Saving this renewal creates a new policy. The previous policy is not deleted.
</div>

</section>
)}

<form
onSubmit={
handleSubmit
}
className="space-y-5"
>

{/* CUSTOMER */}

<section className={sectionClass}>

<div className="flex items-center gap-3">
<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl">👤</div>
<div>
<h2 className="text-lg font-black text-slate-900">Customer</h2>
<p className="text-xs font-semibold text-slate-500">Policy customer details</p>
</div>
</div>

{loadingSelectedCustomer && (
<p className="mt-4 font-semibold text-blue-700">
Loading customer...
</p>
)}

{selectedCustomer ? (
<div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

<div className="flex items-start gap-3 border-l-4 border-emerald-500 p-4 sm:p-5">
<div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg">✓</div>
<div className="min-w-0 flex-1">
<p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
Selected Customer
</p>

<h3 className="mt-1 text-lg font-black text-slate-900">
{selectedCustomer.name}
</h3>

<p className="mt-1 text-sm text-slate-600">
{selectedCustomer.customerId}
{" • "}
{selectedCustomer.phone}
</p>

{selectedCustomer.email && (
<p className="mt-1 break-all text-xs text-slate-500">
{selectedCustomer.email}
</p>
)}

{!customerLocked && (
<button
type="button"
onClick={
clearCustomer
}
className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
>
Change Customer
</button>
)}

</div>
</div>
</div>
) : (
<>

<label
className={`${labelClass} mt-5`}
>
Search Customer *
</label>

<input
value={
customerSearch
}
onChange={(
event
) =>
handleCustomerSearchChange(
event.target.value
)
}
className={
inputClass
}
placeholder="Name, customer ID, mobile or email..."
autoComplete="off"
/>

{loadingCustomers && (
<p className="mt-3 text-sm text-slate-500">
Searching customers...
</p>
)}

{!loadingCustomers &&
customerSearchStarted &&
customers.length >
0 && (
<div className="mt-4 space-y-2">

{customers.map(
(
customer
) => (
<button
key={
customer.id
}
type="button"
onClick={() =>
selectCustomer(
customer
)
}
className="w-full rounded-2xl border bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
>
<p className="font-bold">
{customer.name}
</p>

<p className="text-sm text-slate-500">
{customer.customerId}
{" • "}
{customer.phone}
</p>
</button>
)
)}

</div>
)}

{!loadingCustomers &&
customerSearchStarted &&
customers.length ===
0 && (
<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">

<p className="text-sm text-slate-500">
No customer found.
</p>

<Link
href="/customers/add"
className="mt-3 inline-block font-bold text-blue-600"
>
+ Add New Customer
</Link>

</div>
)}

</>
)}

</section>

{/* INSURANCE CLASSIFICATION */}

<section className={sectionClass}>

<div className="flex items-center gap-3">
<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl">🛡️</div>
<div>
<h2 className="text-lg font-black text-slate-900">Insurance Classification</h2>
<p className="text-xs font-semibold text-slate-500">Choose the insurance category</p>
</div>
</div>

<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

<ChoiceButton
selected={
policyType ===
"HEALTH"
}
onClick={() =>
handlePolicyTypeChange(
"HEALTH"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
❤️ Health
</ChoiceButton>

<ChoiceButton
selected={
policyType ===
"MOTOR"
}
onClick={() =>
handlePolicyTypeChange(
"MOTOR"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🚗 Motor
</ChoiceButton>

<ChoiceButton
selected={
policyType ===
"LIFE"
}
onClick={() =>
handlePolicyTypeChange(
"LIFE"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
👨‍👩‍👧 Life
</ChoiceButton>

<ChoiceButton
selected={
policyType ===
"OTHER"
}
onClick={() =>
handlePolicyTypeChange(
"OTHER"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
📋 Other
</ChoiceButton>

</div>

</section>

{/* HEALTH */}

{policyType ===
"HEALTH" && (
<section className={sectionClass}>

<h2 className="text-lg font-black text-slate-900">
❤️ Health Insurance
</h2>

<p className="mt-1 text-sm text-slate-500">
Select how this health policy is being issued.
</p>

<div className="mt-5 grid gap-3 sm:grid-cols-3">

<ChoiceButton
selected={
healthBusinessType ===
"FRESH"
}
onClick={() =>
handleHealthTypeChange(
"FRESH"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
✨ Fresh
</ChoiceButton>

<ChoiceButton
selected={
healthBusinessType ===
"PORTABILITY"
}
onClick={() =>
handleHealthTypeChange(
"PORTABILITY"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🔁 Portability
</ChoiceButton>

<ChoiceButton
selected={
healthBusinessType ===
"MIGRATION"
}
onClick={() =>
handleHealthTypeChange(
"MIGRATION"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🔄 Migration
</ChoiceButton>

</div>

{healthBusinessType ===
"FRESH" && (
<InfoNotice>
Fresh means a new health insurance policy without carrying an earlier health policy into this transaction.
</InfoNotice>
)}

{healthBusinessType ===
"PORTABILITY" && (
<InfoNotice>
Portability means moving the existing health policy from another insurer to the new insurer.
</InfoNotice>
)}

{healthBusinessType ===
"MIGRATION" && (
<InfoNotice>
Migration means changing plan or product within the same insurance company.
</InfoNotice>
)}

{(healthBusinessType ===
"PORTABILITY" ||
healthBusinessType ===
"MIGRATION") && (
<div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">

<h3 className="font-black text-slate-900">
Previous Health Policy
</h3>

<div className="mt-4 grid gap-5 md:grid-cols-2">

<div>
<label className={labelClass}>
Previous Insurer
</label>

<input
value={
previousInsurerName
}
onChange={(
event
) =>
setPreviousInsurerName(
event.target.value
)
}
readOnly={
healthBusinessType ===
"MIGRATION"
}
className={`${inputClass} ${
healthBusinessType ===
"MIGRATION"
? "cursor-not-allowed bg-slate-100"
: ""
}`}
placeholder="Previous insurance company"
/>
</div>

<div>
<label className={labelClass}>
Previous Policy Number
</label>

<input
value={
previousPolicyNumber
}
onChange={(
event
) =>
setPreviousPolicyNumber(
event.target.value
)
}
className={
inputClass
}
placeholder="Previous policy number"
/>
</div>

<div>
<label className={labelClass}>
Previous Sum Insured
</label>

<input
type="number"
min="0"
step="0.01"
value={
previousSumInsured
}
onChange={(
event
) =>
setPreviousSumInsured(
event.target.value
)
}
className={
inputClass
}
placeholder="₹ Previous sum insured"
/>
</div>

<div>
<label className={labelClass}>
Previous Policy Expiry
</label>

<input
type="date"
value={
previousPolicyExpiry
}
onChange={(
event
) =>
setPreviousPolicyExpiry(
event.target.value
)
}
className={
inputClass
}
/>
</div>

<div className="md:col-span-2">
<label className={labelClass}>
Continuous Cover Years
</label>

<input
type="number"
min="0"
step="1"
value={
continuousCoverYears
}
onChange={(
event
) =>
setContinuousCoverYears(
event.target.value
)
}
className={
inputClass
}
placeholder="Example: 5"
/>
</div>

</div>

</div>
)}

</section>
)}

{/* MOTOR */}

{policyType ===
"MOTOR" && (
<section className={sectionClass}>

<h2 className="text-lg font-black text-slate-900">
🚗 Motor Insurance
</h2>

<p className="mt-1 text-sm text-slate-500">
Select vehicle classification and insurance cover.
</p>

<div className="mt-5">

<label className={labelClass}>
Vehicle Classification *
</label>

<div className="mt-3 grid gap-3 sm:grid-cols-2">

<ChoiceButton
selected={
motorVehicleClass ===
"PRIVATE_CAR"
}
onClick={() =>
handleMotorClassChange(
"PRIVATE_CAR"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🚙 Private Car
</ChoiceButton>

<ChoiceButton
selected={
motorVehicleClass ===
"TWO_WHEELER"
}
onClick={() =>
handleMotorClassChange(
"TWO_WHEELER"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🛵 Two-Wheeler
</ChoiceButton>

<ChoiceButton
selected={
motorVehicleClass ===
"PASSENGER_CARRYING"
}
onClick={() =>
handleMotorClassChange(
"PASSENGER_CARRYING"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🚌 Passenger Carrying
</ChoiceButton>

<ChoiceButton
selected={
motorVehicleClass ===
"GOODS_CARRYING"
}
onClick={() =>
handleMotorClassChange(
"GOODS_CARRYING"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🚚 Goods Carrying
</ChoiceButton>

<ChoiceButton
selected={
motorVehicleClass ===
"MISC_SPECIAL"
}
onClick={() =>
handleMotorClassChange(
"MISC_SPECIAL"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🚜 Misc / Special Vehicle
</ChoiceButton>

</div>

</div>

{motorVehicleClass && (
<div className="mt-5">

<label className={labelClass}>
Vehicle Sub-Class
</label>

<select
value={
motorVehicleSubClass
}
onChange={(
event
) =>
setMotorVehicleSubClass(
event.target.value
)
}
className={
inputClass
}
>
<option value="">
Select Sub-Class
</option>

{motorSubClasses.map(
(
item
) => (
<option
key={
item
}
value={
item
}
>
{item}
</option>
)
)}
</select>

</div>
)}

<div className="mt-6">

<label className={labelClass}>
Cover Type *
</label>

<div className="mt-3 grid gap-3 sm:grid-cols-2">

<ChoiceButton
selected={
motorCoverType ===
"COMPREHENSIVE"
}
onClick={() =>
setMotorCoverType(
"COMPREHENSIVE"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
Comprehensive
</ChoiceButton>

<ChoiceButton
selected={
motorCoverType ===
"THIRD_PARTY"
}
onClick={() =>
setMotorCoverType(
"THIRD_PARTY"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
Third Party
</ChoiceButton>

<ChoiceButton
selected={
motorCoverType ===
"STANDALONE_OD"
}
onClick={() =>
setMotorCoverType(
"STANDALONE_OD"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
Standalone Own Damage
</ChoiceButton>

<ChoiceButton
selected={
motorCoverType ===
"STANDARD"
}
onClick={() =>
setMotorCoverType(
"STANDARD"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
Standard / Other
</ChoiceButton>

</div>

</div>

<div className="mt-6 grid gap-5 md:grid-cols-2">

<div>
<label className={labelClass}>
Registration Number
</label>

<input
value={
vehicleRegistrationNumber
}
onChange={(
event
) =>
setVehicleRegistrationNumber(
event.target.value.toUpperCase()
)
}
className={
inputClass
}
placeholder="KL 00 AB 1234"
/>
</div>

<div>
<label className={labelClass}>
Vehicle Make
</label>

<input
value={
vehicleMake
}
onChange={(
event
) =>
setVehicleMake(
event.target.value
)
}
className={
inputClass
}
placeholder="Maruti / Honda / Tata..."
/>
</div>

<div>
<label className={labelClass}>
Vehicle Model
</label>

<input
value={
vehicleModel
}
onChange={(
event
) =>
setVehicleModel(
event.target.value
)
}
className={
inputClass
}
placeholder="Vehicle model"
/>
</div>

<div>
<label className={labelClass}>
Manufacturing Year
</label>

<input
type="number"
min="1900"
max={
new Date()
.getFullYear() +
1
}
value={
vehicleYear
}
onChange={(
event
) =>
setVehicleYear(
event.target.value
)
}
className={
inputClass
}
placeholder="2026"
/>
</div>

{/* MOTOR IDV */}

<div>
<label className={labelClass}>
Vehicle IDV
</label>

<input
type="number"
min="0"
step="0.01"
value={
vehicleIdv
}
onChange={(
event
) =>
setVehicleIdv(
event.target.value
)
}
className={
inputClass
}
placeholder="₹ Insured Declared Value"
/>
</div>

<div>
<label className={labelClass}>
NCB %
</label>

<input
type="number"
min="0"
max="100"
step="0.01"
value={
vehicleNcbPercent
}
onChange={(
event
) =>
setVehicleNcbPercent(
event.target.value
)
}
className={
inputClass
}
placeholder="Example: 20"
/>
</div>

<div className="md:col-span-2">

<label className={labelClass}>
Other Vehicle Description
</label>

<input
value={
motorOtherVehicleType
}
onChange={(
event
) =>
setMotorOtherVehicleType(
event.target.value
)
}
className={
inputClass
}
placeholder="Optional vehicle classification details"
/>

</div>

</div>

</section>
)}

{/* LIFE */}

{policyType ===
"LIFE" && (
<section className={sectionClass}>

<h2 className="text-lg font-black text-slate-900">
👨‍👩‍👧 Life Insurance
</h2>

<p className="mt-1 text-sm text-slate-500">
Select the life insurance product category.
</p>

<div className="mt-5 grid gap-3 sm:grid-cols-2">

<ChoiceButton
selected={
lifeCategory ===
"TERM"
}
onClick={() =>
handleLifeCategoryChange(
"TERM"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
🛡️ Term Insurance
</ChoiceButton>

<ChoiceButton
selected={
lifeCategory ===
"UNIT_LINKED"
}
onClick={() =>
handleLifeCategoryChange(
"UNIT_LINKED"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
📈 ULIP / Unit Linked
</ChoiceButton>

<ChoiceButton
selected={
lifeCategory ===
"ENDOWMENT"
}
onClick={() =>
handleLifeCategoryChange(
"ENDOWMENT"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
💰 Endowment / Traditional
</ChoiceButton>

<ChoiceButton
selected={
lifeCategory ===
"WHOLE_LIFE"
}
onClick={() =>
handleLifeCategoryChange(
"WHOLE_LIFE"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
♾️ Whole Life
</ChoiceButton>

<ChoiceButton
selected={
lifeCategory ===
"MONEY_BACK"
}
onClick={() =>
handleLifeCategoryChange(
"MONEY_BACK"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
💵 Money Back
</ChoiceButton>

<ChoiceButton
selected={
lifeCategory ===
"PENSION"
}
onClick={() =>
handleLifeCategoryChange(
"PENSION"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
👴 Pension / Retirement
</ChoiceButton>

<ChoiceButton
selected={
lifeCategory ===
"CHILD_PLAN"
}
onClick={() =>
handleLifeCategoryChange(
"CHILD_PLAN"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
👶 Child Plan
</ChoiceButton>

<ChoiceButton
selected={
lifeCategory ===
"GROUP_LIFE"
}
onClick={() =>
handleLifeCategoryChange(
"GROUP_LIFE"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
👥 Group Life
</ChoiceButton>

<ChoiceButton
selected={
lifeCategory ===
"OTHER"
}
onClick={() =>
handleLifeCategoryChange(
"OTHER"
)
}
selectedClass={
selectedCard
}
normalClass={
normalCard
}
>
📋 Other Life Product
</ChoiceButton>

</div>

{lifeCategory ===
"OTHER" && (
<div className="mt-5">

<label className={labelClass}>
Other Life Product Name *
</label>

<input
value={
customLifeProductName
}
onChange={(
event
) =>
setCustomLifeProductName(
event.target.value
)
}
className={
inputClass
}
placeholder="Enter life product classification"
/>

</div>
)}

</section>
)}

{/* POLICY DETAILS */}

<section className={sectionClass}>

<h2 className="text-lg font-black text-slate-900">
📄{" "}
{isRenewal
? "Renewal Policy Details"
: "Policy Details"}
</h2>

{isRenewal && (
<div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-700">
Previous policy details have been copied for convenience. Confirm or change the renewal details before saving.
</div>
)}

<div className="mt-6 grid gap-5 md:grid-cols-2">

{/* POLICY NUMBER */}

<div>
<label className={labelClass}>
{isRenewal
? "Renewal Policy Number *"
: "Policy Number *"}
</label>

<input
value={
policyNumber
}
onChange={(
event
) =>
setPolicyNumber(
event.target.value
)
}
className={
inputClass
}
placeholder={
isRenewal
? "Enter renewal policy number"
: "Enter policy number"
}
/>
</div>

{/* COMPANY FROM DATABASE */}

<div>
<label className={labelClass}>
Insurance Company *
</label>

<select
value={
companyId
}
onChange={(
event
) =>
handleCompanyChange(
event.target.value
)
}
className={
inputClass
}
disabled={
loadingCompanies
}
>
<option value="">
{loadingCompanies
? "Loading companies..."
: "Select Insurance Company"}
</option>

{companies.map(
(
company
) => (
<option
key={
company.id
}
value={
company.id
}
>
{company.name}
</option>
)
)}
</select>

<p className="mt-2 text-xs font-semibold text-blue-600">
{policyType ===
"HEALTH"
? "Showing Health insurers from Company Master."
: policyType ===
"MOTOR"
? "Showing Motor insurers from Company Master."
: policyType ===
"LIFE"
? "Showing Life insurers from Company Master."
: "Showing active companies from Company Master."}
</p>

{!loadingCompanies &&
companies.length ===
0 && (
<p className="mt-2 text-xs font-bold text-amber-700">
No company is configured for this category.
</p>
)}
</div>

{/* PRODUCT */}

<div>
<label className={labelClass}>
Product / Plan
</label>

<input
type="text"
value={
productName
}
onChange={(
event
) =>
setProductName(
event.target.value
)
}
className={
inputClass
}
placeholder="Type product / plan name"
autoComplete="off"
/>
</div>

{/* SUM INSURED - NOT MOTOR */}

{policyType !==
"MOTOR" && (
<div>
<label className={labelClass}>
{policyType ===
"LIFE"
? "Sum Assured"
: "Sum Insured"}
</label>

<input
type="number"
min="0"
step="0.01"
value={
sumInsured
}
onChange={(
event
) =>
setSumInsured(
event.target.value
)
}
className={
inputClass
}
placeholder={
policyType ===
"LIFE"
? "₹ Sum assured"
: "₹ Sum insured"
}
/>
</div>
)}

{/* PREMIUM */}

<div>
<label className={labelClass}>
{isRenewal
? "Renewal Premium"
: "Premium"}
</label>

<input
type="number"
min="0"
step="0.01"
value={
premium
}
onChange={(
event
) =>
setPremium(
event.target.value
)
}
className={
inputClass
}
placeholder="₹ Premium"
/>
</div>

</div>

{/* POLICY PERIOD */}

<div className="mt-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5">

<h3 className="font-black text-slate-900">
📅{" "}
{isRenewal
? "Renewal Policy Period"
: "Policy Period"}
</h3>

<p className="mt-1 text-sm text-slate-500">
Expiry date can be calculated automatically.
</p>

<div className="mt-5 grid gap-5 md:grid-cols-3">

<div>
<label className={labelClass}>
Start Date *
</label>

<input
type="date"
value={
startDate
}
onChange={(
event
) =>
setStartDate(
event.target.value
)
}
className={
inputClass
}
/>
</div>

<div>
<label className={labelClass}>
Policy Tenure
</label>

<select
value={
policyTenure
}
onChange={(
event
) =>
handleTenureChange(
event.target
.value as PolicyTenure
)
}
className={
inputClass
}
>
<option value="MANUAL">
Manual Date
</option>

<option value="1M">
1 Month
</option>

<option value="3M">
3 Months
</option>

<option value="6M">
6 Months
</option>

<option value="1Y">
1 Year
</option>

<option value="2Y">
2 Years
</option>

<option value="3Y">
3 Years
</option>

<option value="4Y">
4 Years
</option>

<option value="5Y">
5 Years
</option>

<option value="6Y">
6 Years
</option>

<option value="7Y">
7 Years
</option>

<option value="8Y">
8 Years
</option>

<option value="9Y">
9 Years
</option>

<option value="10Y">
10 Years
</option>
</select>
</div>

<div>
<label className={labelClass}>
Expiry Date *
</label>

<input
type="date"
value={
expiryDate
}
onChange={(
event
) =>
setExpiryDate(
event.target.value
)
}
readOnly={
policyTenure !==
"MANUAL"
}
className={`${inputClass} ${
policyTenure !==
"MANUAL"
? "cursor-not-allowed bg-white/60"
: ""
}`}
/>

{policyTenure !==
"MANUAL" && (
<p className="mt-2 text-xs font-bold text-emerald-600">
✓ Automatically calculated
</p>
)}
</div>

</div>

</div>

</section>

{/* PDF */}

<section className={sectionClass}>

<h2 className="text-lg font-black text-slate-900">
📑{" "}
{isRenewal
? "Renewal Policy Document"
: "Policy Document"}
</h2>

<p className="mt-1 text-xs text-slate-500">
Optional PDF copy
</p>

<label className="mt-5 block cursor-pointer rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50">

<input
type="file"
accept="application/pdf,.pdf"
onChange={
handlePdfChange
}
className="hidden"
/>

<div className="text-3xl">
📤
</div>

<p className="mt-2 font-bold text-slate-800">
Choose Policy PDF
</p>

<p className="mt-1 text-xs text-slate-500">
PDF only • Maximum 10 MB
</p>

</label>

{policyPdf && (
<div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 font-bold text-blue-800">
📄 {policyPdf.name}
</div>
)}

</section>

{/* PAYMENT */}

<section className={sectionClass}>

<h2 className="text-lg font-black text-slate-900">
₹ Payment Details
</h2>

<p className="mt-1 text-xs text-slate-500">
Full payment or EMI
</p>

<div className="mt-5 grid grid-cols-2 gap-3">

<ChoiceButton
selected={
paymentType ===
"FULL"
}
onClick={() =>
setPaymentType(
"FULL"
)
}
selectedClass="border-blue-600 bg-blue-600 text-white"
normalClass={
normalCard
}
>
✓ Full Payment
</ChoiceButton>

<ChoiceButton
selected={
paymentType ===
"EMI"
}
onClick={() =>
setPaymentType(
"EMI"
)
}
selectedClass="border-violet-600 bg-violet-600 text-white"
normalClass={
normalCard
}
>
📆 EMI
</ChoiceButton>

</div>

{paymentType ===
"EMI" && (
<div className="mt-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50 p-5">

<h3 className="font-black text-slate-900">
EMI Information
</h3>

<div className="mt-5 grid gap-5 md:grid-cols-2">

<div>
<label className={labelClass}>
Financier *
</label>

<input
value={
financier
}
onChange={(
event
) =>
setFinancier(
event.target.value
)
}
className={
inputClass
}
placeholder="Bajaj Finance / Bank / Other"
/>
</div>

<div>
<label className={labelClass}>
Financed Amount *
</label>

<input
type="number"
min="0"
step="0.01"
value={
financedAmount
}
onChange={(
event
) =>
setFinancedAmount(
event.target.value
)
}
className={
inputClass
}
placeholder="₹ Amount financed"
/>
</div>

<div>
<label className={labelClass}>
Monthly EMI *
</label>

<input
type="number"
min="0"
step="0.01"
value={
emiAmount
}
onChange={(
event
) =>
setEmiAmount(
event.target.value
)
}
className={
inputClass
}
placeholder="₹ EMI amount"
/>
</div>

<div>
<label className={labelClass}>
EMI Tenure *
</label>

<input
type="number"
min="1"
max="120"
step="1"
value={
emiTenure
}
onChange={(
event
) =>
setEmiTenure(
event.target.value
)
}
className={
inputClass
}
placeholder="Example: 12"
/>
</div>

<div className="md:col-span-2">

<label className={labelClass}>
First EMI Date *
</label>

<input
type="date"
value={
firstEmiDate
}
onChange={(
event
) =>
setFirstEmiDate(
event.target.value
)
}
className={
inputClass
}
/>

</div>

</div>

{emiAmount &&
emiTenure &&
Number(
emiAmount
) > 0 &&
Number(
emiTenure
) > 0 && (
<div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">

<p className="text-xs font-bold uppercase tracking-wider text-violet-600">
EMI Summary
</p>

<p className="mt-2 text-xl font-black text-slate-900">
₹
{Number(
emiAmount
).toLocaleString(
"en-IN"
)}
{" × "}
{emiTenure}
{" months"}
</p>

<p className="mt-1 text-sm text-slate-500">
Total scheduled:
{" ₹"}
{(
Number(
emiAmount
) *
Number(
emiTenure
)
).toLocaleString(
"en-IN"
)}
</p>

</div>
)}

</div>
)}

</section>

{/* NOTES */}

<section className={sectionClass}>

<label className={labelClass}>
📝 Policy Notes
</label>

<textarea
value={
notes
}
onChange={(
event
) =>
setNotes(
event.target.value
)
}
rows={4}
className={
inputClass
}
placeholder="Optional notes about the policy..."
/>

</section>

{/* BUTTONS */}

<div className="sticky bottom-3 z-20 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">

<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

<Link
href={
isRenewal
? "/renewals"
: "/customers"
}
className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-center font-bold text-slate-700"
>
Cancel
</Link>

<button
type="submit"
disabled={
saving ||
uploadingPdf ||
loadingPreviousPolicy ||
loadingSelectedCustomer ||
loadingCompanies
}
className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-3.5 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
>
{uploadingPdf
? "Uploading PDF..."
: saving
? isRenewal
? "Saving Renewal..."
: "Saving Policy..."
: isRenewal
? "✓ Save Renewed Policy"
: "✓ Save Policy"}
</button>

</div>

</div>

</form>

</div>

</main>
);
}

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS */
/* -------------------------------------------------------------------------- */

function ChoiceButton({
selected,
onClick,
selectedClass,
normalClass,
children,
}: {
selected: boolean;
onClick: () => void;
selectedClass: string;
normalClass: string;
children:
React.ReactNode;
}) {
return (
<button
type="button"
onClick={
onClick
}
className={`min-h-[74px] rounded-2xl border p-4 text-center text-sm font-black transition-all duration-200 ${
selected
? selectedClass
: normalClass
}`}
>
{children}
</button>
);
}

function InfoNotice({
children,
}: {
children:
React.ReactNode;
}) {
return (
<div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
ℹ️ {children}
</div>
);
}

function SummaryBox({
label,
value,
}: {
label: string;
value: string;
}) {
return (
<div className="rounded-2xl bg-white/80 p-4">

<p className="text-xs text-slate-500">
{label}
</p>

<p className="mt-1 break-words font-bold text-slate-900">
{value}
</p>

</div>
);
}