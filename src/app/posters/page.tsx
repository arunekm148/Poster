"use client";

import Link from "next/link";
import {
ChangeEvent,
useCallback,
useEffect,
useMemo,
useRef,
useState,
} from "react";

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type AgentUser = {
id: string;
name?: string;
phone?: string;
email?: string | null;
role?: string;
logoUrl?: string | null;
};

type Company = {
id: string;
name: string;
logoUrl?: string | null;
};

type CategoryName =
| "Health Insurance"
| "Motor Insurance"
| "Life Insurance";

type Poster = {
id: string;
title: string;
fileUrl: string;
thumbnailUrl?: string | null;

source?: "ADMIN" | "AGENT";

approvalStatus?:
| "PENDING"
| "APPROVED"
| "REJECTED";

isActive?: boolean;

company?: {
id?: string;
name?: string;
logoUrl?: string | null;
} | null;

category?: {
id?: string;
name?: string;
};

uploadedBy?: {
id?: string;
name?: string;
phone?: string;
} | null;

createdAt?: string;

rejectionReason?: string | null;
creditAmount?: number | string | null;
creditedAt?: string | null;
};

type PosterMetric = {
downloadCount: number;
averageRating: number;
ratingCount: number;
userRating: number;
};

type PosterWalletSummary = {
availableBalance: number;
totalEarned: number;
totalPending: number;
totalWithdrawn: number;
};

/* -------------------------------------------------------------------------- */
/* OPTIONS */
/* -------------------------------------------------------------------------- */

const CATEGORY_OPTIONS: CategoryName[] = [
"Health Insurance",
"Motor Insurance",
"Life Insurance",
];

/* -------------------------------------------------------------------------- */
/* HELPERS */
/* -------------------------------------------------------------------------- */

function cleanPhone(
phone?: string
) {
const digits =
String(
phone || ""
).replace(
/\D/g,
""
);

if (
digits.length >
10
) {
return digits.slice(
-10
);
}

return digits;
}

function displayPhone(
phone?: string
) {
const value =
cleanPhone(
phone
);

if (!value) {
return "";
}

return `+91 ${value}`;
}

