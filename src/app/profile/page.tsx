"use client";

import Link from "next/link";
import {
  ChangeEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AgentUser = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  role?: string;
  logoUrl?: string | null;
  state?: string | null;
  district?: string | null;
};

type LogoApiResponse = {
  success?: boolean;
  message?: string;
  logoUrl?: string | null;
};

type ProfileApiResponse = {
  success?: boolean;
  message?: string;
  user?: AgentUser;
};

/* -------------------------------------------------------------------------- */
/* CROP SETTINGS                                                              */
/* -------------------------------------------------------------------------- */

const CROP_SIZE = 320;
const OUTPUT_SIZE = 800;

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<AgentUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* ------------------------------------------------------------------------ */
  /* EDIT PROFILE                                                             */
  /* ------------------------------------------------------------------------ */

  const [editingProfile, setEditingProfile] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDistrict, setProfileDistrict] = useState("");
  const [profileState, setProfileState] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* PASSWORD                                                                 */
  /* ------------------------------------------------------------------------ */

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* PROFILE PHOTO                                                            */
  /* ------------------------------------------------------------------------ */

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);

  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);

  const [zoom, setZoom] = useState(1);

  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [dragging, setDragging] = useState(false);

  const dragStartX = useRef(0);
  const dragStartY = useRef(0);

  const dragOriginX = useRef(0);
  const dragOriginY = useRef(0);

  const [savingPhoto, setSavingPhoto] = useState(false);

  const [photoMessage, setPhotoMessage] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD USER                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("agentUser");

      if (!savedUser) {
        router.replace("/login");
        return;
      }

      const parsedUser: AgentUser = JSON.parse(savedUser);

      if (!parsedUser?.id) {
        localStorage.removeItem("agentUser");
        localStorage.removeItem("userId");

        router.replace("/login");
        return;
      }

      setUser(parsedUser);

      setProfileName(parsedUser.name || "");
      setProfileEmail(parsedUser.email || "");
      setProfileDistrict(parsedUser.district || "");
      setProfileState(parsedUser.state || "");
    } catch (error) {
      console.error("Unable to load profile:", error);

      localStorage.removeItem("agentUser");
      localStorage.removeItem("userId");

      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  /* ------------------------------------------------------------------------ */
  /* START EDIT PROFILE                                                       */
  /* ------------------------------------------------------------------------ */

  function startEditingProfile() {
    if (!user) {
      return;
    }

    setProfileName(user.name || "");
    setProfileEmail(user.email || "");
    setProfileDistrict(user.district || "");
    setProfileState(user.state || "");

    setProfileMessage("");
    setProfileSuccess(false);

    setEditingProfile(true);
  }

  /* ------------------------------------------------------------------------ */
  /* CANCEL EDIT PROFILE                                                      */
  /* ------------------------------------------------------------------------ */

  function cancelEditingProfile() {
    if (!user || savingProfile) {
      return;
    }

    setProfileName(user.name || "");
    setProfileEmail(user.email || "");
    setProfileDistrict(user.district || "");
    setProfileState(user.state || "");

    setProfileMessage("");
    setProfileSuccess(false);

    setEditingProfile(false);
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE PROFILE                                                             */
  /* ------------------------------------------------------------------------ */

  async function saveProfile() {
    if (!user?.id) {
      setProfileSuccess(false);

      setProfileMessage(
        "Login information not found. Please login again."
      );

      return;
    }

    const cleanName = profileName.trim();
    const cleanEmail = profileEmail.trim();
    const cleanDistrict = profileDistrict.trim();
    const cleanState = profileState.trim();

    if (!cleanName) {
      setProfileSuccess(false);
      setProfileMessage("Full Name is required.");
      return;
    }

    if (cleanEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(cleanEmail)) {
        setProfileSuccess(false);
        setProfileMessage("Please enter a valid email address.");
        return;
      }
    }

    try {
      setSavingProfile(true);
      setProfileMessage("");
      setProfileSuccess(false);

      const response = await fetch("/api/profile", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          userId: user.id,
          name: cleanName,
          email: cleanEmail || null,
          district: cleanDistrict || null,
          state: cleanState || null,
        }),
      });

      let data: ProfileApiResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update profile details."
        );
      }

      const updatedUser: AgentUser = {
        ...user,
        ...(data.user || {}),
        name: data.user?.name ?? cleanName,
        email: data.user?.email ?? (cleanEmail || null),
        district: data.user?.district ?? (cleanDistrict || null),
        state: data.user?.state ?? (cleanState || null),

        // These must never be changed from this form.
        phone: user.phone,
        role: user.role,
      };

      setUser(updatedUser);

      setProfileName(updatedUser.name || "");
      setProfileEmail(updatedUser.email || "");
      setProfileDistrict(updatedUser.district || "");
      setProfileState(updatedUser.state || "");

      localStorage.setItem(
        "agentUser",
        JSON.stringify(updatedUser)
      );

      localStorage.setItem(
        "userName",
        updatedUser.name || ""
      );

      localStorage.setItem(
        "userEmail",
        updatedUser.email || ""
      );

      localStorage.setItem(
        "userState",
        updatedUser.state || ""
      );

      localStorage.setItem(
        "userDistrict",
        updatedUser.district || ""
      );

      setProfileSuccess(true);

      setProfileMessage(
        data.message || "Profile updated successfully."
      );

      setEditingProfile(false);
    } catch (error) {
      console.error("UPDATE PROFILE ERROR:", error);

      setProfileSuccess(false);

      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Unable to update profile details."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* CLEAN OBJECT URL                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    return () => {
      if (cropImageUrl) {
        URL.revokeObjectURL(cropImageUrl);
      }
    };
  }, [cropImageUrl]);

  /* ------------------------------------------------------------------------ */
  /* CROP SCALE                                                               */
  /* ------------------------------------------------------------------------ */

  function getBaseScale() {
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return 1;
    }

    return Math.max(
      CROP_SIZE / naturalWidth,
      CROP_SIZE / naturalHeight
    );
  }

  /* ------------------------------------------------------------------------ */
  /* KEEP PHOTO INSIDE CROP AREA                                              */
  /* ------------------------------------------------------------------------ */

  function clampPosition(
    nextX: number,
    nextY: number,
    nextZoom = zoom
  ) {
    if (naturalWidth <= 0 || naturalHeight <= 0) {
      return {
        x: 0,
        y: 0,
      };
    }

    const scale = getBaseScale() * nextZoom;

    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;

    const maximumX = Math.max(
      0,
      (displayWidth - CROP_SIZE) / 2
    );

    const maximumY = Math.max(
      0,
      (displayHeight - CROP_SIZE) / 2
    );

    return {
      x: Math.max(
        -maximumX,
        Math.min(maximumX, nextX)
      ),

      y: Math.max(
        -maximumY,
        Math.min(maximumY, nextY)
      ),
    };
  }

  /* ------------------------------------------------------------------------ */
  /* SELECT PHOTO                                                             */
  /* ------------------------------------------------------------------------ */

  function handlePhotoSelect(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      window.alert(
        "Please select JPG, PNG or WEBP image."
      );

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      window.alert(
        "Image size must be below 5 MB."
      );

      return;
    }

    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }

    const objectUrl = URL.createObjectURL(file);

    setNaturalWidth(0);
    setNaturalHeight(0);

    setZoom(1);

    setOffsetX(0);
    setOffsetY(0);

    setDragging(false);

    setPhotoMessage("");
    setPhotoSuccess(false);

    setCropImageUrl(objectUrl);
  }

  /* ------------------------------------------------------------------------ */
  /* IMAGE READY                                                              */
  /* ------------------------------------------------------------------------ */

  function handleCropImageLoad() {
    const image = cropImageRef.current;

    if (!image) {
      return;
    }

    setNaturalWidth(image.naturalWidth);
    setNaturalHeight(image.naturalHeight);

    setZoom(1);

    setOffsetX(0);
    setOffsetY(0);
  }

  /* ------------------------------------------------------------------------ */
  /* CHANGE ZOOM                                                              */
  /* ------------------------------------------------------------------------ */

  function handleZoomChange(nextZoom: number) {
    const position = clampPosition(
      offsetX,
      offsetY,
      nextZoom
    );

    setZoom(nextZoom);

    setOffsetX(position.x);
    setOffsetY(position.y);
  }

  /* ------------------------------------------------------------------------ */
  /* DRAG PHOTO                                                               */
  /* ------------------------------------------------------------------------ */

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    setDragging(true);

    dragStartX.current = event.clientX;
    dragStartY.current = event.clientY;

    dragOriginX.current = offsetX;
    dragOriginY.current = offsetY;

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  }

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>
  ) {
    if (!dragging) {
      return;
    }

    const deltaX =
      event.clientX - dragStartX.current;

    const deltaY =
      event.clientY - dragStartY.current;

    const position = clampPosition(
      dragOriginX.current + deltaX,
      dragOriginY.current + deltaY
    );

    setOffsetX(position.x);
    setOffsetY(position.y);
  }

  function handlePointerEnd(
    event: PointerEvent<HTMLDivElement>
  ) {
    setDragging(false);

    try {
      if (
        event.currentTarget.hasPointerCapture(
          event.pointerId
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId
        );
      }
    } catch {
      // Ignore pointer release error
    }
  }

  /* ------------------------------------------------------------------------ */
  /* CREATE CROPPED IMAGE                                                     */
  /* ------------------------------------------------------------------------ */

  async function createCroppedBlob() {
    const image = cropImageRef.current;

    if (!image || !naturalWidth || !naturalHeight) {
      throw new Error("Image is not ready.");
    }

    const scale = getBaseScale() * zoom;

    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;

    const imageLeft =
      (CROP_SIZE - displayWidth) / 2 + offsetX;

    const imageTop =
      (CROP_SIZE - displayHeight) / 2 + offsetY;

    let sourceX = -imageLeft / scale;
    let sourceY = -imageTop / scale;

    let sourceSize = CROP_SIZE / scale;

    sourceX = Math.max(
      0,
      Math.min(
        naturalWidth - sourceSize,
        sourceX
      )
    );

    sourceY = Math.max(
      0,
      Math.min(
        naturalHeight - sourceSize,
        sourceY
      )
    );

    sourceSize = Math.min(
      sourceSize,
      naturalWidth - sourceX,
      naturalHeight - sourceY
    );

    const canvas = document.createElement("canvas");

    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Unable to prepare cropped image."
      );
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.clearRect(
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    const blob = await new Promise<Blob | null>(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/webp",
          0.9
        );
      }
    );

    if (!blob) {
      throw new Error("Unable to crop image.");
    }

    return blob;
  }

  /* ------------------------------------------------------------------------ */
  /* CLOSE CROP                                                               */
  /* ------------------------------------------------------------------------ */

  function closeCropper() {
    if (savingPhoto) {
      return;
    }

    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }

    setCropImageUrl(null);

    setNaturalWidth(0);
    setNaturalHeight(0);

    setZoom(1);

    setOffsetX(0);
    setOffsetY(0);

    setDragging(false);
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE CROPPED PHOTO                                                       */
  /* ------------------------------------------------------------------------ */

  async function saveCroppedPhoto() {
    if (!user?.id) {
      setPhotoSuccess(false);

      setPhotoMessage(
        "Login information not found. Please login again."
      );

      return;
    }

    try {
      setSavingPhoto(true);

      setPhotoSuccess(false);
      setPhotoMessage("");

      const croppedBlob =
        await createCroppedBlob();

      const formData = new FormData();

      formData.append("userId", user.id);

      formData.append(
        "logo",
        croppedBlob,
        "agent-logo.webp"
      );

      const response = await fetch(
        "/api/profile/logo",
        {
          method: "PATCH",
          body: formData,
        }
      );

      let data: LogoApiResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success ||
        !data.logoUrl
      ) {
        throw new Error(
          data.message ||
            "Unable to update profile photo."
        );
      }

      const updatedUser: AgentUser = {
        ...user,
        logoUrl: data.logoUrl,
      };

      setUser(updatedUser);

      localStorage.setItem(
        "agentUser",
        JSON.stringify(updatedUser)
      );

      localStorage.setItem(
        "userLogoUrl",
        data.logoUrl
      );

      setPhotoSuccess(true);

      setPhotoMessage(
        data.message ||
          "Profile photo updated successfully."
      );

      closeCropper();
    } catch (error) {
      console.error(
        "PROFILE PHOTO ERROR:",
        error
      );

      setPhotoSuccess(false);

      setPhotoMessage(
        error instanceof Error
          ? error.message
          : "Unable to update profile photo."
      );
    } finally {
      setSavingPhoto(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* CHANGE PASSWORD                                                          */
  /* ------------------------------------------------------------------------ */

  async function changePassword() {
    if (!user?.id) {
      setPasswordSuccess(false);

      setPasswordMessage(
        "Login information not found. Please login again."
      );

      return;
    }

    if (newPassword.length < 6) {
      setPasswordSuccess(false);

      setPasswordMessage(
        "Password must contain at least 6 characters."
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordSuccess(false);

      setPasswordMessage(
        "New Password and Confirm Password do not match."
      );

      return;
    }

    try {
      setChangingPassword(true);

      setPasswordMessage("");
      setPasswordSuccess(false);

      const response = await fetch(
        "/api/profile/password",
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId: user.id,
            password: newPassword,
          }),
        }
      );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to change password."
        );
      }

      setPasswordSuccess(true);

      setPasswordMessage(
        data.message ||
          "Password changed successfully."
      );

      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        error
      );

      setPasswordSuccess(false);

      setPasswordMessage(
        error instanceof Error
          ? error.message
          : "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOGOUT                                                                   */
  /* ------------------------------------------------------------------------ */

  function handleLogout() {
    localStorage.removeItem("agentUser");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userState");
    localStorage.removeItem("userDistrict");
    localStorage.removeItem("userLogoUrl");

    router.replace("/login");
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-3 text-5xl">
            👤
          </div>

          <p className="font-semibold text-slate-700">
            Loading profile...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* CROP DISPLAY VALUES                                                      */
  /* ------------------------------------------------------------------------ */

  const cropScale =
    naturalWidth && naturalHeight
      ? getBaseScale() * zoom
      : 1;

  const cropDisplayWidth =
    naturalWidth * cropScale;

  const cropDisplayHeight =
    naturalHeight * cropScale;

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5">
          <div>
            <p className="text-sm text-blue-200">
              Agent Platform
            </p>

            <h1 className="text-2xl font-bold">
              My Profile
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-4xl px-4 py-6">
        {/* PROFILE CARD */}

        <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-blue-900 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {user.logoUrl ? (
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white/80 bg-white shadow-md">
                  <img
                    src={user.logoUrl}
                    alt={user.name || "Agent"}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-4xl">
                  👤
                </div>
              )}

              <div>
                <p className="text-sm text-blue-200">
                  {user.role === "ADMIN"
                    ? "Administrator"
                    : "Insurance Agent"}
                </p>

                <h2 className="text-2xl font-bold">
                  {user.name || "Agent"}
                </h2>

                {user.phone && (
                  <p className="mt-1 text-blue-100">
                    +91 {user.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-800 shadow transition hover:bg-blue-50"
              >
                {user.logoUrl
                  ? "📷 Change Photo"
                  : "📷 Add Photo"}
              </button>

              <p className="mt-2 text-xs text-blue-100">
                Select, crop and save your preferred photo.
              </p>
            </div>
          </div>
        </div>

        {/* PHOTO MESSAGE */}

        {photoMessage && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
              photoSuccess
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {photoMessage}
          </div>
        )}

        {/* PERSONAL DETAILS */}

        <div className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Personal Details
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Mobile Number and Role cannot be changed.
              </p>
            </div>

            {!editingProfile && (
              <button
                type="button"
                onClick={startEditingProfile}
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-800"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {profileMessage && (
            <div
              className={`m-5 rounded-xl border px-4 py-3 text-sm font-bold ${
                profileSuccess
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {profileMessage}
            </div>
          )}

          {!editingProfile ? (
            /* ------------------------------------------------------------ */
            /* VIEW MODE                                                    */
            /* ------------------------------------------------------------ */

            <div className="divide-y">
              <div className="p-5">
                <p className="text-xs text-gray-500">
                  Full Name
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {user.name || "Not available"}
                </p>
              </div>

              <div className="bg-slate-50/60 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      Mobile Number
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {user.phone
                        ? `+91 ${user.phone}`
                        : "Not available"}
                    </p>
                  </div>

                  <span className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                    🔒 Locked
                  </span>
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs text-gray-500">
                  Email Address
                </p>

                <p className="mt-1 break-all font-semibold text-slate-900">
                  {user.email || "Not available"}
                </p>
              </div>

              <div className="bg-slate-50/60 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      Role
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {user.role || "AGENT"}
                    </p>
                  </div>

                  <span className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                    🔒 Locked
                  </span>
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs text-gray-500">
                  District
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {user.district || "Not available"}
                </p>
              </div>

              <div className="p-5">
                <p className="text-xs text-gray-500">
                  State
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {user.state || "Not available"}
                </p>
              </div>
            </div>
          ) : (
            /* ------------------------------------------------------------ */
            /* EDIT MODE                                                    */
            /* ------------------------------------------------------------ */

            <div className="p-5">
              <div className="grid gap-5 md:grid-cols-2">
                {/* FULL NAME */}

                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={profileName}
                    onChange={(event) =>
                      setProfileName(event.target.value)
                    }
                    placeholder="Enter full name"
                    autoComplete="name"
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* MOBILE - LOCKED */}

                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    Mobile Number
                  </label>

                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={
                        user.phone
                          ? `+91 ${user.phone}`
                          : ""
                      }
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border-2 border-slate-200 bg-slate-100 px-4 py-3.5 pr-20 font-semibold text-slate-500"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">
                      🔒
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Mobile number cannot be changed.
                  </p>
                </div>

                {/* EMAIL */}

                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(event) =>
                      setProfileEmail(event.target.value)
                    }
                    placeholder="Enter email address"
                    autoComplete="email"
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* ROLE - LOCKED */}

                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    Role
                  </label>

                  <div className="relative mt-2">
                    <input
                      type="text"
                      value={user.role || "AGENT"}
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border-2 border-slate-200 bg-slate-100 px-4 py-3.5 pr-20 font-semibold text-slate-500"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">
                      🔒
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Role cannot be changed.
                  </p>
                </div>

                {/* DISTRICT */}

                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    District
                  </label>

                  <input
                    type="text"
                    value={profileDistrict}
                    onChange={(event) =>
                      setProfileDistrict(
                        event.target.value
                      )
                    }
                    placeholder="Enter district"
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* STATE */}

                <div>
                  <label className="block text-sm font-bold text-slate-800">
                    State
                  </label>

                  <input
                    type="text"
                    value={profileState}
                    onChange={(event) =>
                      setProfileState(
                        event.target.value
                      )
                    }
                    placeholder="Enter state"
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* EDIT ACTIONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={cancelEditingProfile}
                  className="rounded-xl border-2 border-slate-300 px-6 py-3 font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => void saveProfile()}
                  className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {savingProfile
                    ? "Saving Changes..."
                    : "💾 Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CHANGE PASSWORD */}

        <div className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
              🔐
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Change Password
              </h2>

              <p className="text-xs text-slate-500">
                Enter your new password below.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-slate-800">
                New Password
              </label>

              <input
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                minLength={6}
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                minLength={6}
                autoComplete="new-password"
                placeholder="Enter password again"
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-semibold text-slate-950 outline-none focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          {passwordMessage && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
                passwordSuccess
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {passwordMessage}
            </div>
          )}

          <button
            type="button"
            disabled={changingPassword}
            onClick={() => void changePassword()}
            className="mt-5 rounded-xl bg-blue-700 px-6 py-3 font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {changingPassword
              ? "Changing Password..."
              : "Change Password"}
          </button>
        </div>

        {/* ACCOUNT */}

        <div className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Account
          </h2>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  Dashboard
                </p>

                <p className="text-xs text-gray-500">
                  Return to agent dashboard
                </p>
              </div>

              <span>→</span>
            </Link>

            <Link
              href="/sub-agents"
              className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  Sub Agents
                </p>

                <p className="text-xs text-gray-500">
                  View and manage your sub agents
                </p>
              </div>

              <span>→</span>
            </Link>

            <Link
              href="/posters"
              className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  Marketing Posters
                </p>

                <p className="text-xs text-gray-500">
                  Open marketing centre
                </p>
              </div>

              <span>→</span>
            </Link>
          </div>
        </div>

        {/* LOGOUT */}

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 w-full rounded-xl bg-red-600 p-4 font-semibold text-white transition hover:bg-red-700"
        >
          Logout
        </button>
      </section>

      {/* MOBILE NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white shadow-lg md:hidden">
        <div className="grid h-16 grid-cols-4">
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center text-gray-600"
          >
            <span className="text-lg">🏠</span>
            <span className="text-xs">Home</span>
          </Link>

          <Link
            href="/customers"
            className="flex flex-col items-center justify-center text-gray-600"
          >
            <span className="text-lg">👥</span>
            <span className="text-xs">Customers</span>
          </Link>

          <Link
            href="/posters"
            className="flex flex-col items-center justify-center text-gray-600"
          >
            <span className="text-lg">🎨</span>
            <span className="text-xs">Posters</span>
          </Link>

          <Link
            href="/profile"
            className="flex flex-col items-center justify-center text-blue-700"
          >
            <span className="text-lg">👤</span>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* CROP MODAL                                                         */}
      {/* ------------------------------------------------------------------ */}

      {cropImageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Crop Profile Photo
                  </h2>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Move the photo and zoom until the required area is inside the square.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={savingPhoto}
                  onClick={closeCropper}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-700 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5">
              {/* CROPPER */}

              <div className="mx-auto w-full max-w-[320px]">
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                  className={`relative aspect-square w-full touch-none overflow-hidden rounded-2xl bg-slate-950 ${
                    dragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                  }`}
                >
                  <img
                    ref={cropImageRef}
                    src={cropImageUrl}
                    alt="Crop preview"
                    draggable={false}
                    onLoad={handleCropImageLoad}
                    className="pointer-events-none absolute max-w-none select-none"
                    style={{
                      width:
                        cropDisplayWidth ||
                        undefined,

                      height:
                        cropDisplayHeight ||
                        undefined,

                      left: "50%",
                      top: "50%",

                      transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`,
                    }}
                  />

                  {/* CROP BORDER */}

                  <div className="pointer-events-none absolute inset-0 rounded-2xl border-4 border-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.3)]" />

                  {/* GRID */}

                  <div className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/30" />

                  <div className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-white/30" />

                  <div className="pointer-events-none absolute left-0 top-1/3 h-px w-full bg-white/30" />

                  <div className="pointer-events-none absolute left-0 top-2/3 h-px w-full bg-white/30" />
                </div>
              </div>

              {/* ZOOM */}

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="photoZoom"
                    className="text-sm font-black text-slate-800"
                  >
                    Zoom
                  </label>

                  <span className="text-sm font-bold text-blue-700">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <span className="text-lg">
                    −
                  </span>

                  <input
                    id="photoZoom"
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(event) =>
                      handleZoomChange(
                        Number(event.target.value)
                      )
                    }
                    className="w-full accent-blue-700"
                  />

                  <span className="text-lg">
                    +
                  </span>
                </div>
              </div>

              <p className="mt-4 text-center text-xs font-semibold text-slate-500">
                Drag the photo with your mouse or finger to position it.
              </p>

              {/* ACTIONS */}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={savingPhoto}
                  onClick={closeCropper}
                  className="rounded-xl border-2 border-slate-300 px-4 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    savingPhoto ||
                    !naturalWidth ||
                    !naturalHeight
                  }
                  onClick={() =>
                    void saveCroppedPhoto()
                  }
                  className="rounded-xl bg-blue-700 px-4 py-3 font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {savingPhoto
                    ? "Saving..."
                    : "Crop & Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}