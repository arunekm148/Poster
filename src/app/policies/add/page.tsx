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

type PolicyDocumentType =
| "OLD_POLICY"
| "OTHER";

type UploadedPolicyDocument = {
type: PolicyDocumentType;
fileName: string;
fileUrl: string;
fileType?: string | null;
};

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


type AutoFillDocumentType =
| "POLICY"
| "OLD_POLICY"
| "RC"
| "AADHAAR";

type IntakeDocumentKind =
| "CURRENT_POLICY"
| "RC"
| "OLD_POLICY"
| "AADHAAR";

type AutoFillResult = {
documentType?:
| "POLICY"
| "OLD_POLICY"
| "RC"
| "AADHAAR"
| "UNKNOWN";

confidence?: number | null;

policyType?:
| BusinessType
| null;

policyNumber?:
| string
| null;

previousPolicyNumber?:
| string
| null;

companyName?:
| string
| null;

productName?:
| string
| null;

premium?:
| number
| string
| null;

sumInsured?:
| number
| string
| null;

startDate?:
| string
| null;

expiryDate?:
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

ownerName?:
| string
| null;

engineNumber?:
| string
| null;

chassisNumber?:
| string
| null;

fuelType?:
| string
| null;

aadhaarName?:
| string
| null;

aadhaarDob?:
| string
| null;

aadhaarYearOfBirth?:
| string
| number
| null;

aadhaarGender?:
| string
| null;

aadhaarAddress?:
| string
| null;

aadhaarLast4?:
| string
| null;

remarks?: string[];
detectedFields?: string[];
};

type IntakeReadResult = {
kind: IntakeDocumentKind;
fileName: string;
result?: AutoFillResult;
error?: string;
};

type ReviewTarget =
| "policyType"
| "policyNumber"
| "companyName"
| "productName"
| "premium"
| "sumInsured"
| "startDate"
| "expiryDate"
| "motorVehicleClass"
| "motorVehicleSubClass"
| "motorCoverType"
| "vehicleRegistrationNumber"
| "vehicleMake"
| "vehicleModel"
| "vehicleYear"
| "vehicleIdv"
| "vehicleNcbPercent"
| "previousInsurerName"
| "previousPolicyNumber"
| "previousSumInsured"
| "previousPolicyExpiry";

type ReviewAlternative = {
source: string;
value: string;
};