function formatDate(
value?: string
) {
if (!value) {
return "";
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
return "";
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

function formatMoney(
value: number
) {
return `₹${Number(
value || 0
).toLocaleString(
"en-IN",
{
maximumFractionDigits:
2,
}
)}`;
}

/* -------------------------------------------------------------------------- */
/* SINGLE HORIZONTAL PREVIEW MASK */
/* -------------------------------------------------------------------------- */

function PreviewMask({
text,
}: {
text: string;
}) {
return (
<div className="pointer-events-none absolute inset-0 z-20 select-none">

<div className="absolute left-0 top-1/2 w-full -translate-y-1/2">

<div className="border-y border-white/10 bg-black/[0.06] px-3 py-2.5 text-center">

<p className="whitespace-nowrap text-[11px] font-black tracking-[0.08em] text-white/50 sm:text-xs">
{text}
</p>

</div>

</div>

</div>
);
}

/* -------------------------------------------------------------------------- */
/* STAR RATING */
/* -------------------------------------------------------------------------- */

function StarRating({
value,
onRate,
disabled,
}: {
value: number;
onRate: (
rating: number
) => void;
disabled?: boolean;
}) {
return (
<div className="flex items-center gap-1">

{[
1,
2,
3,
4,
5,
].map(
(
star
) => (
<button
key={
star
}
type="button"
disabled={
disabled
}
title={`${star} Star`}
onClick={() =>
onRate(
star
)
}
className={`text-2xl leading-none transition ${
disabled
? "cursor-not-allowed opacity-60"
: "hover:scale-110"
} ${
star <=
value
? "text-amber-500"
: "text-slate-300"
}`}
>
★
</button>
)
)}

</div>
);
}

/* -------------------------------------------------------------------------- */
/* PAGE */
/* -------------------------------------------------------------------------- */

export default function PostersPage() {
/* ------------------------------------------------------------------------ */
/* USER */
/* ------------------------------------------------------------------------ */

const [
user,
setUser,
] =
useState<AgentUser | null>(
null
);

/* ------------------------------------------------------------------------ */
/* DATA */
/* ------------------------------------------------------------------------ */

const [
posters,
setPosters,
] =
useState<Poster[]>(
[]
);

const [
companies,
setCompanies,
] =
useState<Company[]>(
[]
);

/* ------------------------------------------------------------------------ */
/* POSTER WALLET */
/* ------------------------------------------------------------------------ */

const [
posterWallet,
setPosterWallet,
] =
useState<PosterWalletSummary>({
availableBalance: 0,
totalEarned: 0,
totalPending: 0,
totalWithdrawn: 0,
});

const [
walletLoading,
setWalletLoading,
] =
useState(
false
);

/* ------------------------------------------------------------------------ */
/* POSTER METRICS */
/* ------------------------------------------------------------------------ */

const [
posterMetrics,
setPosterMetrics,
] =
useState<
Record<
string,
PosterMetric
>
>({});

const [
ratingPosterId,
setRatingPosterId,
] =
useState<
string | null
>(
null
);

/* ------------------------------------------------------------------------ */
/* FILTER FORM */
/* ------------------------------------------------------------------------ */

const [
filterCategory,
setFilterCategory,
] =
useState<
| "ALL"
| CategoryName
>(
"ALL"
);

const [
filterCompanyId,
setFilterCompanyId,
] =
useState(
"ALL"
);

/* ------------------------------------------------------------------------ */
/* APPLIED FILTER */
/* ------------------------------------------------------------------------ */

const [
selectedCategory,
setSelectedCategory,
] =
useState<
| "ALL"
| CategoryName
>(
"ALL"
);

const [
selectedCompanyId,
setSelectedCompanyId,
] =
useState(
"ALL"
);

/* ------------------------------------------------------------------------ */
/* UPLOAD */
/* ------------------------------------------------------------------------ */

const [
uploadTitle,
setUploadTitle,
] =
useState(
""
);

const [
uploadCategory,
setUploadCategory,
] =
useState<CategoryName>(
"Health Insurance"
);

const [
uploadCompanyId,
setUploadCompanyId,
] =
useState(
"GENERAL"
);

const [
uploadFile,
setUploadFile,
] =
useState<
File | null
>(
null
);

const [
uploadPreview,
setUploadPreview,
] =
useState<
string | null
>(
null
);

const [
uploadedPosterUrl,
setUploadedPosterUrl,
] =
useState<
string | null
>(
null
);

const [
uploadedPosterTitle,
setUploadedPosterTitle,
] =
useState(
""
);

const [
uploadedPosterCompanyId,
setUploadedPosterCompanyId,
] =
useState(
"GENERAL"
);

/* ------------------------------------------------------------------------ */
/* STATUS */
/* ------------------------------------------------------------------------ */

const [
message,
setMessage,
] =
useState(
""
);

const [
loading,
setLoading,
] =
useState(
true
);

const [
uploading,
setUploading,
] =
useState(
false
);

const [
preparingPosterId,
setPreparingPosterId,
] =
useState<
string | null
>(
null
);

const [
preparingOwnPoster,
setPreparingOwnPoster,
] =
useState(
false
);

const fileInputRef =
useRef<HTMLInputElement | null>(
null
);

const isAdmin =
user?.role ===
"ADMIN";

/* ------------------------------------------------------------------------ */
/* LOAD USER */
/* ------------------------------------------------------------------------ */

useEffect(
() => {
try {
const savedUser =
localStorage.getItem(
"agentUser"
);

if (
!savedUser
) {
setMessage(
"Please login again to use Marketing Posters."
);

return;
}

const parsed:
AgentUser =
JSON.parse(
savedUser
);

if (
!parsed?.id
) {
setMessage(
"Unable to identify logged-in agent."
);

return;
}

setUser(
parsed
);
} catch (
error
) {
console.error(
"LOAD USER ERROR:",
error
);

setMessage(
"Unable to load logged-in agent details."
);
}
},
[]
);

/* ------------------------------------------------------------------------ */
/* LOAD POSTERS */
/* ------------------------------------------------------------------------ */

const loadPosters =
useCallback(
async () => {
try {
setLoading(
true
);

const response =
await fetch(
"/api/posters",
{
method:
"GET",

cache:
"no-store",
}
);

let data: {
success?:
boolean;

message?:
string;

posters?:
Poster[];
} = {};

try {
data =
await response.json();
} catch {
data =
{};
}

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
"Unable to load posters."
);
}

setPosters(
Array.isArray(
data.posters
)
? data.posters
: []
);
} catch (
error
) {
console.error(
"LOAD POSTERS ERROR:",
error
);

setMessage(
error instanceof
Error
? error.message
: "Unable to load posters."
);
} finally {
setLoading(
false
);
}
},
[]
);

/* ------------------------------------------------------------------------ */
/* LOAD COMPANIES */
/* ------------------------------------------------------------------------ */

const loadCompanies =
useCallback(
async () => {
try {
const response =
await fetch(
"/api/companies",
{
cache:
"no-store",
}
);

let data: {
success?:
boolean;

companies?:
Company[];
} = {};

try {
data =
await response.json();
} catch {
data =
{};
}

if (
response.ok &&
data.success &&
Array.isArray(
data.companies
)
) {
setCompanies(
data.companies
);
}
} catch (
error
) {
console.error(
"LOAD COMPANIES ERROR:",
error
);
}
},
[]
);

useEffect(
() => {
void Promise.all([
loadPosters(),
loadCompanies(),
]);
},
[
loadPosters,
loadCompanies,
]
);

/* ------------------------------------------------------------------------ */
/* LOAD POSTER WALLET */
/* ------------------------------------------------------------------------ */

const loadPosterWallet =
useCallback(
async (
currentUserId:
string
) => {
try {
setWalletLoading(
true
);

const response =
await fetch(
`/api/wallet/poster?userId=${encodeURIComponent(
currentUserId
)}`,
{
cache:
"no-store",
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
data.success ===
false
) {
console.error(
"LOAD POSTER WALLET FAILED:",
data
);

return;
}

setPosterWallet({
availableBalance:
Number(
data.wallet
?.availableBalance ||
0
),

totalEarned:
Number(
data.wallet
?.totalEarned ||
0
),

totalPending:
Number(
data.wallet
?.totalPending ||
0
),

totalWithdrawn:
Number(
data.wallet
?.totalWithdrawn ||
0
),
});
} catch (
error
) {
console.error(
"LOAD POSTER WALLET ERROR:",
error
);
} finally {
setWalletLoading(
false
);
}
},
[]
);

useEffect(
() => {
if (
!user?.id ||
isAdmin
) {
return;
}

void loadPosterWallet(
user.id
);
},
[
user?.id,
isAdmin,
loadPosterWallet,
]
);

/* ------------------------------------------------------------------------ */
/* LOAD DOWNLOAD + RATING METRICS */
/* ------------------------------------------------------------------------ */

const loadPosterMetrics =
useCallback(
async (
posterList:
Poster[],

currentUserId?:
string,

includeDownloadCount =
false
) => {
if (
posterList.length ===
0
) {
setPosterMetrics(
{}
);

return;
}

try {
const results =
await Promise.all(
posterList.map(
async (
poster
) => {
let downloadCount =
0;

let averageRating =
0;

let ratingCount =
0;

let userRating =
0;

if (
includeDownloadCount
) {
try {
const downloadResponse =
await fetch(
`/api/downloads?mediaId=${encodeURIComponent(
poster.id
)}`,
{
cache:
"no-store",
}
);

const downloadData =
await downloadResponse
.json()
.catch(
() =>
({})
);

if (
downloadResponse.ok &&
downloadData.success
) {
downloadCount =
Number(
downloadData.count ||
0
);
}
} catch (
error
) {
console.error(
"LOAD DOWNLOAD COUNT ERROR:",
error
);
}
}

try {
const ratingUrl =
currentUserId
? `/api/ratings?mediaId=${encodeURIComponent(
poster.id
)}&userId=${encodeURIComponent(
currentUserId
)}`
: `/api/ratings?mediaId=${encodeURIComponent(
poster.id
)}`;

const ratingResponse =
await fetch(
ratingUrl,
{
cache:
"no-store",
}
);

const ratingData =
await ratingResponse
.json()
.catch(
() =>
({})
);

if (
ratingResponse.ok &&
ratingData.success
) {
averageRating =
Number(
ratingData.averageRating ||
0
);

ratingCount =
Number(
ratingData.ratingCount ||
0
);

userRating =
Number(
ratingData.myRating ??
ratingData.userRating ??
0
);
}
} catch (
error
) {
console.error(
"LOAD RATING ERROR:",
error
);
}

return {
id:
poster.id,

metric: {
downloadCount,
averageRating,
ratingCount,
userRating,
} satisfies PosterMetric,
};
}
)
);

const nextMetrics:
Record<
string,
PosterMetric
> = {};

for (
const result of
results
) {
nextMetrics[
result.id
] =
result.metric;
}

setPosterMetrics(
nextMetrics
);
} catch (
error
) {
console.error(
"LOAD POSTER METRICS ERROR:",
error
);
}
},
[]
);

useEffect(
() => {
if (
posters.length ===
0
) {
return;
}

void loadPosterMetrics(
posters,
user?.id,
isAdmin
);
},
[
posters,
user?.id,
isAdmin,
loadPosterMetrics,
]
);

/* ------------------------------------------------------------------------ */
/* AGENT DETAILS */
/* ------------------------------------------------------------------------ */

const agentName =
user?.name?.trim() ||
"Registered Agent";

const agentMobile =
cleanPhone(
user?.phone
);

const agentLogo =
user?.logoUrl ||
null;

const maskText =
`${agentName.toUpperCase()} • ${
agentMobile
? displayPhone(
agentMobile
)
: "REGISTERED AGENT"
}`;

/* ------------------------------------------------------------------------ */
/* COMPANY */
/* ------------------------------------------------------------------------ */

const selectedCompany =
useMemo(
() => {
if (
selectedCompanyId ===
"ALL" ||
selectedCompanyId ===
"GENERAL"
) {
return null;
}

return (
companies.find(
(
company
) =>
company.id ===
selectedCompanyId
) ||
null
);
},
[
companies,
selectedCompanyId,
]
);

const uploadCompany =
useMemo(
() => {
if (
uploadCompanyId ===
"GENERAL"
) {
return null;
}

return (
companies.find(
(
company
) =>
company.id ===
uploadCompanyId
) ||
null
);
},
[
companies,
uploadCompanyId,
]
);

const uploadedPosterCompany =
useMemo(
() => {
if (
uploadedPosterCompanyId ===
"GENERAL"
) {
return null;
}

return (
companies.find(
(
company
) =>
company.id ===
uploadedPosterCompanyId
) ||
null
);
},
[
companies,
uploadedPosterCompanyId,
]
);

/* ------------------------------------------------------------------------ */
/* FILTER POSTERS */
/* ------------------------------------------------------------------------ */

const visiblePosters =
useMemo(
() => {
return posters.filter(
(
poster
) => {
const categoryMatch =
selectedCategory ===
"ALL" ||
poster.category
?.name ===
selectedCategory;

if (
!categoryMatch
) {
return false;
}

if (
selectedCompanyId ===
"ALL"
) {
return true;
}

if (
selectedCompanyId ===
"GENERAL"
) {
return !poster
.company?.id;
}

return (
poster.company
?.id ===
selectedCompanyId
);
}
);
},
[
posters,
selectedCategory,
selectedCompanyId,
]
);

/* ------------------------------------------------------------------------ */
/* MY AGENT UPLOADS */
/* ------------------------------------------------------------------------ */

const myUploads =
useMemo(
() => {
if (
!user?.id ||
isAdmin
) {
return [];
}

return posters
.filter(
(
poster
) =>
poster.source ===
"AGENT" &&
poster.uploadedBy
?.id ===
user.id
)
.sort(
(
a,
b
) =>
new Date(
b.createdAt ||
0
).getTime() -
new Date(
a.createdAt ||
0
).getTime()
);
},
[
posters,
user?.id,
isAdmin,
]
);

/* ------------------------------------------------------------------------ */
/* SEARCH */
/* ------------------------------------------------------------------------ */

function searchPosters() {
setSelectedCategory(
filterCategory
);

setSelectedCompanyId(
filterCompanyId
);
}

function clearFilters() {
setFilterCategory(
"ALL"
);

setFilterCompanyId(
"ALL"
);

setSelectedCategory(
"ALL"
);

setSelectedCompanyId(
"ALL"
);
}

/* ------------------------------------------------------------------------ */
/* FILE SELECT */
/* ------------------------------------------------------------------------ */

function handleImageUpload(
event:
ChangeEvent<HTMLInputElement>
) {
const file =
event.target
.files?.[0];

if (!file) {
return;
}

const allowedTypes = [
"image/jpeg",
"image/png",
"image/webp",
];

if (
!allowedTypes.includes(
file.type
)
) {
setMessage(
"Please upload JPG, PNG or WEBP image."
);

event.target.value =
"";

return;
}

const maxSize =
10 *
1024 *
1024;

if (
file.size >
maxSize
) {
setMessage(
"Poster image must be below 10 MB."
);

event.target.value =
"";

return;
}

if (
uploadPreview
) {
URL.revokeObjectURL(
uploadPreview
);
}

const preview =
URL.createObjectURL(
file
);

setUploadFile(
file
);

setUploadPreview(
preview
);

setUploadedPosterUrl(
null
);

setMessage(
""
);
}

function resetUploadForm() {
if (
uploadPreview
) {
try {
URL.revokeObjectURL(
uploadPreview
);
} catch {}
}

setUploadTitle(
""
);

setUploadCategory(
"Health Insurance"
);

setUploadCompanyId(
"GENERAL"
);

setUploadFile(
null
);

setUploadPreview(
null
);

if (
fileInputRef.current
) {
fileInputRef.current.value =
"";
}
}

/* ------------------------------------------------------------------------ */
/* UPLOAD POSTER */
/* ------------------------------------------------------------------------ */

async function uploadPoster() {
if (
!user?.id
) {
setMessage(
"Please login again."
);

return;
}

if (
!uploadTitle.trim()
) {
setMessage(
"Please enter poster title."
);

return;
}

if (
!uploadFile
) {
setMessage(
"Please select poster image."
);

return;
}

try {
setUploading(
true
);

setMessage(
"Uploading poster..."
);

const formData =
new FormData();

formData.append(
"file",
uploadFile
);

const uploadResponse =
await fetch(
"/api/upload",
{
method:
"POST",

body:
formData,
}
);

let uploadData: {
success?:
boolean;

message?:
string;

fileUrl?:
string;

url?:
string;
} = {};

try {
uploadData =
await uploadResponse.json();
} catch {
uploadData =
{};
}

if (
!uploadResponse.ok ||
!uploadData.success
) {
throw new Error(
uploadData.message ||
"Image upload failed."
);
}

const fileUrl =
uploadData.fileUrl ||
uploadData.url ||
"";

if (
!fileUrl
) {
throw new Error(
"Upload API did not return image URL."
);
}

setUploadedPosterUrl(
fileUrl
);

setUploadedPosterTitle(
uploadTitle.trim()
);

setUploadedPosterCompanyId(
uploadCompanyId
);

const posterResponse =
await fetch(
"/api/posters",
{
method:
"POST",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify({
title:
uploadTitle.trim(),

fileUrl,

categoryName:
uploadCategory,

companyId:
uploadCompanyId,

source:
isAdmin
? "ADMIN"
: "AGENT",

uploadedByUserId:
isAdmin
? undefined
: user.id,
}),
}
);

let posterData: {
success?:
boolean;

message?:
string;

poster?:
Poster;
} = {};

try {
posterData =
await posterResponse.json();
} catch {
posterData =
{};
}

if (
!posterResponse.ok ||
!posterData.success
) {
throw new Error(
posterData.message ||
"Unable to save poster."
);
}

if (
isAdmin
) {
setMessage(
"✅ Poster published successfully."
);

resetUploadForm();

await loadPosters();
} else {
setMessage(
"✅ Poster uploaded and submitted for Admin approval. You can use your personalized copy now. Admin approval/rejection status will appear in My Poster Uploads."
);

resetUploadForm();

if (
posterData.poster
) {
setPosters(
(
current
) => {
const exists =
current.some(
(
item
) =>
item.id ===
posterData.poster
?.id
);

if (
exists
) {
return current;
}

return [
posterData.poster as Poster,
...current,
];
}
);
} else {
await loadPosters();
}
}
} catch (
error
) {
console.error(
"UPLOAD POSTER ERROR:",
error
);

setMessage(
error instanceof
Error
? `❌ ${error.message}`
: "❌ Unable to upload poster."
);
} finally {
setUploading(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* LOAD IMAGE */
/* ------------------------------------------------------------------------ */

function loadImage(
source:
string
): Promise<HTMLImageElement> {
return new Promise(
(
resolve,
reject
) => {
const image =
new Image();

image.onload =
() =>
resolve(
image
);

image.onerror =
() =>
reject(
new Error(
"Unable to load image."
)
);

image.src =
source;
}
);
}

/* ------------------------------------------------------------------------ */
/* DRAW SINGLE CENTER MASK */
/* ------------------------------------------------------------------------ */

function drawCenterMask(
context:
CanvasRenderingContext2D,

width:
number,

posterHeight:
number
) {
const centerY =
posterHeight /
2;

const bandHeight =
Math.max(
48,
Math.round(
posterHeight *
0.055
)
);

context.save();

context.fillStyle =
"rgba(0, 0, 0, 0.07)";

context.fillRect(
0,
centerY -
bandHeight /
2,
width,
bandHeight
);

const fontSize =
Math.max(
18,
Math.round(
width *
0.028
)
);

context.font =
`800 ${fontSize}px Arial`;

context.textAlign =
"center";

context.textBaseline =
"middle";

context.fillStyle =
"rgba(255,255,255,0.52)";

context.shadowColor =
"transparent";

context.shadowBlur =
0;

context.fillText(
maskText,
width /
2,
centerY
);

context.fillStyle =
"rgba(255,255,255,0.10)";

context.fillRect(
0,
centerY -
bandHeight /
2,
width,
1
);

context.fillRect(
0,
centerY +
bandHeight /
2,
width,
1
);

context.restore();
}

/* ------------------------------------------------------------------------ */
/* FINAL PERSONALIZED POSTER */
/* ------------------------------------------------------------------------ */

async function createPersonalizedPoster(
posterUrl:
string,

company?:
| Company
| null
) {
try {
const posterImage =
await loadImage(
posterUrl
);

let companyLogoImage:
HTMLImageElement | null =
null;

let agentLogoImage:
HTMLImageElement | null =
null;

if (
company?.logoUrl
) {
try {
companyLogoImage =
await loadImage(
company.logoUrl
);
} catch {
companyLogoImage =
null;
}
}

if (
agentLogo
) {
try {
agentLogoImage =
await loadImage(
agentLogo
);
} catch {
agentLogoImage =
null;
}
}

const width =
posterImage.naturalWidth;

const posterHeight =
posterImage.naturalHeight;

const footerHeight =
Math.max(
160,
Math.round(
width *
0.18
)
);

const canvas =
document.createElement(
"canvas"
);

canvas.width =
width;

canvas.height =
posterHeight +
footerHeight;

const context =
canvas.getContext(
"2d"
);

if (
!context
) {
return null;
}

context.drawImage(
posterImage,
0,
0,
width,
posterHeight
);

drawCenterMask(
context,
width,
posterHeight
);

const gradient =
context.createLinearGradient(
0,
posterHeight,
width,
posterHeight
);

gradient.addColorStop(
0,
"#020617"
);

gradient.addColorStop(
0.52,
"#172554"
);

gradient.addColorStop(
1,
"#1d4ed8"
);

context.fillStyle =
gradient;

context.fillRect(
0,
posterHeight,
width,
footerHeight
);

const padding =
Math.round(
width *
0.035
);

const dividerX =
width *
0.48;

const companyAreaWidth =
dividerX -
padding *
2;

const companyLogoSize =
Math.round(
footerHeight *
0.43
);

const companyLogoX =
padding;

const companyLogoY =
posterHeight +
Math.round(
footerHeight *
0.14
);

if (
companyLogoImage
) {
context.fillStyle =
"#ffffff";

context.beginPath();

context.roundRect(
companyLogoX,
companyLogoY,
companyLogoSize,
companyLogoSize,
Math.round(
companyLogoSize *
0.12
)
);

context.fill();

const logoPadding =
Math.round(
companyLogoSize *
0.09
);

context.drawImage(
companyLogoImage,
companyLogoX +
logoPadding,
companyLogoY +
logoPadding,
companyLogoSize -
logoPadding *
2,
companyLogoSize -
logoPadding *
2
);
} else {
context.fillStyle =
"rgba(255,255,255,0.12)";

context.beginPath();

context.roundRect(
companyLogoX,
companyLogoY,
companyLogoSize,
companyLogoSize,
Math.round(
companyLogoSize *
0.12
)
);

context.fill();

context.fillStyle =
"#ffffff";

context.textAlign =
"center";

context.textBaseline =
"middle";

context.font =
`700 ${Math.max(
22,
Math.round(
companyLogoSize *
0.35
)
)}px Arial`;

context.fillText(
"INS",
companyLogoX +
companyLogoSize /
2,
companyLogoY +
companyLogoSize /
2
);
}

context.textAlign =
"left";

context.textBaseline =
"middle";

context.fillStyle =
"#ffffff";

context.font =
`700 ${Math.max(
15,
Math.round(
footerHeight *
0.105
)
)}px Arial`;

const companyName =
company?.name ||
"General Insurance";

const companyNameY =
companyLogoY +
companyLogoSize +
Math.round(
footerHeight *
0.14
);

context.fillText(
companyName,
companyLogoX,
companyNameY,
companyAreaWidth
);

context.fillStyle =
"rgba(255,255,255,0.28)";

context.fillRect(
dividerX,
posterHeight +
footerHeight *
0.13,
2,
footerHeight *
0.74
);

const agentStartX =
dividerX +
Math.round(
width *
0.035
);

let agentTextX =
agentStartX;

const agentLogoSize =
Math.round(
footerHeight *
0.48
);

if (
agentLogoImage
) {
const logoY =
posterHeight +
(
footerHeight -
agentLogoSize
) /
2;

context.fillStyle =
"#ffffff";

context.beginPath();

context.roundRect(
agentStartX,
logoY,
agentLogoSize,
agentLogoSize,
Math.round(
agentLogoSize *
0.12
)
);

context.fill();

const logoPadding =
Math.round(
agentLogoSize *
0.09
);

context.drawImage(
agentLogoImage,
agentStartX +
logoPadding,
logoY +
logoPadding,
agentLogoSize -
logoPadding *
2,
agentLogoSize -
logoPadding *
2
);

agentTextX =
agentStartX +
agentLogoSize +
Math.round(
width *
0.025
);
}

context.textAlign =
"left";

context.textBaseline =
"middle";

context.fillStyle =
"#93c5fd";

context.font =
`800 ${Math.max(
14,
Math.round(
footerHeight *
0.095
)
)}px Arial`;

context.fillText(
"CONTACT US",
agentTextX,
posterHeight +
footerHeight *
0.23
);

context.fillStyle =
"#ffffff";

context.font =
`800 ${Math.max(
20,
Math.round(
footerHeight *
0.16
)
)}px Arial`;

context.fillText(
agentName,
agentTextX,
posterHeight +
footerHeight *
0.47
);

context.fillStyle =
"#ffffff";

context.font =
`900 ${Math.max(
25,
Math.round(
footerHeight *
0.205
)
)}px Arial`;

context.fillText(
displayPhone(
agentMobile
),
agentTextX,
posterHeight +
footerHeight *
0.73
);

return canvas.toDataURL(
"image/png",
1
);
} catch (
error
) {
console.error(
"CREATE POSTER ERROR:",
error
);

return null;
}
}

/* ------------------------------------------------------------------------ */
/* RECORD DOWNLOAD */
/* ------------------------------------------------------------------------ */

async function recordDownload(
posterId:
string
) {
if (
!user?.id
) {
return false;
}

try {
const response =
await fetch(
"/api/downloads",
{
method:
"POST",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify({
userId:
user.id,

mediaId:
posterId,
}),
}
);

const data =
await response
.json()
.catch(
() =>
({})
);

if (
!response.ok ||
!data.success
) {
console.error(
"DOWNLOAD RECORD FAILED:",
data
);

return false;
}

setPosterMetrics(
(
current
) => ({
...current,

[posterId]: {
downloadCount:
Number(
data.posterDownloads ??
data.totals
?.mediaTotal ??
(
current[
posterId
]
?.downloadCount ||
0
) +
1
),

averageRating:
current[
posterId
]
?.averageRating ||
0,

ratingCount:
current[
posterId
]
?.ratingCount ||
0,

userRating:
current[
posterId
]
?.userRating ||
0,
},
})
);

return true;
} catch (
error
) {
console.error(
"DOWNLOAD RECORD ERROR:",
error
);

return false;
}
}

/* ------------------------------------------------------------------------ */
/* DOWNLOAD LIBRARY POSTER */
/* ------------------------------------------------------------------------ */

async function downloadPoster(
poster:
Poster
) {
try {
setPreparingPosterId(
poster.id
);

const company:
| Company
| null =
poster.company
? {
id:
poster.company
.id ||
"",

name:
poster.company
.name ||
"",

logoUrl:
poster.company
.logoUrl ||
null,
}
: null;

const image =
await createPersonalizedPoster(
poster.fileUrl,
company
);

if (
!image
) {
window.alert(
"Unable to prepare poster."
);

return;
}

const safeName =
poster.title
.replace(
/[^a-z0-9]/gi,
"-"
)
.replace(
/-+/g,
"-"
)
.replace(
/^-|-$/g,
""
)
.toLowerCase();

const link =
document.createElement(
"a"
);

link.href =
image;

link.download =
`${
safeName ||
"poster"
}-personalized.png`;

document.body.appendChild(
link
);

link.click();

document.body.removeChild(
link
);

await recordDownload(
poster.id
);
} catch (
error
) {
console.error(
"DOWNLOAD POSTER ERROR:",
error
);

window.alert(
"Unable to download poster."
);
} finally {
setPreparingPosterId(
null
);
}
}

/* ------------------------------------------------------------------------ */
/* DOWNLOAD OWN POSTER */
/* ------------------------------------------------------------------------ */

async function downloadOwnPoster() {
if (
!uploadedPosterUrl
) {
return;
}

try {
setPreparingOwnPoster(
true
);

const image =
await createPersonalizedPoster(
uploadedPosterUrl,
uploadedPosterCompany
);

if (
!image
) {
window.alert(
"Unable to prepare your poster."
);

return;
}

const safeName =
uploadedPosterTitle
.replace(
/[^a-z0-9]/gi,
"-"
)
.replace(
/-+/g,
"-"
)
.replace(
/^-|-$/g,
""
)
.toLowerCase();

const link =
document.createElement(
"a"
);

link.href =
image;

link.download =
`${
safeName ||
"my-poster"
}-personalized.png`;

document.body.appendChild(
link
);

link.click();

document.body.removeChild(
link
);

setUploadedPosterUrl(
null
);

setUploadedPosterTitle(
""
);

setUploadedPosterCompanyId(
"GENERAL"
);

setMessage(
"✅ Personalized poster downloaded. You can upload another poster now."
);
} catch (
error
) {
console.error(
"DOWNLOAD OWN POSTER ERROR:",
error
);
} finally {
setPreparingOwnPoster(
false
);
}
}

/* ------------------------------------------------------------------------ */
/* RATE POSTER */
/* ------------------------------------------------------------------------ */

async function ratePoster(
posterId:
string,

rating:
number
) {
if (
!user?.id
) {
setMessage(
"Please login again to rate posters."
);

return;
}

try {
setRatingPosterId(
posterId
);

const response =
await fetch(
"/api/ratings",
{
method:
"POST",

headers: {
"Content-Type":
"application/json",
},

body:
JSON.stringify({
userId:
user.id,

mediaId:
posterId,

rating,
}),
}
);

let data: {
success?:
boolean;

message?:
string;

rating?:
number;

averageRating?:
number;

ratingCount?:
number;
} = {};

try {
data =
await response.json();
} catch {
data =
{};
}

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
"Unable to save rating."
);
}

setPosterMetrics(
(
current
) => {
const existing =
current[
posterId
] || {
downloadCount:
0,

averageRating:
0,

ratingCount:
0,

userRating:
0,
};

return {
...current,

[posterId]: {
...existing,

userRating:
Number(
data.rating ??
rating
),

averageRating:
Number(
data.averageRating ??
existing.averageRating
),

ratingCount:
Number(
data.ratingCount ??
existing.ratingCount
),
},
};
}
);

setMessage(
`⭐ Your ${rating}-star rating has been saved.`
);
} catch (
error
) {
console.error(
"RATE POSTER ERROR:",
error
);

setMessage(
error instanceof
Error
? error.message
: "Unable to save rating."
);
} finally {
setRatingPosterId(
null
);
}
}

/* ------------------------------------------------------------------------ */
/* DELETE */
/* ------------------------------------------------------------------------ */

async function deletePoster(
poster:
Poster
) {
if (
!isAdmin
) {
return;
}

const confirmed =
window.confirm(
`Delete "${poster.title}"?`
);

if (
!confirmed
) {
return;
}

try {
const response =
await fetch(
`/api/posters?id=${encodeURIComponent(
poster.id
)}`,
{
method:
"DELETE",
}
);

let data: {
success?:
boolean;

message?:
string;
} = {};

try {
data =
await response.json();
} catch {
data =
{};
}

if (
!response.ok ||
!data.success
) {
throw new Error(
data.message ||
"Unable to delete poster."
);
}

setPosters(
(
current
) =>
current.filter(
(
item
) =>
item.id !==
poster.id
)
);

setMessage(
"Poster deleted successfully."
);
} catch (
error
) {
setMessage(
error instanceof
Error
? error.message
: "Unable to delete poster."
);
}
}

/* ------------------------------------------------------------------------ */
/* UI */
/* ------------------------------------------------------------------------ */

return (
<main className="min-h-screen bg-slate-100 pb-20 text-slate-950">

{/* HEADER */}

<header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">

<div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-5 sm:px-6">

<Link
href="/dashboard"
className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-black hover:bg-white/20"
>
←
</Link>

<div>

<h1 className="text-xl font-black sm:text-2xl">
Marketing Posters
</h1>

<p className="text-sm font-semibold text-blue-200">
Personalized Agent Marketing Library
</p>

</div>

</div>

</header>

<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

{/* HERO */}

<section className="rounded-3xl bg-gradient-to-r from-purple-700 via-blue-700 to-blue-600 p-6 text-white shadow-xl">

<div className="grid gap-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">

{/* LEFT */}

<div>

<h2 className="text-2xl font-black">
🎨 Agent Marketing Centre
</h2>

<p className="mt-2 max-w-2xl text-sm font-semibold text-blue-100">
Download insurance marketing posters personalized with your agent details.
</p>

</div>

{/* POSTER WALLET */}

{!isAdmin && (
<div className="min-w-[270px] rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm">

<div className="flex items-start justify-between gap-3">

<div>

<p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
Poster Wallet
</p>

<p className="mt-1 text-3xl font-black text-white">
{walletLoading
? "..."
: formatMoney(
posterWallet.availableBalance
)}
</p>

<p className="mt-1 text-[11px] font-semibold text-blue-100">
Available contributor credit
</p>

</div>

<div className="text-3xl">
💰
</div>

</div>

<div className="mt-4 grid grid-cols-3 gap-2">

<div className="rounded-xl bg-black/10 p-2">

<p className="text-[9px] font-black uppercase text-blue-200">
Earned
</p>

<p className="mt-1 text-sm font-black text-white">
{formatMoney(
posterWallet.totalEarned
)}
</p>

</div>

<div className="rounded-xl bg-black/10 p-2">

<p className="text-[9px] font-black uppercase text-blue-200">
Pending
</p>

<p className="mt-1 text-sm font-black text-white">
{formatMoney(
posterWallet.totalPending
)}
</p>

</div>

<div className="rounded-xl bg-black/10 p-2">

<p className="text-[9px] font-black uppercase text-blue-200">
Withdrawn
</p>

<p className="mt-1 text-sm font-black text-white">
{formatMoney(
posterWallet.totalWithdrawn
)}
</p>

</div>

</div>

<div className="mt-4 grid grid-cols-[1fr_auto] gap-2">

<Link
href="/wallet/poster"
className="flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white shadow hover:bg-emerald-600"
>
💳 Open Poster Wallet
</Link>

<button
type="button"
disabled={
walletLoading ||
!user?.id
}
onClick={() => {
if (
user?.id
) {
void loadPosterWallet(
user.id
);
}
}}
className="rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-black text-white hover:bg-white/20 disabled:opacity-60"
title="Refresh Poster Wallet"
>
↻
</button>

</div>

</div>
)}

{/* AGENT DETAILS */}

<div className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4">

<p className="text-xs font-black text-blue-100">
YOUR MARKING
</p>

<p className="mt-1 text-base font-black text-white">
{agentName}
</p>

<p className="mt-1 text-lg font-black text-white">
{displayPhone(
agentMobile
)}
</p>

<p className="mt-1 text-xs font-semibold text-blue-200">
{agentLogo
? "✓ Agent / Agency Logo Available"
: "Agent Logo Optional"}
</p>

</div>

</div>

</section>

{/* UPLOAD */}

<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

<h2 className="text-lg font-black text-slate-950">
⬆️ Upload Your Poster
</h2>

<p className="mt-1 text-sm font-semibold text-slate-600">
Upload your own poster and download the personalized version immediately.
</p>

<div className="mt-5 grid gap-4 md:grid-cols-2">

<div>

<label className="block text-sm font-black text-slate-900">
Poster Title *
</label>

<input
value={
uploadTitle
}
onChange={(
event
) =>
setUploadTitle(
event.target.value
)
}
placeholder="Enter poster title"
className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 text-base font-bold text-slate-950 placeholder:text-slate-500 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
/>

</div>

<div>

<label className="block text-sm font-black text-slate-900">
Category *
</label>

<select
value={
uploadCategory
}
onChange={(
event
) =>
setUploadCategory(
event.target.value as CategoryName
)
}
className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 text-base font-bold text-slate-950 outline-none focus:border-blue-700"
>

{CATEGORY_OPTIONS.map(
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

<div className="md:col-span-2">

<label className="block text-sm font-black text-slate-900">
Insurance Company
</label>

<select
value={
uploadCompanyId
}
onChange={(
event
) =>
setUploadCompanyId(
event.target.value
)
}
className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 text-base font-bold text-slate-950 outline-none focus:border-blue-700"
>

<option value="GENERAL">
General Poster — No Specific Company
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

</div>

</div>

{uploadCompany && (
<div className="mt-4 flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">

{uploadCompany.logoUrl ? (
<div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm">

<img
src={
uploadCompany.logoUrl
}
alt={
uploadCompany.name
}
className="max-h-full max-w-full object-contain"
/>

</div>
) : (
<div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
🏢
</div>
)}

<div>

<p className="text-xs font-black uppercase text-blue-700">
Selected Company
</p>

<p className="font-black text-slate-950">
{uploadCompany.name}
</p>

</div>

</div>
)}

<div className="mt-4">

<label className="block text-sm font-black text-slate-900">
Poster Image *
</label>

<input
ref={
fileInputRef
}
type="file"
accept="image/jpeg,image/png,image/webp"
onChange={
handleImageUpload
}
className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-sm font-bold text-slate-950 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-100 file:px-4 file:py-2 file:font-black file:text-blue-900"
/>

</div>

{uploadPreview && (
<div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

<div className="flex items-center gap-4">

<div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">

<img
src={
uploadPreview
}
alt="Selected poster thumbnail"
className="h-full w-full object-cover"
/>

</div>

<div className="min-w-0">

<p className="text-xs font-black uppercase tracking-wide text-blue-700">
Selected Poster
</p>

<p className="mt-1 truncate text-sm font-black text-slate-950">
{uploadFile?.name ||
"Poster image"}
</p>

<p className="mt-1 text-xs font-semibold text-slate-500">
Thumbnail preview only. The original image is kept for processing.
</p>

</div>

</div>

</div>
)}

{message && (
<div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800">
{message}
</div>
)}

<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

<div className="flex flex-col gap-3 sm:flex-row">

<button
type="button"
disabled={
uploading
}
onClick={
uploadPoster
}
className="flex-1 rounded-xl bg-blue-700 px-5 py-3.5 font-black text-white shadow-md hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
>
{uploading
? "Uploading..."
: isAdmin
? "⬆ Publish Poster"
: "⬆ Upload Poster"}
</button>

{!isAdmin && (
<button
type="button"
disabled={
!uploadedPosterUrl ||
preparingOwnPoster
}
onClick={() =>
void downloadOwnPoster()
}
className="flex-1 rounded-xl bg-emerald-700 px-5 py-3.5 font-black text-white shadow-md hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
>
{preparingOwnPoster
? "Preparing..."
: "⬇ Download My Personalized Poster"}
</button>
)}

</div>

{!isAdmin && (
<p className="mt-3 text-xs font-semibold text-slate-500">
Upload first. After the poster is submitted successfully, the download button becomes active.
</p>
)}

{uploadedPosterUrl &&
!isAdmin && (
<div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">

<div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-blue-200 bg-white">

<img
src={
uploadedPosterUrl
}
alt="Uploaded poster thumbnail"
className="h-full w-full object-cover"
/>

</div>

<div className="min-w-0 flex-1">

<h3 className="font-black text-blue-950">
⏳ Submitted for Admin Approval
</h3>

<p className="mt-1 text-xs font-semibold text-blue-800">
Approval, rejection reason and credit will appear below in My Poster Uploads.
</p>

</div>

</div>
)}

</div>

{/* MY POSTER UPLOADS */}

{!isAdmin && (
<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

<div className="flex items-center justify-between gap-3">

<div>

<p className="text-xs font-black uppercase tracking-wide text-violet-700">
Contributor Centre
</p>

<h2 className="mt-1 text-lg font-black text-slate-950">
My Poster Uploads
</h2>

<p className="mt-1 text-xs font-semibold text-slate-500">
Admin approval, rejection reason and approved credit are shown here.
</p>

</div>

<button
type="button"
onClick={() => {
void loadPosters();

if (
user?.id
) {
void loadPosterWallet(
user.id
);
}
}}
className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700"
>
↻ Refresh
</button>

</div>

{myUploads.length ===
0 ? (
<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">

<div className="text-3xl">
🖼️
</div>

<p className="mt-2 text-sm font-black text-slate-700">
No saved upload history available yet
</p>

<p className="mt-1 text-xs font-semibold text-slate-500">
New uploads will appear here when returned by the poster API.
</p>

</div>
) : (
<div className="mt-4 space-y-3">

{myUploads.map(
(
poster
) => {
const status =
poster.approvalStatus ||
"PENDING";

const approved =
status ===
"APPROVED";

const rejected =
status ===
"REJECTED";

return (
<div
key={
poster.id
}
className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3"
>

<div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">

<img
src={
poster.thumbnailUrl ||
poster.fileUrl
}
alt={
poster.title
}
className="h-full w-full object-cover"
/>

</div>

<div className="min-w-0 flex-1">

<div className="flex flex-wrap items-start justify-between gap-2">

<div className="min-w-0">

<p className="truncate text-sm font-black text-slate-950">
{poster.title}
</p>

<p className="mt-1 text-xs font-semibold text-slate-500">
{poster.createdAt
? formatDate(
poster.createdAt
)
: ""}
</p>

</div>

<span
className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
approved
? "bg-emerald-100 text-emerald-800"
: rejected
? "bg-red-100 text-red-700"
: "bg-amber-100 text-amber-800"
}`}
>
{approved
? "✓ APPROVED"
: rejected
? "✕ REJECTED"
: "⏳ PENDING"}
</span>

</div>

{approved && (
<div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2">

<p className="text-xs font-black text-emerald-800">
Admin Approved for Contributor Credit
</p>

{Number(
poster.creditAmount ||
0
) >
0 && (
<p className="mt-1 text-sm font-black text-emerald-900">
Credit: ₹
{Number(
poster.creditAmount ||
0
).toLocaleString(
"en-IN"
)}
</p>
)}

</div>
)}

{rejected && (
<div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">

<p className="text-[10px] font-black uppercase text-red-600">
Admin Rejection Reason
</p>

<p className="mt-1 text-xs font-bold text-red-800">
{poster.rejectionReason ||
"Reason not available. Please contact Admin."}
</p>

</div>
)}

</div>

</div>
);
}
)}

</div>
)}

</section>
)}

</section>

{/* FIND POSTERS */}

<section className="mt-8 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">

<div>

<h2 className="text-xl font-black text-slate-950">
🔎 Find Marketing Posters
</h2>

<p className="mt-1 text-sm font-semibold text-slate-600">
Select category and insurance company, then press Show Posters.
</p>

</div>

<div className="mt-5 grid gap-4 md:grid-cols-2">

<div>

<label className="block text-sm font-black text-slate-900">
Insurance Category
</label>

<select
value={
filterCategory
}
onChange={(
event
) =>
setFilterCategory(
event.target.value as
| "ALL"
| CategoryName
)
}
className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 text-base font-bold text-slate-950 outline-none focus:border-blue-700"
>

<option value="ALL">
All Categories
</option>

{CATEGORY_OPTIONS.map(
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

<div>

<label className="block text-sm font-black text-slate-900">
Insurance Company
</label>

<select
value={
filterCompanyId
}
onChange={(
event
) =>
setFilterCompanyId(
event.target.value
)
}
className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 text-base font-bold text-slate-950 outline-none focus:border-blue-700"
>

<option value="ALL">
All Companies
</option>

<option value="GENERAL">
General Posters
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

</div>

</div>

<div className="mt-5 flex flex-wrap gap-3">

<button
type="button"
onClick={
searchPosters
}
className="rounded-xl bg-blue-700 px-7 py-3.5 font-black text-white shadow-md hover:bg-blue-800"
>
🔎 Show Posters
</button>

<button
type="button"
onClick={
clearFilters
}
className="rounded-xl border-2 border-slate-300 bg-white px-6 py-3.5 font-black text-slate-700 hover:bg-slate-50"
>
Clear
</button>

</div>

</section>

{/* AVAILABLE POSTERS */}

<section className="mt-5">

<div className="flex items-center justify-between gap-3">

<div>

<h2 className="text-xl font-black text-slate-950">
Available Posters
</h2>

<p className="text-sm font-semibold text-slate-600">
{visiblePosters.length}{" "}
poster
{visiblePosters.length ===
1
? ""
: "s"}
</p>

</div>

<button
type="button"
onClick={() => {
void loadPosters();

if (
posters.length >
0
) {
void loadPosterMetrics(
posters,
user?.id,
isAdmin
);
}

if (
user?.id &&
!isAdmin
) {
void loadPosterWallet(
user.id
);
}
}}
className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-black text-slate-800"
>
↻ Refresh
</button>

</div>

{loading ? (
<div className="mt-5 rounded-2xl border bg-white p-8 text-center font-bold text-slate-700">
Loading posters...
</div>
) : visiblePosters.length ===
0 ? (
<div className="mt-5 rounded-3xl border bg-white p-10 text-center">

<div className="text-5xl">
🖼️
</div>

<h3 className="mt-3 text-lg font-black text-slate-950">
Posters Coming Soon
</h3>

<p className="mt-2 text-sm font-semibold text-slate-600">
{selectedCompany
? `Posters for ${selectedCompany.name} are coming soon.`
: selectedCompanyId ===
"GENERAL"
? "General posters for this category are coming soon."
: "No posters are available for this selection yet."}
</p>

</div>
) : (
<div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

{visiblePosters.map(
(
poster
) => {
const metric =
posterMetrics[
poster.id
] || {
downloadCount:
0,

averageRating:
0,

ratingCount:
0,

userRating:
0,
};

return (
<article
key={
poster.id
}
className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
>

<div className="relative overflow-hidden bg-slate-900">

<img
src={
poster.fileUrl
}
alt={
poster.title
}
draggable={
false
}
onContextMenu={(
event
) =>
event.preventDefault()
}
className="aspect-square w-full select-none object-contain"
/>

<PreviewMask
text={
maskText
}
/>

</div>

<div className="grid grid-cols-[42%_58%] bg-gradient-to-r from-slate-950 via-blue-950 to-blue-700 p-3 text-white">

<div className="flex flex-col items-start justify-center border-r border-white/25 pr-3">

{poster.company
?.logoUrl ? (
<div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-white p-1">

<img
src={
poster.company.logoUrl
}
alt={
poster.company.name ||
"Insurance company"
}
className="max-h-full max-w-full object-contain"
/>

</div>
) : (
<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-xl">
🌐
</div>
)}

<p className="mt-2 text-[10px] font-black leading-tight text-white">
{poster.company
?.name ||
"General Insurance"}
</p>

</div>

<div className="flex items-center gap-3 pl-3">

{agentLogo && (
<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">

<img
src={
agentLogo
}
alt="Agent logo"
className="max-h-full max-w-full object-contain"
/>

</div>
)}

<div className="min-w-0">

<p className="text-[9px] font-black uppercase tracking-wide text-blue-200">
Contact Us
</p>

<p className="truncate text-xs font-black text-white">
{agentName}
</p>

<p className="mt-0.5 text-sm font-black text-white">
{displayPhone(
agentMobile
)}
</p>

</div>

</div>

</div>

<div className="p-4">

<h3 className="text-base font-black text-slate-950">
{poster.title}
</h3>

<p className="mt-1 text-sm font-black text-blue-700">
{poster.category
?.name ||
"Insurance Poster"}
</p>

{poster.source ===
"AGENT" &&
poster.uploadedBy
?.name && (
<div className="mt-3 rounded-xl bg-violet-50 px-3 py-2">

<p className="text-[10px] font-black uppercase text-violet-600">
Contributor Credit
</p>

<p className="text-xs font-black text-violet-900">
{
poster.uploadedBy.name
}
</p>

</div>
)}

{poster.createdAt && (
<p className="mt-2 text-xs font-semibold text-slate-500">
Added{" "}
{formatDate(
poster.createdAt
)}
</p>
)}

<div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3">

<div className="flex items-start justify-between gap-3">

<div>

<p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
Rate This Poster
</p>

<div className="mt-1">

<StarRating
value={
metric.userRating
}
disabled={
ratingPosterId ===
poster.id
}
onRate={(
rating
) =>
void ratePoster(
poster.id,
rating
)
}
/>

</div>

</div>

<div className="text-right">

<p className="text-sm font-black text-slate-900">
⭐{" "}
{Number(
metric.averageRating
).toFixed(
1
)}
</p>

<p className="text-[10px] font-bold text-slate-500">
{
metric.ratingCount
}{" "}
rating
{metric.ratingCount ===
1
? ""
: "s"}
</p>

</div>

</div>

<div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3">

{isAdmin ? (
<p className="text-xs font-black text-blue-800">
⬇{" "}
{
metric.downloadCount
}{" "}
download
{metric.downloadCount ===
1
? ""
: "s"}
</p>
) : (
<p className="text-xs font-black text-slate-500">
Poster rating
</p>
)}

{metric.userRating >
0 && (
<p className="text-[10px] font-black text-amber-700">
Your Rating:{" "}
{
metric.userRating
}
/5
</p>
)}

</div>

</div>

<div
className={`mt-4 grid gap-2 ${
isAdmin
? "grid-cols-2"
: "grid-cols-1"
}`}
>

<button
type="button"
disabled={
preparingPosterId ===
poster.id
}
onClick={() =>
void downloadPoster(
poster
)
}
className="rounded-xl bg-blue-700 py-3 font-black text-white hover:bg-blue-800 disabled:bg-slate-400"
>
{preparingPosterId ===
poster.id
? "Preparing..."
: "⬇ Download"}
</button>

{isAdmin && (
<button
type="button"
onClick={() =>
void deletePoster(
poster
)
}
className="rounded-xl border border-red-200 py-3 font-black text-red-600"
>
🗑 Delete
</button>
)}

</div>

</div>

</article>
);
}
)}

</div>
)}

</section>

{/* DISCLAIMER */}

<section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">

<p className="text-xs font-black uppercase tracking-wide text-amber-800">
Disclaimer
</p>

<p className="mt-1 text-xs font-semibold leading-5 text-amber-900">
For Viewing & Identification Purpose Only. Insurance company names, logos and trademarks belong to their respective owners. Their display on this portal does not imply ownership, partnership, sponsorship or endorsement.
</p>

</section>

</div>

</main>
);
}