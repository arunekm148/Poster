"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AdminUser = {
  id: string;
  name?: string;
  role?: string;
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
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";

  isActive?: boolean;
  rejectionReason?: string | null;

  creditAmount?: number | string | null;
  creditedAt?: string | null;

  createdAt?: string;

  company?: {
    id?: string;
    name?: string;
    logoUrl?: string | null;
  } | null;

  category?: {
    id?: string;
    name?: string;
  } | null;

  uploadedBy?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    logoUrl?: string | null;
  } | null;

  _count?: {
    downloads?: number;
  };
};

type MediaType = "IMAGE" | "VIDEO";

type StatusFilter =
  | "ALL"
  | "APPROVED"
  | "PENDING"
  | "REJECTED";

type SourceFilter =
  | "ALL"
  | "ADMIN"
  | "AGENT";

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const CATEGORY_OPTIONS: CategoryName[] = [
  "Health Insurance",
  "Motor Insurance",
  "Life Insurance",
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value?: number | string | null) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function safeFileName(value: string) {
  return (
    value
      .replace(/[^a-z0-9]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "poster"
  );
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminMediaPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const [mediaType, setMediaType] = useState<MediaType>("IMAGE");

  const [approvedPosters, setApprovedPosters] = useState<Poster[]>([]);
  const [pendingPosters, setPendingPosters] = useState<Poster[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  /* FILTERS */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [sourceFilter, setSourceFilter] =
    useState<SourceFilter>("ALL");

  /* STATUS */

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [actionPosterId, setActionPosterId] =
    useState<string | null>(null);

  const [downloadingPosterId, setDownloadingPosterId] =
    useState<string | null>(null);

  /* APPROVAL + CREDIT */

  const [approvePosterTarget, setApprovePosterTarget] =
    useState<Poster | null>(null);

  const [approvalCredit, setApprovalCredit] = useState("0");

  /* ADMIN NEW UPLOAD */

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] =
    useState<CategoryName>("Health Insurance");
  const [uploadCompanyId, setUploadCompanyId] =
    useState("GENERAL");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] =
    useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* EDIT / RE-UPLOAD */

  const [editPoster, setEditPoster] = useState<Poster | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] =
    useState<CategoryName>("Health Insurance");
  const [editCompanyId, setEditCompanyId] =
    useState("GENERAL");

  const [replacementFile, setReplacementFile] =
    useState<File | null>(null);

  const [replacementPreview, setReplacementPreview] =
    useState<string | null>(null);

  const [savingEdit, setSavingEdit] = useState(false);

  const editFileInputRef =
    useRef<HTMLInputElement | null>(null);

  /* ------------------------------------------------------------------------ */
  /* LOAD ADMIN                                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("agentUser");

      if (!savedUser) {
        setMessage("Please login as Admin.");
        setLoading(false);
        return;
      }

      const parsed: AdminUser = JSON.parse(savedUser);

      if (!parsed?.id || parsed.role !== "ADMIN") {
        setMessage("Admin access only.");
        setLoading(false);
        return;
      }

      setAdmin(parsed);

      const params = new URLSearchParams(window.location.search);

      if (params.get("type")?.toUpperCase() === "VIDEO") {
        setMediaType("VIDEO");
      }

      void loadInitialData();
    } catch (error) {
      console.error("ADMIN MEDIA ERROR:", error);
      setMessage("Unable to load Admin Media.");
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  async function loadInitialData() {
    await Promise.all([
      loadPosters(),
      loadCompanies(),
    ]);
  }

  async function loadPosters() {
    try {
      setLoading(true);

      const [approvedResponse, pendingResponse] =
        await Promise.all([
          fetch("/api/posters", {
            cache: "no-store",
          }),
          fetch("/api/posters?pending=true", {
            cache: "no-store",
          }),
        ]);

      const approvedData = await readJson(approvedResponse);
      const pendingData = await readJson(pendingResponse);

      if (!approvedResponse.ok || approvedData.success === false) {
        throw new Error(
          approvedData.message ||
            "Unable to load published posters."
        );
      }

      if (!pendingResponse.ok || pendingData.success === false) {
        throw new Error(
          pendingData.message ||
            "Unable to load pending posters."
        );
      }

      setApprovedPosters(
        Array.isArray(approvedData.posters)
          ? approvedData.posters
          : []
      );

      setPendingPosters(
        Array.isArray(pendingData.posters)
          ? pendingData.posters
          : []
      );
    } catch (error) {
      console.error("LOAD POSTERS ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load posters."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const response = await fetch("/api/companies", {
        cache: "no-store",
      });

      const data = await readJson(response);

      if (
        response.ok &&
        data.success !== false &&
        Array.isArray(data.companies)
      ) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error("LOAD COMPANIES ERROR:", error);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const allPosters = useMemo(
    () => [
      ...pendingPosters,
      ...approvedPosters,
    ],
    [
      pendingPosters,
      approvedPosters,
    ]
  );

  const visiblePosters = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allPosters.filter((poster) => {
      if (
        statusFilter !== "ALL" &&
        poster.approvalStatus !== statusFilter
      ) {
        return false;
      }

      if (
        sourceFilter !== "ALL" &&
        poster.source !== sourceFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        poster.title,
        poster.category?.name || "",
        poster.company?.name || "",
        poster.uploadedBy?.name || "",
        poster.uploadedBy?.phone || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [
    allPosters,
    search,
    statusFilter,
    sourceFilter,
  ]);

  const pendingAgentUploads = useMemo(() => {
    return pendingPosters.filter(
      (poster) => poster.source === "AGENT"
    );
  }, [pendingPosters]);

  /* ------------------------------------------------------------------------ */
  /* MEDIA TYPE                                                               */
  /* ------------------------------------------------------------------------ */

  function changeMediaType(value: MediaType) {
    setMediaType(value);

    window.history.replaceState(
      {},
      "",
      `/admin/media?type=${value}`
    );
  }

  /* ------------------------------------------------------------------------ */
  /* NEW POSTER FILE                                                          */
  /* ------------------------------------------------------------------------ */

  function handleUploadFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      window.alert("Please select JPG, PNG or WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      window.alert("Image must be below 10 MB.");
      event.target.value = "";
      return;
    }

    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview);
    }

    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  }

  function resetUpload() {
    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview);
    }

    setUploadTitle("");
    setUploadCategory("Health Insurance");
    setUploadCompanyId("GENERAL");
    setUploadFile(null);
    setUploadPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadPoster() {
    if (!uploadTitle.trim()) {
      window.alert("Enter poster title.");
      return;
    }

    if (!uploadFile) {
      window.alert("Select poster image.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", uploadFile);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await readJson(uploadResponse);

      if (!uploadResponse.ok || uploadData.success === false) {
        throw new Error(
          uploadData.message || "Image upload failed."
        );
      }

      const fileUrl =
        uploadData.fileUrl ||
        uploadData.url ||
        "";

      if (!fileUrl) {
        throw new Error(
          "Upload did not return file URL."
        );
      }

      const response = await fetch("/api/posters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          fileUrl,
          categoryName: uploadCategory,
          companyId: uploadCompanyId,
          source: "ADMIN",
        }),
      });

      const data = await readJson(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to publish poster."
        );
      }

      setUploadOpen(false);
      resetUpload();

      setMessage("✅ Poster published successfully.");

      await loadPosters();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload poster."
      );
    } finally {
      setUploading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DOWNLOAD ORIGINAL                                                        */
  /* ------------------------------------------------------------------------ */

  async function downloadOriginal(poster: Poster) {
    try {
      setDownloadingPosterId(poster.id);

      const response = await fetch(poster.fileUrl);

      if (!response.ok) {
        throw new Error(
          "Unable to download original image."
        );
      }

      const blob = await response.blob();

      const objectUrl = URL.createObjectURL(blob);

      let extension = "jpg";

      if (blob.type === "image/png") {
        extension = "png";
      } else if (blob.type === "image/webp") {
        extension = "webp";
      }

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `${safeFileName(
        poster.title
      )}-original.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to download original poster."
      );
    } finally {
      setDownloadingPosterId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* OPEN EDIT                                                                */
  /* ------------------------------------------------------------------------ */

  function openEdit(poster: Poster) {
    setEditPoster(poster);
    setEditTitle(poster.title);

    const category = poster.category?.name;

    if (
      category === "Motor Insurance" ||
      category === "Life Insurance"
    ) {
      setEditCategory(category);
    } else {
      setEditCategory("Health Insurance");
    }

    setEditCompanyId(
      poster.company?.id || "GENERAL"
    );

    setReplacementFile(null);
    setReplacementPreview(null);

    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  }

  function closeEdit() {
    if (savingEdit) {
      return;
    }

    if (replacementPreview) {
      URL.revokeObjectURL(replacementPreview);
    }

    setEditPoster(null);
    setReplacementFile(null);
    setReplacementPreview(null);
  }

  function handleReplacementFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      window.alert(
        "Corrected poster must be JPG, PNG or WEBP."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      window.alert(
        "Corrected image must be below 10 MB."
      );

      event.target.value = "";
      return;
    }

    if (replacementPreview) {
      URL.revokeObjectURL(replacementPreview);
    }

    setReplacementFile(file);
    setReplacementPreview(URL.createObjectURL(file));
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE EDIT / RE-UPLOAD                                                    */
  /* ------------------------------------------------------------------------ */

  async function saveEdit() {
    if (!editPoster || !admin?.id) {
      return;
    }

    if (!editTitle.trim()) {
      window.alert("Poster title is required.");
      return;
    }

    try {
      setSavingEdit(true);

      let newFileUrl = "";

      if (replacementFile) {
        const formData = new FormData();

        formData.append("file", replacementFile);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await readJson(uploadResponse);

        if (!uploadResponse.ok || uploadData.success === false) {
          throw new Error(
            uploadData.message ||
              "Corrected image upload failed."
          );
        }

        newFileUrl =
          uploadData.fileUrl ||
          uploadData.url ||
          "";

        if (!newFileUrl) {
          throw new Error(
            "Upload did not return corrected image URL."
          );
        }
      }

      const response = await fetch("/api/posters", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editPoster.id,
          action: "EDIT",
          approvedByUserId: admin.id,
          title: editTitle.trim(),
          categoryName: editCategory,
          companyId: editCompanyId,
          ...(newFileUrl
            ? {
                fileUrl: newFileUrl,
              }
            : {}),
        }),
      });

      const data = await readJson(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to update poster."
        );
      }

      setMessage(
        newFileUrl
          ? "✅ Corrected image re-uploaded. Contributor remains unchanged."
          : "✅ Poster details updated."
      );

      closeEdit();
      await loadPosters();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update poster."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* APPROVE + CREDIT                                                         */
  /* ------------------------------------------------------------------------ */

  function openApprove(poster: Poster) {
    setApprovePosterTarget(poster);

    const currentCredit = Number(poster.creditAmount || 0);

    setApprovalCredit(
      Number.isFinite(currentCredit)
        ? String(currentCredit)
        : "0"
    );
  }

  function closeApprove() {
    if (actionPosterId) {
      return;
    }

    setApprovePosterTarget(null);
    setApprovalCredit("0");
  }

  async function approvePoster() {
    if (!admin?.id || !approvePosterTarget) {
      return;
    }

    const credit = Number(approvalCredit || 0);

    if (!Number.isFinite(credit) || credit < 0) {
      window.alert(
        "Enter a valid credit amount. Use 0 if no credit is required."
      );
      return;
    }

    try {
      setActionPosterId(approvePosterTarget.id);
      setMessage("");

      const response = await fetch("/api/posters", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: approvePosterTarget.id,
          action: "APPROVE",
          approvedByUserId: admin.id,
          creditAmount: credit,
        }),
      });

      const data = await readJson(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to approve poster."
        );
      }

      setMessage(
        credit > 0
          ? `✅ Poster approved. ${formatMoney(
              credit
            )} credited to contributor.`
          : "✅ Poster approved and published."
      );

      setApprovePosterTarget(null);
      setApprovalCredit("0");

      await loadPosters();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to approve poster."
      );
    } finally {
      setActionPosterId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* REJECT                                                                   */
  /* ------------------------------------------------------------------------ */

  async function rejectPoster(poster: Poster) {
    if (!admin?.id) {
      return;
    }

    const reason = window.prompt(
      "Reason for rejection:",
      ""
    );

    if (reason === null) {
      return;
    }

    const cleanReason = reason.trim();

    if (!cleanReason) {
      window.alert(
        "Rejection reason is required."
      );
      return;
    }

    try {
      setActionPosterId(poster.id);
      setMessage("");

      const response = await fetch("/api/posters", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: poster.id,
          action: "REJECT",
          approvedByUserId: admin.id,
          rejectionReason: cleanReason,
        }),
      });

      const data = await readJson(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to reject poster."
        );
      }

      setMessage(
        "Poster rejected with reason."
      );

      await loadPosters();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to reject poster."
      );
    } finally {
      setActionPosterId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE                                                                   */
  /* ------------------------------------------------------------------------ */

  async function deletePoster(poster: Poster) {
    if (
      !window.confirm(
        `Delete "${poster.title}" permanently?`
      )
    ) {
      return;
    }

    try {
      setActionPosterId(poster.id);

      const response = await fetch(
        `/api/posters?id=${encodeURIComponent(
          poster.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await readJson(response);

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to delete poster."
        );
      }

      setMessage(
        "Poster deleted successfully."
      );

      await loadPosters();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete poster."
      );
    } finally {
      setActionPosterId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ACCESS                                                                   */
  /* ------------------------------------------------------------------------ */

  if (!loading && !admin) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow">
          <div className="text-5xl">🔒</div>

          <h1 className="mt-4 text-2xl font-black">
            Admin Access
          </h1>

          <p className="mt-2 font-semibold text-slate-600">
            {message}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-black text-white"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-20 text-slate-950">
      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-black"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-300">
                Master Admin
              </p>

              <h1 className="text-2xl font-black">
                Media Management
              </h1>

              <p className="text-sm font-semibold text-blue-200">
                Agent approval, contributor credit and Admin media
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {mediaType === "IMAGE" && (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-900"
              >
                + Upload Poster
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadPosters()}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* TYPE */}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid max-w-md grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => changeMediaType("IMAGE")}
              className={`rounded-xl py-3 font-black ${
                mediaType === "IMAGE"
                  ? "bg-blue-700 text-white"
                  : "border bg-white"
              }`}
            >
              🖼️ Posters
            </button>

            <button
              type="button"
              onClick={() => changeMediaType("VIDEO")}
              className={`rounded-xl py-3 font-black ${
                mediaType === "VIDEO"
                  ? "bg-blue-700 text-white"
                  : "border bg-white"
              }`}
            >
              🎬 Videos
            </button>
          </div>
        </section>

        {mediaType === "VIDEO" ? (
          <section className="mt-5 rounded-3xl bg-white p-12 text-center">
            <div className="text-6xl">🎬</div>

            <h2 className="mt-4 text-xl font-black">
              Video Management
            </h2>

            <p className="mt-2 font-semibold text-slate-500">
              Video system will be connected separately.
            </p>
          </section>
        ) : (
          <>
            {/* PENDING AGENT ALERT */}

            {pendingAgentUploads.length > 0 && (
              <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                  Action Required
                </p>

                <h2 className="mt-1 text-xl font-black text-amber-950">
                  ⏳ {pendingAgentUploads.length} Agent Poster
                  {pendingAgentUploads.length === 1 ? "" : "s"} Awaiting Approval
                </h2>

                <p className="mt-1 text-sm font-semibold text-amber-800">
                  Review thumbnail, approve with contributor credit, or reject with a mandatory reason.
                </p>
              </section>
            )}

            {/* COUNTS */}

            <section className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="font-black text-slate-500">
                  Published
                </p>

                <p className="text-3xl font-black">
                  {approvedPosters.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="font-black text-amber-700">
                  Pending
                </p>

                <p className="text-3xl font-black">
                  {pendingPosters.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="font-black text-blue-700">
                  Total
                </p>

                <p className="text-3xl font-black">
                  {allPosters.length}
                </p>
              </div>
            </section>

            {/* FILTER */}

            <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search poster, company or contributor"
                  className="rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold"
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as StatusFilter
                    )
                  }
                  className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-bold"
                >
                  <option value="ALL">
                    All Status
                  </option>

                  <option value="APPROVED">
                    Published
                  </option>

                  <option value="PENDING">
                    Pending
                  </option>

                  <option value="REJECTED">
                    Rejected
                  </option>
                </select>

                <select
                  value={sourceFilter}
                  onChange={(event) =>
                    setSourceFilter(
                      event.target.value as SourceFilter
                    )
                  }
                  className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-bold"
                >
                  <option value="ALL">
                    All Sources
                  </option>

                  <option value="ADMIN">
                    Admin
                  </option>

                  <option value="AGENT">
                    Agent
                  </option>
                </select>
              </div>
            </section>

            {message && (
              <div className="mt-4 rounded-xl bg-blue-50 p-4 font-bold text-blue-900">
                {message}
              </div>
            )}

            {/* CARDS */}

            <section className="mt-5">
              {loading ? (
                <div className="rounded-3xl bg-white p-10 text-center font-bold">
                  Loading...
                </div>
              ) : visiblePosters.length === 0 ? (
                <div className="rounded-3xl bg-white p-10 text-center">
                  <div className="text-5xl">🖼️</div>

                  <p className="mt-3 font-black text-slate-600">
                    No posters found
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visiblePosters.map((poster) => {
                    const isPending =
                      poster.approvalStatus === "PENDING";

                    const isApproved =
                      poster.approvalStatus === "APPROVED";

                    const isRejected =
                      poster.approvalStatus === "REJECTED";

                    return (
                      <article
                        key={poster.id}
                        className="overflow-hidden rounded-3xl bg-white shadow-sm"
                      >
                        {/* THUMBNAIL */}

                        <div className="flex min-h-56 items-center justify-center bg-slate-900 p-4">
                          <img
                            src={
                              poster.thumbnailUrl ||
                              poster.fileUrl
                            }
                            alt={poster.title}
                            className="max-h-64 max-w-full rounded-xl object-contain"
                          />
                        </div>

                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="break-words font-black">
                                {poster.title}
                              </h3>

                              <p className="mt-1 font-black text-blue-700">
                                {poster.category?.name ||
                                  "Insurance Poster"}
                              </p>

                              <p className="text-sm font-semibold text-slate-500">
                                {poster.company?.name ||
                                  "General Poster"}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                                isApproved
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isRejected
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {poster.approvalStatus ||
                                "APPROVED"}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black">
                              {poster.source || "ADMIN"}
                            </span>

                            {poster.uploadedBy?.name && (
                              <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-700">
                                👤 {poster.uploadedBy.name}
                              </span>
                            )}

                            <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black text-cyan-800">
                              ⬇ {poster._count?.downloads || 0} downloads
                            </span>
                          </div>

                          {poster.uploadedBy?.phone && (
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              📱 {poster.uploadedBy.phone}
                            </p>
                          )}

                          {Number(poster.creditAmount || 0) > 0 && (
                            <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                              <p className="text-[10px] font-black uppercase text-emerald-700">
                                Contributor Credit
                              </p>

                              <p className="text-lg font-black text-emerald-900">
                                {formatMoney(
                                  poster.creditAmount
                                )}
                              </p>
                            </div>
                          )}

                          {isRejected &&
                            poster.rejectionReason && (
                              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                                <p className="text-[10px] font-black uppercase text-red-600">
                                  Rejection Reason
                                </p>

                                <p className="mt-1 text-sm font-bold text-red-800">
                                  {poster.rejectionReason}
                                </p>
                              </div>
                            )}

                          <p className="mt-3 text-xs font-semibold text-slate-400">
                            Added {formatDate(poster.createdAt)}
                          </p>

                          {/* ORIGINAL DOWNLOAD - ADMIN ONLY */}

                          <button
                            type="button"
                            disabled={
                              downloadingPosterId ===
                              poster.id
                            }
                            onClick={() =>
                              void downloadOriginal(poster)
                            }
                            className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-black text-white disabled:opacity-50"
                          >
                            {downloadingPosterId ===
                            poster.id
                              ? "Downloading..."
                              : "⬇ Download Original"}
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() => openEdit(poster)}
                            className="mt-2 w-full rounded-xl bg-blue-50 py-2.5 text-sm font-black text-blue-800"
                          >
                            ✏ Edit / Re-upload Corrected Image
                          </button>

                          {/* APPROVAL */}

                          {isPending && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={
                                  actionPosterId === poster.id
                                }
                                onClick={() =>
                                  openApprove(poster)
                                }
                                className="rounded-xl bg-emerald-700 py-2.5 text-sm font-black text-white disabled:opacity-50"
                              >
                                ✓ Approve
                              </button>

                              <button
                                type="button"
                                disabled={
                                  actionPosterId === poster.id
                                }
                                onClick={() =>
                                  void rejectPoster(poster)
                                }
                                className="rounded-xl bg-amber-100 py-2.5 text-sm font-black text-amber-800 disabled:opacity-50"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={
                              actionPosterId === poster.id
                            }
                            onClick={() =>
                              void deletePoster(poster)
                            }
                            className="mt-2 w-full rounded-xl border border-red-200 py-2.5 text-sm font-black text-red-600 disabled:opacity-50"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* APPROVE + CREDIT MODAL                                               */}
      {/* -------------------------------------------------------------------- */}

      {approvePosterTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                  Approve Agent Poster
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {approvePosterTarget.title}
                </h2>
              </div>

              <button
                type="button"
                disabled={
                  actionPosterId === approvePosterTarget.id
                }
                onClick={closeApprove}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex items-center gap-4 rounded-2xl bg-slate-50 p-3">
              <img
                src={
                  approvePosterTarget.thumbnailUrl ||
                  approvePosterTarget.fileUrl
                }
                alt={approvePosterTarget.title}
                className="h-24 w-24 rounded-xl bg-slate-900 object-contain"
              />

              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-slate-500">
                  Contributor
                </p>

                <p className="truncate font-black text-slate-950">
                  {approvePosterTarget.uploadedBy?.name ||
                    "Agent"}
                </p>

                {approvePosterTarget.uploadedBy?.phone && (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {approvePosterTarget.uploadedBy.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-black text-slate-900">
                Contributor Credit Amount
              </label>

              <div className="mt-2 flex items-center rounded-xl border-2 border-slate-300 bg-white px-3">
                <span className="font-black text-slate-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={approvalCredit}
                  onChange={(event) =>
                    setApprovalCredit(event.target.value)
                  }
                  className="w-full px-2 py-3 font-black outline-none"
                  placeholder="0"
                />
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-500">
                Enter 0 if this poster should be approved without contributor credit.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={
                  actionPosterId === approvePosterTarget.id
                }
                onClick={closeApprove}
                className="rounded-xl border border-slate-300 py-3 font-black"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  actionPosterId === approvePosterTarget.id
                }
                onClick={() =>
                  void approvePoster()
                }
                className="rounded-xl bg-emerald-700 py-3 font-black text-white disabled:opacity-50"
              >
                {actionPosterId === approvePosterTarget.id
                  ? "Approving..."
                  : "✓ Approve & Credit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* EDIT / RE-UPLOAD MODAL                                               */}
      {/* -------------------------------------------------------------------- */}

      {editPoster && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto my-8 max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  Edit Poster
                </p>

                <h2 className="text-xl font-black">
                  Correct / Re-upload
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="h-9 w-9 rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>
            </div>

            {editPoster.uploadedBy?.name && (
              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-[10px] font-black uppercase text-violet-600">
                  Contributor Locked
                </p>

                <p className="font-black text-violet-900">
                  {editPoster.uploadedBy.name}
                </p>

                <p className="mt-1 text-xs font-semibold text-violet-700">
                  Editing or replacing the image does not change the original contributor.
                </p>
              </div>
            )}

            <div className="mt-5">
              <label className="text-sm font-black">
                Poster Title
              </label>

              <input
                value={editTitle}
                onChange={(event) =>
                  setEditTitle(event.target.value)
                }
                className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-black">
                Category
              </label>

              <select
                value={editCategory}
                onChange={(event) =>
                  setEditCategory(
                    event.target.value as CategoryName
                  )
                }
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3"
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="text-sm font-black">
                Insurance Company
              </label>

              <select
                value={editCompanyId}
                onChange={(event) =>
                  setEditCompanyId(event.target.value)
                }
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3"
              >
                <option value="GENERAL">
                  General Poster
                </option>

                {companies.map((company) => (
                  <option
                    key={company.id}
                    value={company.id}
                  >
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5">
              <p className="text-sm font-black">
                Current Image
              </p>

              <div className="mt-2 overflow-hidden rounded-2xl bg-slate-900">
                <img
                  src={editPoster.fileUrl}
                  alt="Current poster"
                  className="max-h-72 w-full object-contain"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-black">
                Re-upload Corrected Image
              </label>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Optional. Leave empty to change only title, category or company.
              </p>

              <input
                ref={editFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleReplacementFile}
                className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3"
              />
            </div>

            {replacementPreview && (
              <div className="mt-4">
                <p className="text-xs font-black uppercase text-emerald-700">
                  Corrected Image Preview
                </p>

                <div className="mt-2 overflow-hidden rounded-2xl bg-slate-900">
                  <img
                    src={replacementPreview}
                    alt="Corrected preview"
                    className="max-h-80 w-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={savingEdit}
                onClick={closeEdit}
                className="rounded-xl border py-3 font-black"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingEdit}
                onClick={() => void saveEdit()}
                className="rounded-xl bg-blue-700 py-3 font-black text-white disabled:bg-slate-400"
              >
                {savingEdit
                  ? "Saving..."
                  : replacementFile
                  ? "Save & Replace Image"
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* NEW POSTER UPLOAD MODAL                                              */}
      {/* -------------------------------------------------------------------- */}

      {uploadOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="mx-auto my-8 max-w-xl rounded-3xl bg-white p-6">
            <h2 className="text-xl font-black">
              Upload New Poster
            </h2>

            <input
              value={uploadTitle}
              onChange={(event) =>
                setUploadTitle(event.target.value)
              }
              placeholder="Poster title"
              className="mt-5 w-full rounded-xl border-2 p-3"
            />

            <select
              value={uploadCategory}
              onChange={(event) =>
                setUploadCategory(
                  event.target.value as CategoryName
                )
              }
              className="mt-3 w-full rounded-xl border-2 bg-white p-3"
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>

            <select
              value={uploadCompanyId}
              onChange={(event) =>
                setUploadCompanyId(event.target.value)
              }
              className="mt-3 w-full rounded-xl border-2 bg-white p-3"
            >
              <option value="GENERAL">
                General Poster
              </option>

              {companies.map((company) => (
                <option
                  key={company.id}
                  value={company.id}
                >
                  {company.name}
                </option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUploadFile}
              className="mt-3 w-full rounded-xl border-2 p-3"
            />

            {uploadPreview && (
              <img
                src={uploadPreview}
                alt="Preview"
                className="mt-4 max-h-80 w-full rounded-2xl bg-slate-900 object-contain"
              />
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setUploadOpen(false);
                  resetUpload();
                }}
                className="rounded-xl border py-3 font-black"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={() => void uploadPoster()}
                className="rounded-xl bg-blue-700 py-3 font-black text-white disabled:bg-slate-400"
              >
                {uploading
                  ? "Uploading..."
                  : "Publish Poster"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