type ReviewItem = {
id: string;
label: string;
target?: ReviewTarget;
value: string;
source: string;
selected: boolean;
applyable: boolean;
alternatives?: ReviewAlternative[];
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
/* OPTIONAL MULTIPLE DOCUMENTS */
/* ------------------------------------------------------------------------ */

const [
oldPolicyFiles,
setOldPolicyFiles,
] = useState<File[]>([]);

const [
otherDocumentFiles,
setOtherDocumentFiles,
] = useState<File[]>([]);

const [
uploadingDocuments,
setUploadingDocuments,
] = useState(false);


/* ------------------------------------------------------------------------ */
/* DOCUMENT INTAKE / LOCAL AUTO FILL */
/* ------------------------------------------------------------------------ */

const [
intakeFiles,
setIntakeFiles,
] = useState<
Record<
IntakeDocumentKind,
File | null
>
>({
CURRENT_POLICY: null,
RC: null,
OLD_POLICY: null,
AADHAAR: null,
});

const [
intakeResults,
setIntakeResults,
] = useState<IntakeReadResult[]>([]);

const [
reviewItems,
setReviewItems,
] = useState<ReviewItem[]>([]);

const [
intakeReading,
setIntakeReading,
] = useState(false);

const [
intakeStatus,
setIntakeStatus,
] = useState("");

const [
intakeInputVersion,
setIntakeInputVersion,
] = useState(0);

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
/* CONNECT AUTO-FILLED COMPANY NAME TO COMPANY MASTER */
/* ------------------------------------------------------------------------ */

useEffect(() => {
if (
!companyName.trim() ||
companyId ||
companies.length === 0
) {
return;
}

const matching =
companies.find(
company =>
company.name
.trim()
.toLowerCase() ===
companyName
.trim()
.toLowerCase()
);

if (matching) {
setCompanyId(
matching.id
);
}
}, [
companies,
companyName,
companyId,
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
/* DOCUMENT INTAKE / LOCAL AUTO FILL */
/* ------------------------------------------------------------------------ */

const INTAKE_LABELS: Record<
IntakeDocumentKind,
string
> = {
CURRENT_POLICY: "Current Policy",
RC: "RC Book / RC Card",
OLD_POLICY: "Old Policy",
AADHAAR: "Aadhaar / KYC",
};

function readerDocumentType(
kind: IntakeDocumentKind
): AutoFillDocumentType {
if (kind === "CURRENT_POLICY") {
return "POLICY";
}

if (kind === "OLD_POLICY") {
return "OLD_POLICY";
}

if (kind === "AADHAAR") {
return "AADHAAR";
}

return "RC";
}

function handleIntakeFileChange(
kind: IntakeDocumentKind,
event: ChangeEvent<HTMLInputElement>
) {
setError("");
setIntakeStatus("");
setIntakeResults([]);
setReviewItems([]);

const file =
event.target.files?.[0];

if (!file) {
setIntakeFiles(
previous => ({
...previous,
[kind]: null,
})
);
return;
}

const validationError =
validateOptionalDocumentFile(
file
);

if (validationError) {
setError(validationError);
event.target.value = "";
return;
}

setIntakeFiles(
previous => ({
...previous,
[kind]: file,
})
);
}

function removeIntakeFile(
kind: IntakeDocumentKind
) {
setIntakeFiles(
previous => ({
...previous,
[kind]: null,
})
);
setIntakeResults(
previous =>
previous.filter(
item => item.kind !== kind
)
);
setReviewItems([]);
setIntakeStatus("");
setIntakeInputVersion(
value => value + 1
);
}

function normalizeAutoFillDate(
value?: string | null
) {
const text = String(
value || ""
).trim();

if (!text) {
return "";
}

if (
/^\d{4}-\d{2}-\d{2}$/.test(
text
)
) {
return text;
}

const parsed = new Date(text);

if (
Number.isNaN(
parsed.getTime()
)
) {
return "";
}

return [
parsed.getUTCFullYear(),
String(
parsed.getUTCMonth() + 1
).padStart(2, "0"),
String(
parsed.getUTCDate()
).padStart(2, "0"),
].join("-");
}

function normalizeAutoFillBusinessType(
value?: string | null
): BusinessType | "" {
const upper = String(
value || ""
)
.trim()
.toUpperCase();

if (
upper === "HEALTH" ||
upper === "MOTOR" ||
upper === "LIFE" ||
upper === "OTHER"
) {
return upper as BusinessType;
}

return "";
}

function normalizeMotorVehicleClass(
value?: string | null
): MotorVehicleClass {
const upper = String(
value || ""
)
.trim()
.toUpperCase();

if (
upper === "TWO_WHEELER" ||
upper === "PRIVATE_CAR" ||
upper === "PASSENGER_CARRYING" ||
upper === "GOODS_CARRYING" ||
upper === "MISC_SPECIAL"
) {
return upper as MotorVehicleClass;
}

return "";
}

function normalizeMotorCoverType(
value?: string | null
): MotorCoverType {
const upper = String(
value || ""
)
.trim()
.toUpperCase();

if (
upper === "COMPREHENSIVE" ||
upper === "THIRD_PARTY" ||
upper === "STANDALONE_OD" ||
upper === "STANDARD"
) {
return upper as MotorCoverType;
}

return "";
}

function addFileToOtherDocuments(
file: File
) {
setOtherDocumentFiles(
previous => {
const exists = previous.some(
item =>
item.name === file.name &&
item.size === file.size &&
item.lastModified === file.lastModified
);

if (exists) {
return previous;
}

return [
...previous,
file,
].slice(0, 20);
}
);
}

function addFileToOldPolicyDocuments(
file: File
) {
setOldPolicyFiles(
previous => {
const exists = previous.some(
item =>
item.name === file.name &&
item.size === file.size &&
item.lastModified === file.lastModified
);

if (exists) {
return previous;
}

return [
...previous,
file,
].slice(0, 20);
}
);
}

function valueText(
value: unknown
) {
if (
value === null ||
value === undefined
) {
return "";
}

return String(value).trim();
}

function buildReviewItems(
results: IntakeReadResult[]
): ReviewItem[] {
type Candidate = {
label: string;
target?: ReviewTarget;
value: string;
source: string;
priority: number;
selected: boolean;
applyable: boolean;
};

const candidates =
new Map<string, Candidate[]>();

function addCandidate(
key: string,
label: string,
target: ReviewTarget | undefined,
value: unknown,
source: string,
priority: number,
selected = true,
applyable = true
) {
const text = valueText(value);
if (!text) {
return;
}

const list =
candidates.get(key) || [];

list.push({
label,
target,
value: text,
source,
priority,
selected,
applyable,
});

candidates.set(key, list);
}

for (const item of results) {
if (!item.result || item.error) {
continue;
}

const r = item.result;
const source = INTAKE_LABELS[item.kind];

if (item.kind === "CURRENT_POLICY") {
addCandidate("policyType", "Insurance Type", "policyType", r.policyType, source, 120);
addCandidate("policyNumber", "Policy Number", "policyNumber", r.policyNumber, source, 120);
addCandidate("companyName", "Insurance Company", "companyName", r.companyName, source, 120);
addCandidate("productName", "Product / Plan", "productName", r.productName, source, 120);
addCandidate("premium", "Premium", "premium", r.premium, source, 120);
addCandidate("sumInsured", "Sum Insured / Assured", "sumInsured", r.sumInsured, source, 120);
addCandidate("startDate", "Policy Start Date", "startDate", r.startDate, source, 120);
addCandidate("expiryDate", "Policy Expiry Date", "expiryDate", r.expiryDate, source, 120);
addCandidate("motorCoverType", "Motor Cover Type", "motorCoverType", r.motorCoverType, source, 120);
addCandidate("vehicleRegistrationNumber", "Registration Number", "vehicleRegistrationNumber", r.vehicleRegistrationNumber, source, 100);
addCandidate("vehicleMake", "Vehicle Make", "vehicleMake", r.vehicleMake, source, 100);
addCandidate("vehicleModel", "Vehicle Model", "vehicleModel", r.vehicleModel, source, 100);
addCandidate("vehicleYear", "Manufacturing Year", "vehicleYear", r.vehicleYear, source, 100);
addCandidate("motorVehicleClass", "Vehicle Classification", "motorVehicleClass", r.motorVehicleClass, source, 100);
addCandidate("motorVehicleSubClass", "Vehicle Sub-Class", "motorVehicleSubClass", r.motorVehicleSubClass, source, 100);
addCandidate("vehicleIdv", "Vehicle IDV", "vehicleIdv", r.vehicleIdv, source, 120);
addCandidate("vehicleNcbPercent", "NCB %", "vehicleNcbPercent", r.vehicleNcbPercent, source, 120);
addCandidate("ownerName", "Insured / Owner Name", undefined, r.ownerName, source, 50, false, false);
addCandidate("engineNumber", "Engine Number", undefined, r.engineNumber, source, 50, false, false);
addCandidate("chassisNumber", "Chassis Number", undefined, r.chassisNumber, source, 50, false, false);
addCandidate("fuelType", "Fuel Type", undefined, r.fuelType, source, 50, false, false);
}

if (item.kind === "RC") {
addCandidate("vehicleRegistrationNumber", "Registration Number", "vehicleRegistrationNumber", r.vehicleRegistrationNumber, source, 140);
addCandidate("vehicleMake", "Vehicle Make", "vehicleMake", r.vehicleMake, source, 140);
addCandidate("vehicleModel", "Vehicle Model", "vehicleModel", r.vehicleModel, source, 140);
addCandidate("vehicleYear", "Manufacturing Year", "vehicleYear", r.vehicleYear, source, 140);
addCandidate("motorVehicleClass", "Vehicle Classification", "motorVehicleClass", r.motorVehicleClass, source, 140);
addCandidate("motorVehicleSubClass", "Vehicle Sub-Class", "motorVehicleSubClass", r.motorVehicleSubClass, source, 140);
addCandidate("ownerName", "Registered Owner", undefined, r.ownerName, source, 80, false, false);
addCandidate("engineNumber", "Engine Number", undefined, r.engineNumber, source, 80, false, false);
addCandidate("chassisNumber", "Chassis Number", undefined, r.chassisNumber, source, 80, false, false);
addCandidate("fuelType", "Fuel Type", undefined, r.fuelType, source, 80, false, false);
}

if (item.kind === "OLD_POLICY") {
addCandidate("previousInsurerName", "Previous Insurer", "previousInsurerName", r.companyName, source, 120, false);
addCandidate("previousPolicyNumber", "Previous Policy Number", "previousPolicyNumber", r.policyNumber, source, 120, false);
addCandidate("previousPolicyExpiry", "Previous Policy Expiry", "previousPolicyExpiry", r.expiryDate, source, 120, false);
addCandidate(
"previousSumInsured",
"Previous Sum Insured / IDV",
"previousSumInsured",
r.sumInsured ?? r.vehicleIdv,
source,
120,
false
);

/*
 * Old-policy NCB is often needed during renewal.
 * Use it only when the current policy did not provide NCB.
 */
addCandidate("vehicleNcbPercent", "NCB %", "vehicleNcbPercent", r.vehicleNcbPercent, source, 70, false);
addCandidate("oldPolicyReference", "Old Policy Reference", undefined, r.policyNumber, source, 40, false, false);
addCandidate("oldPolicyIdv", "Old Policy IDV", undefined, r.vehicleIdv, source, 40, false, false);
}

if (item.kind === "AADHAAR") {
addCandidate("aadhaarName", "Aadhaar Name", undefined, r.aadhaarName || r.ownerName, source, 100, false, false);
addCandidate("aadhaarDob", "Aadhaar Date of Birth", undefined, r.aadhaarDob, source, 100, false, false);
addCandidate("aadhaarYearOfBirth", "Aadhaar Year of Birth", undefined, r.aadhaarYearOfBirth, source, 100, false, false);
addCandidate("aadhaarGender", "Aadhaar Gender", undefined, r.aadhaarGender, source, 100, false, false);
addCandidate("aadhaarAddress", "Aadhaar Address", undefined, r.aadhaarAddress, source, 100, false, false);
addCandidate(
"aadhaarLast4",
"Aadhaar (last 4 only)",
undefined,
r.aadhaarLast4 ? `XXXX XXXX ${r.aadhaarLast4}` : "",
source,
100,
false,
false
);
}
}

const review: ReviewItem[] = [];

for (const [key, list] of candidates.entries()) {
const ordered = [...list].sort(
(a, b) => b.priority - a.priority
);
const chosen = ordered[0];
const alternatives = ordered
.slice(1)
.filter(item => item.value !== chosen.value)
.map(item => ({
source: item.source,
value: item.value,
}));

review.push({
id: key,
label: chosen.label,
target: chosen.target,
value: chosen.value,
source: chosen.source,
selected:
chosen.applyable &&
chosen.selected,
applyable: chosen.applyable,
alternatives,
});
}

const order: string[] = [
"policyType",
"policyNumber",
"companyName",
"productName",
"premium",
"sumInsured",
"startDate",
"expiryDate",
"vehicleRegistrationNumber",
"vehicleMake",
"vehicleModel",
"vehicleYear",
"motorVehicleClass",
"motorVehicleSubClass",
"motorCoverType",
"vehicleIdv",
"vehicleNcbPercent",
"previousInsurerName",
"previousPolicyNumber",
"previousPolicyExpiry",
"previousSumInsured",
"ownerName",
"engineNumber",
"chassisNumber",
"fuelType",
"aadhaarName",
"aadhaarDob",
"aadhaarYearOfBirth",
"aadhaarGender",
"aadhaarAddress",
"aadhaarLast4",
"oldPolicyReference",
"oldPolicyIdv",
];

return review.sort(
(a, b) =>
order.indexOf(a.id) -
order.indexOf(b.id)
);
}

async function readAllIntakeDocuments() {
if (intakeReading) {
return;
}

const selected = (
Object.entries(intakeFiles) as Array<[
IntakeDocumentKind,
File | null
]>
).filter(
(
entry
): entry is [
IntakeDocumentKind,
File
] => Boolean(entry[1])
);

if (selected.length === 0) {
setError(
"Please select at least one document, or skip this section and enter the policy manually."
);
return;
}

try {
setIntakeReading(true);
setError("");
setIntakeStatus(
`Reading ${selected.length} document${selected.length === 1 ? "" : "s"} locally...`
);

const completed: IntakeReadResult[] = [];

/*
 * Read sequentially so normal office computers are not overloaded
 * when multiple scanned documents require OCR.
 */
for (const [kind, file] of selected) {
setIntakeStatus(
`Reading ${INTAKE_LABELS[kind]}...`
);

try {
const formData = new FormData();
formData.append("file", file);
formData.append(
"documentType",
readerDocumentType(kind)
);

const response = await fetch(
"/api/policy-autofill",
{
method: "POST",
body: formData,
}
);

const data = await response
.json()
.catch(() => ({}));

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
`Unable to read ${INTAKE_LABELS[kind]}.`
);
}

completed.push({
kind,
fileName: file.name,
result:
data.data ||
data.result ||
{},
});
} catch (documentError) {
completed.push({
kind,
fileName: file.name,
error:
documentError instanceof Error
? documentError.message
: `Unable to read ${INTAKE_LABELS[kind]}.`,
});
}
}

setIntakeResults(completed);

const review =
buildReviewItems(completed);
setReviewItems(review);

const successCount =
completed.filter(
item => item.result && !item.error
).length;

const failedCount =
completed.length - successCount;

setIntakeStatus(
failedCount > 0
? `Read ${successCount} document${successCount === 1 ? "" : "s"}. ${failedCount} document${failedCount === 1 ? "" : "s"} could not be read. Review the available values below.`
: `✓ Read ${successCount} document${successCount === 1 ? "" : "s"}. Review or edit the detected values, then apply the selected fields.`
);
} finally {
setIntakeReading(false);
}
}

function updateReviewValue(
id: string,
value: string
) {
setReviewItems(
previous =>
previous.map(
item =>
item.id === id
? {
...item,
value,
}
: item
)
);
}

function toggleReviewItem(
id: string
) {
setReviewItems(
previous =>
previous.map(
item =>
item.id === id &&
item.applyable
? {
...item,
selected: !item.selected,
}
: item
)
);
}

function setAllReviewSelections(
selected: boolean
) {
setReviewItems(
previous =>
previous.map(
item =>
item.applyable
? {
...item,
selected,
}
: item
)
);
}

function applyReviewValue(
item: ReviewItem
) {
if (
!item.target ||
!item.selected ||
!item.applyable
) {
return;
}

const value = item.value.trim();
if (!value) {
return;
}

switch (item.target) {
case "policyType": {
const normalized =
normalizeAutoFillBusinessType(
value
);
if (normalized) {
handlePolicyTypeChange(
normalized
);
}
break;
}

case "policyNumber":
setPolicyNumber(value);
break;

case "companyName": {
setCompanyName(value);
const matching =
companies.find(
company =>
company.name
.trim()
.toLowerCase() ===
value.toLowerCase()
);
if (matching) {
setCompanyId(matching.id);
}
break;
}

case "productName":
setProductName(value);
break;

case "premium":
setPremium(value);
break;

case "sumInsured":
setSumInsured(value);
break;

case "startDate": {
const date =
normalizeAutoFillDate(value);
if (date) {
setPolicyTenure("MANUAL");
setStartDate(date);
}
break;
}

case "expiryDate": {
const date =
normalizeAutoFillDate(value);
if (date) {
setPolicyTenure("MANUAL");
setExpiryDate(date);
}
break;
}

case "motorVehicleClass": {
const normalized =
normalizeMotorVehicleClass(
value
);
if (normalized) {
setMotorVehicleClass(normalized);
}
break;
}

case "motorVehicleSubClass":
setMotorVehicleSubClass(value);
break;

case "motorCoverType": {
const normalized =
normalizeMotorCoverType(
value
);
if (normalized) {
setMotorCoverType(normalized);
}
break;
}

case "vehicleRegistrationNumber":
setVehicleRegistrationNumber(
value.toUpperCase()
);
break;

case "vehicleMake":
setVehicleMake(value);
break;

case "vehicleModel":
setVehicleModel(value);
break;

case "vehicleYear":
setVehicleYear(value);
break;

case "vehicleIdv":
setVehicleIdv(value);
break;

case "vehicleNcbPercent":
setVehicleNcbPercent(value);
break;

case "previousInsurerName":
setPreviousInsurerName(value);
break;

case "previousPolicyNumber":
setPreviousPolicyNumber(value);
break;

case "previousSumInsured":
setPreviousSumInsured(value);
break;

case "previousPolicyExpiry": {
const date =
normalizeAutoFillDate(value);
if (date) {
setPreviousPolicyExpiry(date);
}
break;
}
}
}

function attachIntakeDocuments() {
const currentPolicy =
intakeFiles.CURRENT_POLICY;

if (currentPolicy) {
const isPdf =
currentPolicy.type ===
"application/pdf" ||
currentPolicy.name
.toLowerCase()
.endsWith(".pdf");

if (isPdf) {
setPolicyPdf(currentPolicy);
setPolicyPdfUrl("");
} else {
addFileToOtherDocuments(
currentPolicy
);
}
}

if (intakeFiles.RC) {
addFileToOtherDocuments(
intakeFiles.RC
);
}

if (intakeFiles.AADHAAR) {
addFileToOtherDocuments(
intakeFiles.AADHAAR
);
}

if (intakeFiles.OLD_POLICY) {
addFileToOldPolicyDocuments(
intakeFiles.OLD_POLICY
);
}
}

function applySelectedReviewValues() {
const selected = reviewItems.filter(
item =>
item.applyable &&
item.selected
);

/*
 * Apply insurance type first because changing type clears
 * category-specific fields in the existing manual form.
 */
const typeItem = selected.find(
item => item.target === "policyType"
);

if (typeItem) {
applyReviewValue(typeItem);
}

for (const item of selected) {
if (item.target === "policyType") {
continue;
}
applyReviewValue(item);
}

attachIntakeDocuments();

setIntakeStatus(
"✓ Selected values have been applied. All normal fields remain editable, and the selected documents will be attached when you save the policy."
);

setSuccess(
"Document values applied. Please verify or manually edit any field before saving."
);
}

function clearDocumentIntake() {
setIntakeFiles({
CURRENT_POLICY: null,
RC: null,
OLD_POLICY: null,
AADHAAR: null,
});
setIntakeResults([]);
setReviewItems([]);
setIntakeStatus("");
setIntakeInputVersion(
value => value + 1
);
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
/* OPTIONAL MULTIPLE DOCUMENTS */
/* ------------------------------------------------------------------------ */

function validateOptionalDocumentFile(
file: File
): string {
const allowedTypes = [
"application/pdf",
"image/jpeg",
"image/jpg",
"image/png",
"image/webp",
];

const lowerName =
file.name
.toLowerCase();

const allowedByName =
lowerName.endsWith(".pdf") ||
lowerName.endsWith(".jpg") ||
lowerName.endsWith(".jpeg") ||
lowerName.endsWith(".png") ||
lowerName.endsWith(".webp");

if (
!allowedTypes.includes(
file.type
) &&
!allowedByName
) {
return `${file.name}: only PDF, JPG, JPEG, PNG or WEBP files are allowed.`;
}

if (
file.size >
10 *
1024 *
1024
) {
return `${file.name}: file size must be below 10 MB.`;
}

return "";
}

function addOptionalFiles(
event:
ChangeEvent<HTMLInputElement>,
type:
PolicyDocumentType
) {
setError("");

const selected =
Array.from(
event.target.files ||
[]
);

if (
selected.length ===
0
) {
return;
}

for (
const file of selected
) {
const validationError =
validateOptionalDocumentFile(
file
);

if (
validationError
) {
setError(
validationError
);

event.target.value =
"";

return;
}
}

const addUniqueFiles = (
current: File[]
) => {
const map =
new Map<
string,
File
>();

for (
const file of current
) {
map.set(
`${file.name}-${file.size}-${file.lastModified}`,
file
);
}

for (
const file of selected
) {
map.set(
`${file.name}-${file.size}-${file.lastModified}`,
file
);
}

return Array.from(
map.values()
).slice(
0,
20
);
};

if (
type ===
"OLD_POLICY"
) {
setOldPolicyFiles(
previous =>
addUniqueFiles(
previous
)
);
} else {
setOtherDocumentFiles(
previous =>
addUniqueFiles(
previous
)
);
}

event.target.value =
"";
}

function removeOptionalFile(
type:
PolicyDocumentType,
index: number
) {
if (
type ===
"OLD_POLICY"
) {
setOldPolicyFiles(
previous =>
previous.filter(
(
_,
fileIndex
) =>
fileIndex !==
index
)
);

return;
}

setOtherDocumentFiles(
previous =>
previous.filter(
(
_,
fileIndex
) =>
fileIndex !==
index
)
);
}

async function uploadOptionalDocument(
file: File,
type:
PolicyDocumentType
): Promise<UploadedPolicyDocument> {
const formData =
new FormData();

formData.append(
"file",
file
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
await response
.json()
.catch(
() => ({})
);

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
`Unable to upload ${file.name}.`
);
}

const fileUrl =
String(
data.fileUrl ||
data.url ||
""
).trim();

if (
!fileUrl
) {
throw new Error(
`${file.name} uploaded but file URL was not returned.`
);
}

return {
type,
fileName:
String(
data.fileName ||
file.name
),
fileUrl,
fileType:
data.fileType ||
null,
};
}

async function uploadOptionalDocuments(): Promise<
UploadedPolicyDocument[]
> {
const queue = [
...oldPolicyFiles.map(
file => ({
file,
type:
"OLD_POLICY" as const,
})
),
...otherDocumentFiles.map(
file => ({
file,
type:
"OTHER" as const,
})
),
];

if (
queue.length ===
0
) {
return [];
}

try {
setUploadingDocuments(
true
);

const uploaded:
UploadedPolicyDocument[] =
[];

for (
const item of queue
) {
uploaded.push(
await uploadOptionalDocument(
item.file,
item.type
)
);
}

return uploaded;
} finally {
setUploadingDocuments(
false
);
}
}

function openSelectedFile(
file: File
) {
const url =
URL.createObjectURL(
file
);

window.open(
url,
"_blank",
"noopener,noreferrer"
);

window.setTimeout(
() => {
URL.revokeObjectURL(
url
);
},
60000
);
}

function downloadSelectedFile(
file: File
) {
const url =
URL.createObjectURL(
file
);

const anchor =
document.createElement(
"a"
);

anchor.href =
url;

anchor.download =
file.name;

document.body.appendChild(
anchor
);

anchor.click();

anchor.remove();

window.setTimeout(
() => {
URL.revokeObjectURL(
url
);
},
1000
);
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
uploadingPdf ||
uploadingDocuments
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

const uploadedDocuments =
await uploadOptionalDocuments();

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

documents:
uploadedDocuments,

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


{/* DOCUMENT INTAKE / LOCAL AUTO FILL */}

<section className={sectionClass}>

<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

<div className="flex items-start gap-3">

<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-xl">
✨
</div>

<div>
<h2 className="text-lg font-black text-slate-900">
Document Intake & Auto Fill
</h2>

<p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
Optional helper. Upload one or more documents, read them together, review the detected values, then choose what to apply.
</p>
</div>

</div>

<button
type="button"
onClick={clearDocumentIntake}
className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50"
>
Clear Intake
</button>

</div>

<div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
✍️ <span className="font-black">Manual entry always remains available.</span> You can skip this entire section, or apply detected values and then edit any normal field manually before saving.
</div>

<div className="mt-5 grid gap-4 md:grid-cols-2">

<DocumentIntakeCard
inputKey={`current-${intakeInputVersion}`}
icon="📄"
title="Current Policy"
description="Current issued policy PDF or image. Best source for policy number, insurer, premium, IDV, dates and cover type."
file={intakeFiles.CURRENT_POLICY}
onChange={event =>
handleIntakeFileChange(
"CURRENT_POLICY",
event
)
}
onRemove={() =>
removeIntakeFile(
"CURRENT_POLICY"
)
}
/>

<DocumentIntakeCard
inputKey={`rc-${intakeInputVersion}`}
icon="🚗"
title="RC Book / RC Card"
description="Best source for registration number, make, model, year, engine, chassis, fuel and vehicle class."
file={intakeFiles.RC}
onChange={event =>
handleIntakeFileChange(
"RC",
event
)
}
onRemove={() =>
removeIntakeFile(
"RC"
)
}
/>

<DocumentIntakeCard
inputKey={`old-${intakeInputVersion}`}
icon="🗂️"
title="Old Policy"
description="Optional. Reads previous insurer, policy number, expiry, old IDV / sum insured and NCB when available."
file={intakeFiles.OLD_POLICY}
onChange={event =>
handleIntakeFileChange(
"OLD_POLICY",
event
)
}
onRemove={() =>
removeIntakeFile(
"OLD_POLICY"
)
}
/>

<DocumentIntakeCard
inputKey={`aadhaar-${intakeInputVersion}`}
icon="🪪"
title="Aadhaar / KYC"
description="Optional identity check. The reader returns only useful KYC fields and the last 4 Aadhaar digits, never the full Aadhaar number."
file={intakeFiles.AADHAAR}
onChange={event =>
handleIntakeFileChange(
"AADHAAR",
event
)
}
onRemove={() =>
removeIntakeFile(
"AADHAAR"
)
}
/>

</div>

<div className="mt-5 flex flex-col gap-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">

<div>
<p className="text-sm font-black text-slate-900">
{
Object.values(
intakeFiles
).filter(Boolean).length
} document(s) selected
</p>
<p className="mt-1 text-xs font-semibold text-slate-500">
Documents are read locally by the Agents India document reader.
</p>
</div>

<button
type="button"
onClick={readAllIntakeDocuments}
disabled={
intakeReading ||
Object.values(
intakeFiles
).every(
file => !file
)
}
className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
>
{intakeReading
? "Reading Documents..."
: "✨ Read All Documents"}
</button>

</div>

{intakeStatus && (
<div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
{intakeStatus}
</div>
)}

{intakeResults.length > 0 && (
<div className="mt-5 grid gap-3 sm:grid-cols-2">
{intakeResults.map(
item => (
<div
key={`${item.kind}-${item.fileName}`}
className={`rounded-2xl border p-4 ${
item.error
? "border-red-200 bg-red-50"
: "border-emerald-200 bg-emerald-50"
}`}
>
<p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
{INTAKE_LABELS[item.kind]}
</p>
<p className="mt-1 truncate text-sm font-black text-slate-900">
{item.fileName}
</p>

{item.error ? (
<p className="mt-2 text-xs font-bold text-red-700">
⚠️ {item.error}
</p>
) : (
<>
<p className="mt-2 text-xs font-bold text-emerald-700">
✓ Read successfully
</p>
{typeof item.result?.confidence === "number" && (
<p className="mt-1 text-xs font-semibold text-slate-500">
Reader confidence: {Math.round(item.result.confidence * 100)}%
</p>
)}
</>
)}
</div>
)
)}
</div>
)}

{reviewItems.length > 0 && (
<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">

<div className="border-b border-slate-200 bg-slate-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
<div>
<p className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">
Review Before Applying
</p>
<h3 className="mt-1 font-black text-slate-900">
Confirm or edit detected values
</h3>
<p className="mt-1 text-xs font-semibold text-slate-500">
Only checked rows are copied into the policy form. Reference-only rows remain visible for checking.
</p>
</div>

<div className="mt-3 flex gap-2 sm:mt-0">
<button
type="button"
onClick={() =>
setAllReviewSelections(true)
}
className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-blue-700"
>
Select All
</button>
<button
type="button"
onClick={() =>
setAllReviewSelections(false)
}
className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
>
Deselect
</button>
</div>
</div>

<div className="divide-y divide-slate-100">
{reviewItems.map(
item => (
<div
key={item.id}
className="grid gap-3 p-4 lg:grid-cols-[36px_180px_minmax(220px,1fr)_170px] lg:items-start"
>
<div className="pt-2">
{item.applyable ? (
<input
type="checkbox"
checked={item.selected}
onChange={() =>
toggleReviewItem(
item.id
)
}
className="h-5 w-5 rounded border-slate-300"
/>
) : (
<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">
👁
</span>
)}
</div>

<div>
<p className="text-xs font-black text-slate-700">
{item.label}
</p>
<p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
{item.applyable
? "Can apply"
: "Reference only"}
</p>
</div>

<div>
<input
value={item.value}
onChange={event =>
updateReviewValue(
item.id,
event.target.value
)
}
readOnly={!item.applyable}
className={`w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none ${
item.applyable
? "border-slate-300 bg-white focus:border-blue-500"
: "border-slate-200 bg-slate-50 text-slate-600"
}`}
/>

{item.alternatives &&
item.alternatives.length > 0 && (
<div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] font-semibold text-amber-800">
Different value also found: {item.alternatives.map(
alternative =>
`${alternative.value} (${alternative.source})`
).join(" • ")}
</div>
)}
</div>

<div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
Source: {item.source}
</div>
</div>
)
)}
</div>

<div className="border-t border-slate-200 bg-slate-50 p-4">
<button
type="button"
onClick={applySelectedReviewValues}
className="w-full rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-emerald-700 sm:w-auto"
>
✓ Apply Selected Values & Attach Documents
</button>

<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
Nothing is saved yet. After applying, scroll through the normal manual form, make any corrections you want, and use the existing Save Policy button at the bottom.
</p>
</div>

</div>
)}

<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">
🔐 Aadhaar privacy: this reader does not return the full Aadhaar number to the browser. It uses KYC details for confirmation and exposes only the last four digits when readable.
</div>

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

{/* OPTIONAL MULTIPLE DOCUMENTS */}

<section className={sectionClass}>

<h2 className="text-lg font-black text-slate-900">
🗂️ Additional Documents
</h2>

<p className="mt-1 text-xs font-semibold text-slate-500">
All documents below are optional. You can select multiple PDF or image files.
</p>

<div className="mt-6 space-y-6">

<div>
<div className="flex items-center justify-between gap-3">
<div>
<h3 className="font-black text-slate-900">
Old Policy Copy
</h3>
<p className="mt-1 text-xs text-slate-500">
Optional • Multiple files allowed
</p>
</div>

{oldPolicyFiles.length > 0 && (
<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
{oldPolicyFiles.length} selected
</span>
)}
</div>

<label className="mt-3 block cursor-pointer rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
<input
type="file"
multiple
accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
onChange={event =>
addOptionalFiles(
event,
"OLD_POLICY"
)
}
className="hidden"
/>

<div className="text-2xl">
📎
</div>

<p className="mt-2 font-bold text-slate-800">
Choose Old Policy Copies
</p>

<p className="mt-1 text-xs text-slate-500">
PDF / JPG / JPEG / PNG / WEBP • Max 10 MB each
</p>
</label>

{oldPolicyFiles.length > 0 && (
<div className="mt-3 space-y-2">
{oldPolicyFiles.map(
(
file,
index
) => (
<div
key={`${file.name}-${file.size}-${file.lastModified}`}
className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
>
<div className="min-w-0">
<p className="truncate text-sm font-bold text-slate-800">
📄 {file.name}
</p>
<p className="mt-1 text-xs text-slate-500">
{(
file.size /
1024 /
1024
).toFixed(
2
)} MB
</p>
</div>

<div className="flex shrink-0 flex-wrap gap-2">
<button
type="button"
onClick={() =>
openSelectedFile(
file
)
}
className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white"
>
👁 View
</button>

<button
type="button"
onClick={() =>
downloadSelectedFile(
file
)
}
className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
>
⬇ Download
</button>

<button
type="button"
onClick={() =>
removeOptionalFile(
"OLD_POLICY",
index
)
}
className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600"
>
Remove
</button>
</div>
</div>
)
)}
</div>
)}
</div>

<div className="border-t border-slate-200 pt-6">
<div className="flex items-center justify-between gap-3">
<div>
<h3 className="font-black text-slate-900">
Other Documents
</h3>
<p className="mt-1 text-xs text-slate-500">
RC, ID proof, proposal, medical report or any supporting document • Optional
</p>
</div>

{otherDocumentFiles.length > 0 && (
<span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
{otherDocumentFiles.length} selected
</span>
)}
</div>

<label className="mt-3 block cursor-pointer rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-5 text-center transition hover:border-violet-400 hover:bg-violet-50">
<input
type="file"
multiple
accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
onChange={event =>
addOptionalFiles(
event,
"OTHER"
)
}
className="hidden"
/>

<div className="text-2xl">
📚
</div>

<p className="mt-2 font-bold text-slate-800">
Choose Other Documents
</p>

<p className="mt-1 text-xs text-slate-500">
Multiple files • Maximum 10 MB each
</p>
</label>

{otherDocumentFiles.length > 0 && (
<div className="mt-3 space-y-2">
{otherDocumentFiles.map(
(
file,
index
) => (
<div
key={`${file.name}-${file.size}-${file.lastModified}`}
className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
>
<div className="min-w-0">
<p className="truncate text-sm font-bold text-slate-800">
📄 {file.name}
</p>
<p className="mt-1 text-xs text-slate-500">
{(
file.size /
1024 /
1024
).toFixed(
2
)} MB
</p>
</div>

<div className="flex shrink-0 flex-wrap gap-2">
<button
type="button"
onClick={() =>
openSelectedFile(
file
)
}
className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white"
>
👁 View
</button>

<button
type="button"
onClick={() =>
downloadSelectedFile(
file
)
}
className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
>
⬇ Download
</button>

<button
type="button"
onClick={() =>
removeOptionalFile(
"OTHER",
index
)
}
className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600"
>
Remove
</button>
</div>
</div>
)
)}
</div>
)}
</div>

</div>

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
uploadingDocuments ||
loadingPreviousPolicy ||
loadingSelectedCustomer ||
loadingCompanies
}
className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-8 py-3.5 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
>
{uploadingPdf
? "Uploading Policy PDF..."
: uploadingDocuments
? "Uploading Documents..."
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


function DocumentIntakeCard({
inputKey,
icon,
title,
description,
file,
onChange,
onRemove,
}: {
inputKey: string;
icon: string;
title: string;
description: string;
file: File | null;
onChange: (
event: ChangeEvent<HTMLInputElement>
) => void;
onRemove: () => void;
}) {
return (
<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
<div className="flex items-start gap-3">
<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
{icon}
</div>
<div className="min-w-0 flex-1">
<p className="font-black text-slate-900">
{title}
</p>
<p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
{description}
</p>
</div>
</div>

<label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center transition hover:border-blue-300 hover:bg-blue-50">
<input
key={inputKey}
type="file"
accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
onChange={onChange}
className="hidden"
/>
<p className="text-sm font-black text-blue-700">
{file
? "Change Document"
: "Choose Document"}
</p>
<p className="mt-1 text-[11px] font-semibold text-slate-500">
PDF / JPG / JPEG / PNG / WEBP
</p>
</label>

{file && (
<div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
<div className="min-w-0">
<p className="truncate text-xs font-black text-slate-800">
📎 {file.name}
</p>
<p className="mt-1 text-[10px] font-semibold text-slate-500">
{(
file.size /
1024 /
1024
).toFixed(2)} MB
</p>
</div>
<button
type="button"
onClick={onRemove}
className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-red-600"
>
Remove
</button>
</div>
)}
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