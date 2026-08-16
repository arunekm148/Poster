"use client";

import {
ChangeEvent,
useEffect,
useMemo,
useState,
} from "react";

import Link from "next/link";

import * as XLSX from "xlsx";

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type Customer = {
id: string;

customerId?: string | null;

name: string;

phone?: string | null;

email?: string | null;

sourceType?: string | null;

subAgentId?: string | null;

isActive?: boolean;

subAgent?: {
id?: string;

code?: string | null;

name?: string | null;
} | null;
};

type SubAgent = {
id: string;

code?: string | null;

name: string;

phone?: string | null;

email?: string | null;

isActive?: boolean;
};

type ImportRow = {
rowNumber: number;

serialNumber: string;

customerName: string;

mobile: string;

email: string;

/*
|--------------------------------------------------------------------------
| MANDATORY OWNER / SOURCE
|--------------------------------------------------------------------------
|
| SELF
|
| OR
|
| Sub-Agent Code / Name
|
*/

subAgentValue: string;

customerSource:
| "SELF"
| "SUB_AGENT";

resolvedSubAgentId:
| string
| null;

resolvedSubAgentCode:
| string
| null;

resolvedSubAgentName:
| string
| null;

businessType: string;

enquiryDate: string;

nextFollowUpDate: string;

requirement: string;

remarks: string;

leadSource: string;

campaign: string;

validationError?: string;
};

type ImportResult = {
rowNumber: number;

serialNumber: string;

customerName: string;

mobile: string;

success: boolean;

customerAction:
| "EXISTING"
| "CREATED"
| "NONE";

message: string;
};

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
// Ignore invalid local storage.
}
}

return "";
}

/* -------------------------------------------------------------------------- */
/* TODAY */
/* -------------------------------------------------------------------------- */

function todayForInput() {
const now =
new Date();

return [
now.getFullYear(),

String(
now.getMonth() + 1
).padStart(
2,
"0"
),

String(
now.getDate()
).padStart(
2,
"0"
),
].join("-");
}

/* -------------------------------------------------------------------------- */
/* NORMALIZE DATE */
/* -------------------------------------------------------------------------- */

function normalizeDate(
value: unknown
) {
if (
value === null ||
value === undefined ||
value === ""
) {
return "";
}

/*
|--------------------------------------------------------------------------
| EXCEL SERIAL DATE
|--------------------------------------------------------------------------
*/

if (
typeof value ===
"number"
) {
const parsed =
XLSX.SSF.parse_date_code(
value
);

if (parsed) {
return `${parsed.y}-${String(
parsed.m
).padStart(
2,
"0"
)}-${String(
parsed.d
).padStart(
2,
"0"
)}`;
}
}

const text =
String(
value
).trim();

if (!text) {
return "";
}

/*
|--------------------------------------------------------------------------
| YYYY-MM-DD
|--------------------------------------------------------------------------
*/

if (
/^\d{4}-\d{2}-\d{2}$/.test(
text
)
) {
return text;
}

/*
|--------------------------------------------------------------------------
| DD-MM-YYYY / DD/MM/YYYY
|--------------------------------------------------------------------------
*/

const match =
text.match(
/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/
);

if (match) {
const day =
String(
match[1]
).padStart(
2,
"0"
);

const month =
String(
match[2]
).padStart(
2,
"0"
);

return `${match[3]}-${month}-${day}`;
}

const date =
new Date(
text
);

if (
Number.isNaN(
date.getTime()
)
) {
return "";
}

return `${date.getFullYear()}-${String(
date.getMonth() + 1
).padStart(
2,
"0"
)}-${String(
date.getDate()
).padStart(
2,
"0"
)}`;
}

/* -------------------------------------------------------------------------- */
/* CLEAN MOBILE */
/* -------------------------------------------------------------------------- */

function cleanMobile(
value: unknown
) {
const digits =
String(
value || ""
).replace(
/\D/g,
""
);

return digits.slice(
-10
);
}

/* -------------------------------------------------------------------------- */
/* NORMALIZE TEXT */
/* -------------------------------------------------------------------------- */

function normalizeText(
value: unknown
) {
return String(
value || ""
)
.trim()
.toLowerCase()
.replace(
/\s+/g,
" "
);
}

/* -------------------------------------------------------------------------- */
/* READ EXCEL CELL */
/* -------------------------------------------------------------------------- */

function readCell(
row: Record<
string,
unknown
>,
names: string[]
) {
const keys =
Object.keys(
row
);

for (
const wanted of names
) {
const found =
keys.find(
(
key
) =>
key
.trim()
.toLowerCase() ===
wanted
.trim()
.toLowerCase()
);

if (found) {
return row[
found
];
}
}

return "";
}

/* -------------------------------------------------------------------------- */
/* FIND SUB AGENT FROM VALUE */
/* -------------------------------------------------------------------------- */

function resolveSubAgent(
value: string,
subAgents: SubAgent[]
) {
const clean =
value
.trim();

if (!clean) {
return null;
}

const normalized =
normalizeText(
clean
);

/*
|--------------------------------------------------------------------------
| SELF BUSINESS
|--------------------------------------------------------------------------
*/

const selfValues = [
"self",
"own",
"own business",
"direct",
"self / own business",
"self/own business",
"self customer",
];

if (
selfValues.includes(
normalized
)
) {
return {
type:
"SELF" as const,

subAgent:
null,
};
}

/*
|--------------------------------------------------------------------------
| EXACT SUB-AGENT CODE
|--------------------------------------------------------------------------
*/

const exactCode =
subAgents.find(
(
item
) =>
normalizeText(
item.code
) ===
normalized
);

if (
exactCode
) {
return {
type:
"SUB_AGENT" as const,

subAgent:
exactCode,
};
}

/*
|--------------------------------------------------------------------------
| EXACT SUB-AGENT NAME
|--------------------------------------------------------------------------
*/

const exactName =
subAgents.find(
(
item
) =>
normalizeText(
item.name
) ===
normalized
);

if (
exactName
) {
return {
type:
"SUB_AGENT" as const,

subAgent:
exactName,
};
}

/*
|--------------------------------------------------------------------------
| CODE - NAME FORMAT
|--------------------------------------------------------------------------
|
| Example:
|
| SA-0003 - SIB KOTHAMANGALAM
|
*/

const combined =
subAgents.find(
(
item
) => {
const code =
normalizeText(
item.code
);

const name =
normalizeText(
item.name
);

if (
!code ||
!name
) {
return false;
}

return (
normalized ===
`${code} - ${name}` ||
normalized ===
`${code} ${name}` ||
normalized.includes(
code
)
);
}
);

if (
combined
) {
return {
type:
"SUB_AGENT" as const,

subAgent:
combined,
};
}

return null;
}

/* -------------------------------------------------------------------------- */
/* NORMALIZE IMPORT ROW */
/* -------------------------------------------------------------------------- */

function normalizeImportRow(
row: Record<
string,
unknown
>,
index: number,
subAgents: SubAgent[]
): ImportRow {
/*
|--------------------------------------------------------------------------
| SI NUMBER
|--------------------------------------------------------------------------
*/

const serialNumber =
String(
readCell(
row,
[
"SI No",
"SI NO",
"Sl No",
"SL No",
"Serial No",
"Serial Number",
"S.No",
"No",
]
) || ""
).trim();

/*
|--------------------------------------------------------------------------
| CUSTOMER NAME
|--------------------------------------------------------------------------
*/

const customerName =
String(
readCell(
row,
[
"Customer Name",
"Name",
"Customer",
]
) || ""
).trim();

/*
|--------------------------------------------------------------------------
| MOBILE
|--------------------------------------------------------------------------
*/

const mobile =
cleanMobile(
readCell(
row,
[
"Mobile",
"Phone",
"Mobile Number",
"Phone Number",
]
)
);

/*
|--------------------------------------------------------------------------
| EMAIL
|--------------------------------------------------------------------------
*/

const email =
String(
readCell(
row,
[
"Email",
"Email Address",
]
) || ""
)
.trim()
.toLowerCase();

/*
|--------------------------------------------------------------------------
| SUB AGENT - MANDATORY
|--------------------------------------------------------------------------
|
| SELF
|
| OR
|
| SA-0003
|
| OR
|
| SA-0003 - SIB KOTHAMANGALAM
|
| OR exact Sub-Agent name.
|
*/

let subAgentValue =
String(
readCell(
row,
[
"Sub Agent",
"Sub-Agent",
"Agent",
"Sub Agent Code",
"Sub-Agent Code",
"SubAgent Code",
"Customer Source",
"Source Type",
]
) || ""
).trim();

/*
|--------------------------------------------------------------------------
| SUPPORT OLD FORMAT
|--------------------------------------------------------------------------
|
| If old sheet contains:
|
| Customer Source = SUB_AGENT
| Sub Agent Code = SA-0003
|
*/

const oldSource =
String(
readCell(
row,
[
"Customer Source",
"Source Type",
]
) || ""
)
.trim()
.toUpperCase()
.replace(
/[\s-]+/g,
"_"
);

const oldSubAgentCode =
String(
readCell(
row,
[
"Sub Agent Code",
"Sub-Agent Code",
"SubAgent Code",
]
) || ""
).trim();

if (
(
oldSource ===
"SUB_AGENT" ||
oldSource ===
"SUBAGENT"
) &&
oldSubAgentCode
) {
subAgentValue =
oldSubAgentCode;
}

if (
(
oldSource ===
"SELF" ||
oldSource ===
"DIRECT" ||
oldSource ===
"SELF_DIRECT"
) &&
!subAgentValue
) {
subAgentValue =
"SELF";
}

/*
|--------------------------------------------------------------------------
| RESOLVE SOURCE
|--------------------------------------------------------------------------
*/

const resolved =
resolveSubAgent(
subAgentValue,
subAgents
);

let customerSource:
| "SELF"
| "SUB_AGENT" =
"SELF";

let resolvedSubAgentId:
| string
| null =
null;

let resolvedSubAgentCode:
| string
| null =
null;

let resolvedSubAgentName:
| string
| null =
null;

if (
resolved?.type ===
"SUB_AGENT"
) {
customerSource =
"SUB_AGENT";

resolvedSubAgentId =
resolved.subAgent
?.id ||
null;

resolvedSubAgentCode =
resolved.subAgent
?.code ||
null;

resolvedSubAgentName =
resolved.subAgent
?.name ||
null;
}

/*
|--------------------------------------------------------------------------
| BUSINESS TYPE
|--------------------------------------------------------------------------
|
| OPTIONAL
|
| BLANK = OTHER
|
*/

let businessType =
String(
readCell(
row,
[
"Business Type",
"Insurance Type",
"Product Type",
]
) || ""
)
.trim()
.toUpperCase();

if (
!businessType
) {
businessType =
"OTHER";
}

/*
|--------------------------------------------------------------------------
| ENQUIRY DATE
|--------------------------------------------------------------------------
*/

const enquiryDate =
normalizeDate(
readCell(
row,
[
"Enquiry Date",
"Lead Date",
"Date",
]
)
) ||
todayForInput();

/*
|--------------------------------------------------------------------------
| NEXT FOLLOW-UP
|--------------------------------------------------------------------------
*/

const nextFollowUpDate =
normalizeDate(
readCell(
row,
[
"Next Follow-up Date",
"Next Follow Up Date",
"Follow-up Date",
]
)
);

/*
|--------------------------------------------------------------------------
| REQUIREMENT
|--------------------------------------------------------------------------
*/

const requirement =
String(
readCell(
row,
[
"Requirement",
"Customer Requirement",
]
) || ""
).trim();

/*
|--------------------------------------------------------------------------
| REMARKS
|--------------------------------------------------------------------------
*/

const remarks =
String(
readCell(
row,
[
"Remarks",
"Notes",
"Comment",
]
) || ""
).trim();

/*
|--------------------------------------------------------------------------
| LEAD SOURCE
|--------------------------------------------------------------------------
*/

const leadSource =
String(
readCell(
row,
[
"Lead Source",
"Marketing Source",
]
) || ""
).trim();

/*
|--------------------------------------------------------------------------
| CAMPAIGN
|--------------------------------------------------------------------------
*/

const campaign =
String(
readCell(
row,
[
"Campaign",
"Campaign Name",
]
) || ""
).trim();

/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

let validationError =
"";

if (
!serialNumber
) {
validationError =
"SI No is required.";
} else if (
!customerName
) {
validationError =
"Customer Name is required.";
} else if (
!/^[6-9]\d{9}$/.test(
mobile
)
) {
validationError =
"Valid 10 digit Indian mobile number is required.";
} else if (
!subAgentValue
) {
validationError =
"Sub Agent is required. Enter SELF for own/direct business or select a Sub-Agent.";
} else if (
!resolved
) {
validationError =
`Sub Agent "${subAgentValue}" was not found. Use SELF or a valid Sub-Agent code/name.`;
} else if (
resolved.type ===
"SUB_AGENT" &&
resolved.subAgent
?.isActive ===
false
) {
validationError =
`Sub-Agent ${resolved.subAgent.code || resolved.subAgent.name} is inactive.`;
} else if (
![
"HEALTH",
"MOTOR",
"LIFE",
"OTHER",
].includes(
businessType
)
) {
validationError =
"Business Type must be HEALTH, MOTOR, LIFE or OTHER. Leave blank to use OTHER.";
} else if (
email &&
!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
email
)
) {
validationError =
"Email address is invalid.";
}

return {
rowNumber:
index + 2,

serialNumber,

customerName,

mobile,

email,

subAgentValue,

customerSource,

resolvedSubAgentId,

resolvedSubAgentCode,

resolvedSubAgentName,

businessType,

enquiryDate,

nextFollowUpDate,

requirement,

remarks,

leadSource,

campaign,

validationError,
};
}

/* -------------------------------------------------------------------------- */
/* PAGE */
/* -------------------------------------------------------------------------- */

export default function EnquiryImportPage() {
const [
userId,
setUserId,
] =
useState("");

const [
rows,
setRows,
] =
useState<
ImportRow[]
>([]);

const [
subAgents,
setSubAgents,
] =
useState<
SubAgent[]
>([]);

const [
fileName,
setFileName,
] =
useState("");

const [
loadingFile,
setLoadingFile,
] =
useState(
false
);

const [
importing,
setImporting,
] =
useState(
false
);

const [
loadingSubAgents,
setLoadingSubAgents,
] =
useState(
true
);

const [
error,
setError,
] =
useState("");

const [
results,
setResults,
] =
useState<
ImportResult[]
>([]);

/* ------------------------------------------------------------------------ */
/* LOAD USER */
/* ------------------------------------------------------------------------ */

useEffect(() => {
const id =
getLoggedInUserId();

if (!id) {
setError(
"Login information not found. Please login again."
);

setLoadingSubAgents(
false
);

return;
}

setUserId(
id
);

void loadSubAgents(
id
);
}, []);

/* ------------------------------------------------------------------------ */
/* LOAD SUB AGENTS */
/* ------------------------------------------------------------------------ */

async function loadSubAgents(
id: string
) {
try {
setLoadingSubAgents(
true
);

const response =
await fetch(
`/api/sub-agents?userId=${encodeURIComponent(
id
)}&activeOnly=false`,
{
cache:
"no-store",
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
"Unable to load Sub-Agents."
);
}

const list:
SubAgent[] =
Array.isArray(
data
)
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

setSubAgents(
list
);
} catch (
err
) {
console.error(
"LOAD SUB AGENTS:",
err
);

setSubAgents(
[]
);

setError(
err instanceof
Error
? err.message
: "Unable to load Sub-Agents."
);
} finally {
setLoadingSubAgents(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* COUNTS */
/* ------------------------------------------------------------------------ */

const validRows =
useMemo(
() =>
rows.filter(
(
row
) =>
!row.validationError
),
[
rows,
]
);

const invalidRows =
useMemo(
() =>
rows.filter(
(
row
) =>
Boolean(
row.validationError
)
),
[
rows,
]
);

const successfulResults =
useMemo(
() =>
results.filter(
(
result
) =>
result.success
),
[
results,
]
);

const failedResults =
useMemo(
() =>
results.filter(
(
result
) =>
!result.success
),
[
results,
]
);

const createdCustomers =
useMemo(
() =>
results.filter(
(
result
) =>
result.success &&
result.customerAction ===
"CREATED"
).length,
[
results,
]
);

const existingCustomers =
useMemo(
() =>
results.filter(
(
result
) =>
result.success &&
result.customerAction ===
"EXISTING"
).length,
[
results,
]
);

/* ------------------------------------------------------------------------ */
/* DOWNLOAD SAMPLE */
/* ------------------------------------------------------------------------ */

function downloadSample() {
/*
|--------------------------------------------------------------------------
| MAIN IMPORT SAMPLE
|--------------------------------------------------------------------------
*/

const sample = [
{
"SI No":
1,

"Customer Name":
"Manu Bhasker",

Mobile:
"9745454545",

Email:
"manu@example.com",

"Sub Agent":
"SELF",

"Business Type":
"HEALTH",

"Enquiry Date":
"14-08-2026",

"Next Follow-up Date":
"18-08-2026",

Requirement:
"Family health insurance",

Remarks:
"Interested customer",

"Lead Source":
"FACEBOOK",

Campaign:
"Health August Campaign",
},

{
"SI No":
2,

"Customer Name":
"Anil Kumar",

Mobile:
"9847000000",

Email:
"",

"Sub Agent":
subAgents[0]
?.code
? `${subAgents[0].code} - ${subAgents[0].name}`
: "SELF",

"Business Type":
"MOTOR",

"Enquiry Date":
"14-08-2026",

"Next Follow-up Date":
"16-08-2026",

Requirement:
"Private car insurance",

Remarks:
"Call after 5 PM",

"Lead Source":
"WHATSAPP",

Campaign:
"",
},
];

const worksheet =
XLSX.utils.json_to_sheet(
sample
);

worksheet[
"!cols"
] = [
{
wch:
10,
},

{
wch:
26,
},

{
wch:
16,
},

{
wch:
30,
},

{
wch:
35,
},

{
wch:
18,
},

{
wch:
18,
},

{
wch:
22,
},

{
wch:
40,
},

{
wch:
40,
},

{
wch:
20,
},

{
wch:
30,
},
];

/*
|--------------------------------------------------------------------------
| SUB AGENT REFERENCE SHEET
|--------------------------------------------------------------------------
|
| Customer data is NOT downloaded.
|
*/

const subAgentReference =
[
{
"SI No":
1,

"Sub Agent Code":
"SELF",

"Sub Agent Name":
"SELF / OWN BUSINESS",

Status:
"ACTIVE",
},

...subAgents.map(
(
subAgent,
index
) => ({
"SI No":
index + 2,

"Sub Agent Code":
subAgent.code ||
"",

"Sub Agent Name":
subAgent.name,

Mobile:
subAgent.phone ||
"",

Status:
subAgent.isActive ===
false
? "INACTIVE"
: "ACTIVE",

"Use in Import":
subAgent.code
? `${subAgent.code} - ${subAgent.name}`
: subAgent.name,
})
),
];

const subAgentSheet =
XLSX.utils.json_to_sheet(
subAgentReference
);

subAgentSheet[
"!cols"
] = [
{
wch:
10,
},

{
wch:
20,
},

{
wch:
35,
},

{
wch:
16,
},

{
wch:
14,
},

{
wch:
45,
},
];

/*
|--------------------------------------------------------------------------
| INSTRUCTIONS
|--------------------------------------------------------------------------
*/

const instructions =
[
{
Field:
"SI No",

Required:
"YES",

Instructions:
"Enter serial number 1, 2, 3, 4...",
},

{
Field:
"Customer Name",

Required:
"YES",

Instructions:
"Enter customer / lead name.",
},

{
Field:
"Mobile",

Required:
"YES",

Instructions:
"Valid 10 digit Indian mobile number.",
},

{
Field:
"Sub Agent",

Required:
"YES",

Instructions:
"Enter SELF for own/direct business. Otherwise copy Sub-Agent Code or Code - Name from Sub Agent List sheet.",
},

{
Field:
"Email",

Required:
"NO",

Instructions:
"Optional.",
},

{
Field:
"Business Type",

Required:
"NO",

Instructions:
"HEALTH / MOTOR / LIFE / OTHER. Blank automatically becomes OTHER.",
},

{
Field:
"Enquiry Date",

Required:
"NO",

Instructions:
"DD-MM-YYYY. Blank automatically uses today's date.",
},

{
Field:
"Next Follow-up Date",

Required:
"NO",

Instructions:
"DD-MM-YYYY.",
},

{
Field:
"Requirement",

Required:
"NO",

Instructions:
"Customer requirement.",
},

{
Field:
"Remarks",

Required:
"NO",

Instructions:
"Lead / discussion remarks.",
},

{
Field:
"Lead Source",

Required:
"NO",

Instructions:
"Facebook, Google, WhatsApp, Referral, Walk-in, etc.",
},

{
Field:
"Campaign",

Required:
"NO",

Instructions:
"Digital marketing campaign name.",
},
];

const instructionSheet =
XLSX.utils.json_to_sheet(
instructions
);

instructionSheet[
"!cols"
] = [
{
wch:
25,
},

{
wch:
12,
},

{
wch:
80,
},
];

/*
|--------------------------------------------------------------------------
| WORKBOOK
|--------------------------------------------------------------------------
*/

const workbook =
XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
workbook,
worksheet,
"Enquiry Import"
);

XLSX.utils.book_append_sheet(
workbook,
subAgentSheet,
"Sub Agent List"
);

XLSX.utils.book_append_sheet(
workbook,
instructionSheet,
"Instructions"
);

XLSX.writeFile(
workbook,
"enquiry-import-format.xlsx"
);
}

/* ------------------------------------------------------------------------ */
/* READ FILE */
/* ------------------------------------------------------------------------ */

async function handleFile(
event:
ChangeEvent<HTMLInputElement>
) {
const file =
event.target.files?.[0];

if (!file) {
return;
}

if (
loadingSubAgents
) {
setError(
"Please wait until Sub-Agent data finishes loading."
);

event.target.value =
"";

return;
}

try {
setLoadingFile(
true
);

setError("");

setResults([]);

setFileName(
file.name
);

const buffer =
await file.arrayBuffer();

const workbook =
XLSX.read(
buffer,
{
type:
"array",
}
);

/*
|--------------------------------------------------------------------------
| USE FIRST SHEET
|--------------------------------------------------------------------------
*/

const firstSheet =
workbook.SheetNames[0];

if (!firstSheet) {
throw new Error(
"Excel file does not contain a worksheet."
);
}

const worksheet =
workbook.Sheets[
firstSheet
];

const rawRows =
XLSX.utils.sheet_to_json<
Record<
string,
unknown
>
>(
worksheet,
{
defval:
"",
}
);

if (
rawRows.length ===
0
) {
throw new Error(
"Excel file contains no data."
);
}

const normalized =
rawRows.map(
(
row,
index
) =>
normalizeImportRow(
row,
index,
subAgents
)
);

setRows(
normalized
);
} catch (
err
) {
console.error(
"READ EXCEL ERROR:",
err
);

setRows([]);

setError(
err instanceof
Error
? err.message
: "Unable to read Excel file."
);
} finally {
setLoadingFile(
false
);

event.target.value =
"";
}
}

/* ------------------------------------------------------------------------ */
/* FIND EXISTING CUSTOMER */
/* ------------------------------------------------------------------------ */

async function findExistingCustomer(
mobile: string,
customerName: string
): Promise<
| Customer
| null
| "AMBIGUOUS"
> {
const response =
await fetch(
`/api/customers?userId=${encodeURIComponent(
userId
)}&phonePrefix=${encodeURIComponent(
mobile
)}`,
{
cache:
"no-store",
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
"Unable to check existing customer."
);
}

const customers:
Customer[] =
Array.isArray(
data.customers
)
? data.customers
: Array.isArray(
data.data
)
? data.data
: [];

/*
|--------------------------------------------------------------------------
| EXACT MOBILE
|--------------------------------------------------------------------------
*/

const exactMobile =
customers.filter(
(
customer
) =>
cleanMobile(
customer.phone
) ===
mobile
);

if (
exactMobile.length ===
0
) {
return null;
}

/*
|--------------------------------------------------------------------------
| EXACT MOBILE + EXACT NAME
|--------------------------------------------------------------------------
*/

const wantedName =
normalizeText(
customerName
);

const exactName =
exactMobile.filter(
(
customer
) =>
normalizeText(
customer.name
) ===
wantedName
);

if (
exactName.length ===
1
) {
return exactName[
0
];
}

/*
|--------------------------------------------------------------------------
| ONE MOBILE MATCH ONLY
|--------------------------------------------------------------------------
|
| If the phone belongs to one customer only, we can reuse it.
|
*/

if (
exactMobile.length ===
1
) {
return exactMobile[
0
];
}

/*
|--------------------------------------------------------------------------
| FAMILY / SHARED NUMBER
|--------------------------------------------------------------------------
*/

return "AMBIGUOUS";
}

/* ------------------------------------------------------------------------ */
/* VALIDATE EXISTING CUSTOMER SOURCE */
/* ------------------------------------------------------------------------ */

function validateExistingCustomerSource(
customer: Customer,
row: ImportRow
) {
const existingSource =
String(
customer.sourceType ||
"SELF"
).toUpperCase();

/*
|--------------------------------------------------------------------------
| SELF IMPORT
|--------------------------------------------------------------------------
*/

if (
row.customerSource ===
"SELF"
) {
/*
* We don't automatically reassign an existing
* Sub-Agent customer to SELF.
*/

if (
existingSource ===
"SUB_AGENT"
) {
throw new Error(
`Existing customer ${customer.name} belongs to a Sub-Agent. Please use the customer's existing Sub-Agent in Excel.`
);
}

return;
}

/*
|--------------------------------------------------------------------------
| SUB AGENT IMPORT
|--------------------------------------------------------------------------
*/

if (
existingSource !==
"SUB_AGENT"
) {
throw new Error(
`Existing customer ${customer.name} is currently a Self customer. Customer ownership was not changed automatically.`
);
}

if (
customer.subAgentId &&
row.resolvedSubAgentId &&
customer.subAgentId !==
row.resolvedSubAgentId
) {
throw new Error(
`Existing customer ${customer.name} belongs to a different Sub-Agent.`
);
}
}

/* ------------------------------------------------------------------------ */
/* CREATE CUSTOMER */
/* ------------------------------------------------------------------------ */

async function createCustomer(
row: ImportRow
): Promise<Customer> {
const subAgentId =
row.customerSource ===
"SUB_AGENT"
? row.resolvedSubAgentId
: null;

if (
row.customerSource ===
"SUB_AGENT" &&
!subAgentId
) {
throw new Error(
"Sub-Agent could not be resolved."
);
}

const customerNotes =
[
row.leadSource
? `Lead Source: ${row.leadSource}`
: "",

row.campaign
? `Campaign: ${row.campaign}`
: "",

`Imported from Enquiry Excel SI No: ${row.serialNumber}`,
]
.filter(
Boolean
)
.join(
"\n"
);

const response =
await fetch(
"/api/customers",
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

name:
row.customerName,

phone:
row.mobile,

email:
row.email ||
null,

dateOfBirth:
null,

gender:
null,

address:
null,

district:
null,

state:
"Kerala",

pincode:
null,

notes:
customerNotes ||
null,

sourceType:
row.customerSource,

subAgentId,

/*
* We do NOT automatically create a second
* customer when the mobile is ambiguous.
*
* The duplicate check happens before this.
*/

confirmSharedPhone:
false,
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

/*
|--------------------------------------------------------------------------
| FAMILY MOBILE RESPONSE
|--------------------------------------------------------------------------
*/

if (
data.requiresConfirmation
) {
throw new Error(
"This mobile number already belongs to another customer/family member. Please review this row manually."
);
}

if (
!response.ok ||
data.success ===
false
) {
throw new Error(
data.message ||
"Unable to create customer."
);
}

const customer =
data.customer ||
data.data;

if (
!customer?.id
) {
throw new Error(
"Customer was created but customer database ID was not returned."
);
}

return customer;
}

/* ------------------------------------------------------------------------ */
/* CREATE ENQUIRY */
/* ------------------------------------------------------------------------ */

async function createEnquiry(
row: ImportRow,
customerId: string
) {
const extraRemarks =
[
row.remarks,

row.leadSource
? `Lead Source: ${row.leadSource}`
: "",

row.campaign
? `Campaign: ${row.campaign}`
: "",

row.customerSource ===
"SUB_AGENT"
? `Sub-Agent: ${row.resolvedSubAgentCode || ""} ${row.resolvedSubAgentName || ""}`.trim()
: "Customer Source: SELF",

`Excel SI No: ${row.serialNumber}`,
]
.filter(
Boolean
)
.join(
"\n"
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
JSON.stringify({
userId,

customerId,

businessType:
row.businessType ||
"OTHER",

requirement:
row.requirement ||
null,

remarks:
extraRemarks ||
null,

enquiryDate:
row.enquiryDate,

nextFollowUpDate:
row.nextFollowUpDate ||
null,
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
"Unable to create enquiry."
);
}

return data;
}

/* ------------------------------------------------------------------------ */
/* START IMPORT */
/* ------------------------------------------------------------------------ */

async function startImport() {
if (!userId) {
setError(
"Login information not found."
);

return;
}

if (
validRows.length ===
0
) {
setError(
"There are no valid rows to import."
);

return;
}

const confirmed =
window.confirm(
`Import ${validRows.length} valid enquiry row(s)?\n\nThe system will:\n\n1. Check mobile number\n2. Check customer name\n3. Reuse matching customer\n4. Create customer if new\n5. Create enquiry automatically`
);

if (
!confirmed
) {
return;
}

setImporting(
true
);

setError("");

setResults([]);

const importResults:
ImportResult[] =
[];

for (
const row of validRows
) {
try {
/*
|--------------------------------------------------------------------------
| CHECK EXISTING CUSTOMER
|--------------------------------------------------------------------------
*/

const existing =
await findExistingCustomer(
row.mobile,
row.customerName
);

if (
existing ===
"AMBIGUOUS"
) {
throw new Error(
"More than one customer uses this mobile number and the customer name could not identify one exact customer. Please review manually."
);
}

let customer:
Customer;

let action:
| "EXISTING"
| "CREATED";

if (
existing
) {
validateExistingCustomerSource(
existing,
row
);

customer =
existing;

action =
"EXISTING";
} else {
customer =
await createCustomer(
row
);

action =
"CREATED";
}

/*
|--------------------------------------------------------------------------
| CREATE ENQUIRY
|--------------------------------------------------------------------------
*/

await createEnquiry(
row,
customer.id
);

importResults.push(
{
rowNumber:
row.rowNumber,

serialNumber:
row.serialNumber,

customerName:
row.customerName,

mobile:
row.mobile,

success:
true,

customerAction:
action,

message:
action ===
"CREATED"
? "New customer created and enquiry added."
: "Existing customer matched and enquiry added.",
}
);
} catch (
err
) {
console.error(
`IMPORT ROW ${row.rowNumber}:`,
err
);

importResults.push(
{
rowNumber:
row.rowNumber,

serialNumber:
row.serialNumber,

customerName:
row.customerName,

mobile:
row.mobile,

success:
false,

customerAction:
"NONE",

message:
err instanceof
Error
? err.message
: "Import failed.",
}
);
}

setResults(
[
...importResults,
]
);
}

setImporting(
false
);
}

/* ------------------------------------------------------------------------ */
/* DOWNLOAD VALIDATION ERROR REPORT */
/* ------------------------------------------------------------------------ */

function downloadValidationErrors() {
if (
invalidRows.length ===
0
) {
return;
}

const worksheet =
XLSX.utils.json_to_sheet(
invalidRows.map(
(
row
) => ({
"Excel Row":
row.rowNumber,

"SI No":
row.serialNumber,

"Customer Name":
row.customerName,

Mobile:
row.mobile,

"Sub Agent":
row.subAgentValue,

"Business Type":
row.businessType,

Error:
row.validationError ||
"",
})
)
);

const workbook =
XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
workbook,
worksheet,
"Validation Errors"
);

XLSX.writeFile(
workbook,
"enquiry-validation-errors.xlsx"
);
}

/* ------------------------------------------------------------------------ */
/* DOWNLOAD IMPORT ERROR REPORT */
/* ------------------------------------------------------------------------ */

function downloadErrorReport() {
const failures =
results.filter(
(
result
) =>
!result.success
);

if (
failures.length ===
0
) {
return;
}

const worksheet =
XLSX.utils.json_to_sheet(
failures.map(
(
result
) => ({
"Excel Row":
result.rowNumber,

"SI No":
result.serialNumber,

"Customer Name":
result.customerName,

Mobile:
result.mobile,

"Error Reason":
result.message,
})
)
);

const workbook =
XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
workbook,
worksheet,
"Import Errors"
);

XLSX.writeFile(
workbook,
"enquiry-import-errors.xlsx"
);
}

/* ------------------------------------------------------------------------ */
/* UI */
/* ------------------------------------------------------------------------ */

return (
<main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">

<div className="mx-auto max-w-7xl">

{/* ------------------------------------------------------------------ */}
{/* BACK */}
{/* ------------------------------------------------------------------ */}

<div className="mb-5">

<Link
href="/enquiries"
className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"
>
← Back to Enquiries
</Link>

</div>

{/* ------------------------------------------------------------------ */}
{/* HEADER */}
{/* ------------------------------------------------------------------ */}

<div className="rounded-3xl bg-gradient-to-r from-emerald-700 to-blue-700 p-6 text-white shadow-lg">

<p className="text-xs font-black uppercase tracking-wider text-emerald-100">
Digital Lead Import
</p>

<h1 className="mt-2 text-3xl font-black">
Import Enquiries from Excel
</h1>

<p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-emerald-50">
Import digital marketing leads in bulk. The system checks the mobile number and customer name first. Existing customers are reused and new customers are created automatically.
</p>

</div>

{/* ------------------------------------------------------------------ */}
{/* IMPORTANT RULES */}
{/* ------------------------------------------------------------------ */}

<div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5">

<h2 className="font-black text-amber-950">
⚠️ Mandatory Excel Fields
</h2>

<div className="mt-3 grid gap-2 text-sm font-bold text-amber-900 sm:grid-cols-2 lg:grid-cols-4">

<div className="rounded-xl bg-white p-3">
1️⃣ SI No
</div>

<div className="rounded-xl bg-white p-3">
2️⃣ Customer Name
</div>

<div className="rounded-xl bg-white p-3">
3️⃣ Mobile Number
</div>

<div className="rounded-xl bg-white p-3">
4️⃣ Sub Agent
</div>

</div>

<p className="mt-3 text-sm font-semibold text-amber-900">
For your own/direct customer enter{" "}
<strong>SELF</strong>{" "}
in the Sub Agent column. For Sub-Agent business, enter the Sub-Agent code or copy the exact value from the Sub Agent List sheet.
</p>

<p className="mt-2 text-sm font-semibold text-amber-900">
Business Type is optional. Blank Business Type automatically becomes{" "}
<strong>OTHER</strong>.
</p>

</div>

{/* ------------------------------------------------------------------ */}
{/* SUB AGENT STATUS */}
{/* ------------------------------------------------------------------ */}

<div className="mt-5 grid gap-3 sm:grid-cols-3">

<div className="rounded-2xl border bg-white p-4 shadow-sm">

<p className="text-xs font-black uppercase text-slate-500">
Available Source
</p>

<p className="mt-1 text-xl font-black text-blue-700">
SELF
</p>

</div>

<div className="rounded-2xl border bg-white p-4 shadow-sm">

<p className="text-xs font-black uppercase text-slate-500">
Sub Agents Loaded
</p>

<p className="mt-1 text-xl font-black text-violet-700">
{loadingSubAgents
? "..."
: subAgents.length}
</p>

</div>

<div className="rounded-2xl border bg-white p-4 shadow-sm">

<p className="text-xs font-black uppercase text-slate-500">
Active Sub Agents
</p>

<p className="mt-1 text-xl font-black text-emerald-700">
{
subAgents.filter(
(
item
) =>
item.isActive !==
false
).length
}
</p>

</div>

</div>

{/* ------------------------------------------------------------------ */}
{/* SAMPLE */}
{/* ------------------------------------------------------------------ */}

<div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">

<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

<div>

<h2 className="font-black">
Step 1 — Download Excel Format
</h2>

<p className="mt-1 text-sm font-semibold text-slate-500">
The Excel includes an Enquiry Import sheet, Sub Agent List and Instructions. Customer data is not downloaded.
</p>

</div>

<button
type="button"
onClick={
downloadSample
}
disabled={
loadingSubAgents
}
className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
>
{loadingSubAgents
? "Loading Sub Agents..."
: "⬇ Download Excel Format"}
</button>

</div>

</div>

{/* ------------------------------------------------------------------ */}
{/* UPLOAD */}
{/* ------------------------------------------------------------------ */}

<div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">

<h2 className="font-black">
Step 2 — Select Excel File
</h2>

<p className="mt-1 text-sm font-semibold text-slate-500">
Supported file types: .xlsx, .xls and .csv
</p>

<input
type="file"
accept=".xlsx,.xls,.csv"
disabled={
importing ||
loadingSubAgents
}
onChange={
handleFile
}
className="mt-4 block w-full rounded-xl border border-slate-300 bg-white p-3 font-semibold"
/>

{loadingFile && (
<p className="mt-3 font-bold text-blue-700">
Reading Excel file...
</p>
)}

{fileName &&
!loadingFile && (
<p className="mt-3 text-sm font-bold text-slate-700">
📄 Selected:{" "}
{fileName}
</p>
)}

</div>

{/* ------------------------------------------------------------------ */}
{/* ERROR */}
{/* ------------------------------------------------------------------ */}

{error && (
<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">
⚠️ {error}
</div>
)}

{/* ------------------------------------------------------------------ */}
{/* COUNTS */}
{/* ------------------------------------------------------------------ */}

{rows.length >
0 && (
<div className="mt-5 grid grid-cols-3 gap-3">

<div className="rounded-2xl border bg-white p-4 shadow-sm">

<p className="text-xs font-bold text-slate-500">
Total Rows
</p>

<p className="mt-1 text-3xl font-black">
{
rows.length
}
</p>

</div>

<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">

<p className="text-xs font-bold text-emerald-700">
Valid
</p>

<p className="mt-1 text-3xl font-black text-emerald-800">
{
validRows.length
}
</p>

</div>

<div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">

<p className="text-xs font-bold text-red-700">
Errors
</p>

<p className="mt-1 text-3xl font-black text-red-800">
{
invalidRows.length
}
</p>

</div>

</div>
)}

{/* ------------------------------------------------------------------ */}
{/* VALIDATION ERROR DOWNLOAD */}
{/* ------------------------------------------------------------------ */}

{invalidRows.length >
0 && (
<div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">

<div>

<p className="font-black text-red-900">
⚠️ {
invalidRows.length
} Excel row(s) need correction
</p>

<p className="mt-1 text-sm font-semibold text-red-700">
You can still import valid rows or download the validation error report.
</p>

</div>

<button
type="button"
onClick={
downloadValidationErrors
}
className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white"
>
⬇ Validation Errors
</button>

</div>
)}

{/* ------------------------------------------------------------------ */}
{/* PREVIEW */}
{/* ------------------------------------------------------------------ */}

{rows.length >
0 && (
<div className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">

<div className="border-b p-5">

<h2 className="font-black">
Step 3 — Preview & Validate
</h2>

<p className="mt-1 text-sm font-semibold text-slate-500">
Check customer name, mobile and ownership before importing.
</p>

</div>

<div className="overflow-x-auto">

<table className="min-w-full text-left text-sm">

<thead className="bg-slate-100 text-xs font-black uppercase text-slate-600">

<tr>

<th className="px-4 py-3">
Excel Row
</th>

<th className="px-4 py-3">
SI No
</th>

<th className="px-4 py-3">
Customer
</th>

<th className="px-4 py-3">
Mobile
</th>

<th className="px-4 py-3">
Sub Agent
</th>

<th className="px-4 py-3">
Business
</th>

<th className="px-4 py-3">
Status
</th>

</tr>

</thead>

<tbody className="divide-y">

{rows.map(
(
row
) => (
<tr
key={
row.rowNumber
}
className={
row.validationError
? "bg-red-50"
: ""
}
>

<td className="px-4 py-3 font-bold text-slate-500">
{
row.rowNumber
}
</td>

<td className="px-4 py-3 font-black text-blue-800">
{
row.serialNumber ||
"-"
}
</td>

<td className="px-4 py-3">

<p className="font-black">
{
row.customerName ||
"-"
}
</p>

{row.email && (
<p className="mt-1 text-xs text-slate-500">
{
row.email
}
</p>
)}

</td>

<td className="px-4 py-3 font-semibold">
{
row.mobile ||
"-"
}
</td>

<td className="px-4 py-3">

{row.customerSource ===
"SUB_AGENT" ? (
<div>

<span className="rounded-lg bg-violet-100 px-2 py-1 text-xs font-black text-violet-800">
🤝 Sub Agent
</span>

<p className="mt-2 font-black text-slate-900">
{row.resolvedSubAgentCode ||
row.subAgentValue}
</p>

{row.resolvedSubAgentName && (
<p className="mt-1 text-xs font-semibold text-slate-500">
{
row.resolvedSubAgentName
}
</p>
)}

</div>
) : (
<span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-black text-blue-800">
👤 SELF
</span>
)}

</td>

<td className="px-4 py-3 font-bold">
{
row.businessType ||
"OTHER"
}
</td>

<td className="px-4 py-3">

{row.validationError ? (
<div className="max-w-sm">

<span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-black text-red-800">
Error
</span>

<p className="mt-2 text-xs font-semibold leading-5 text-red-700">
{
row.validationError
}
</p>

</div>
) : (
<span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">
✓ Ready
</span>
)}

</td>

</tr>
)
)}

</tbody>

</table>

</div>

<div className="border-t bg-slate-50 p-5">

<button
type="button"
onClick={() =>
void startImport()
}
disabled={
importing ||
validRows.length ===
0
}
className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
>
{importing
? `Importing... ${results.length}/${validRows.length}`
: `Import ${validRows.length} Valid Enquiries`}
</button>

</div>

</div>
)}

{/* ------------------------------------------------------------------ */}
{/* RESULTS */}
{/* ------------------------------------------------------------------ */}

{results.length >
0 && (
<div className="mt-6">

<div className="grid grid-cols-2 gap-3 md:grid-cols-4">

<div className="rounded-2xl border bg-white p-4">

<p className="text-xs font-bold text-slate-500">
Processed
</p>

<p className="mt-1 text-3xl font-black">
{
results.length
}
</p>

</div>

<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

<p className="text-xs font-bold text-emerald-700">
Enquiries Created
</p>

<p className="mt-1 text-3xl font-black text-emerald-800">
{
successfulResults.length
}
</p>

</div>

<div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">

<p className="text-xs font-bold text-blue-700">
New Customers
</p>

<p className="mt-1 text-3xl font-black text-blue-800">
{
createdCustomers
}
</p>

</div>

<div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">

<p className="text-xs font-bold text-violet-700">
Existing Customers
</p>

<p className="mt-1 text-3xl font-black text-violet-800">
{
existingCustomers
}
</p>

</div>

</div>

{/* -------------------------------------------------------------- */}
{/* FAILED */}
{/* -------------------------------------------------------------- */}

{failedResults.length >
0 && (
<div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">

<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

<div>

<p className="font-black text-red-900">
⚠️{" "}
{
failedResults.length
}{" "}
row(s) failed
</p>

<p className="mt-1 text-sm font-semibold text-red-700">
Download the error report, correct those rows and import them again.
</p>

</div>

<button
type="button"
onClick={
downloadErrorReport
}
className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white"
>
⬇ Error Excel
</button>

</div>

</div>
)}

{/* -------------------------------------------------------------- */}
{/* COMPLETE */}
{/* -------------------------------------------------------------- */}

{!importing &&
successfulResults.length >
0 && (
<div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center">

<div className="text-4xl">
✅
</div>

<h2 className="mt-2 text-xl font-black text-emerald-950">
Import Completed
</h2>

<p className="mt-1 font-semibold text-emerald-800">
{
successfulResults.length
}{" "}
enquiries were created successfully.
</p>

<Link
href="/enquiries"
className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-black text-white"
>
View Enquiries
</Link>

</div>
)}

</div>
)}

</div>

</main>
);
}