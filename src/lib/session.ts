import crypto from "crypto";
import type {
  NextRequest,
  NextResponse,
} from "next/server";

/* -------------------------------------------------------------------------- */
/* SESSION CONFIG                                                             */
/* -------------------------------------------------------------------------- */

export const SESSION_COOKIE_NAME =
  "agentsindia_session";

const SESSION_MAX_AGE_SECONDS =
  60 * 60 * 24 * 7;

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type SessionAccountType =
  | "USER"
  | "STAFF";

export type SessionPayload = {
  loginId: string;
  userId: string;
  staffId: string | null;

  accountType:
    SessionAccountType;

  role: string;

  name?: string | null;
  phone?: string | null;

  iat: number;
  exp: number;
};

export type CreateSessionInput = {
  loginId: string;
  userId: string;
  staffId?: string | null;

  accountType:
    SessionAccountType;

  role: string;

  name?: string | null;
  phone?: string | null;
};

/* -------------------------------------------------------------------------- */
/* SECRET                                                                     */
/* -------------------------------------------------------------------------- */

function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not configured."
    );
  }

  return secret;
}

/* -------------------------------------------------------------------------- */
/* BASE64 URL                                                                 */
/* -------------------------------------------------------------------------- */

function toBase64Url(
  value: string
) {
  return Buffer.from(
    value,
    "utf8"
  ).toString(
    "base64url"
  );
}

function fromBase64Url(
  value: string
) {
  return Buffer.from(
    value,
    "base64url"
  ).toString(
    "utf8"
  );
}

/* -------------------------------------------------------------------------- */
/* SIGNATURE                                                                  */
/* -------------------------------------------------------------------------- */

function sign(
  encodedPayload: string
) {
  return crypto
    .createHmac(
      "sha256",
      getSessionSecret()
    )
    .update(
      encodedPayload
    )
    .digest(
      "base64url"
    );
}

function signaturesMatch(
  actual: string,
  expected: string
) {
  try {
    const actualBuffer =
      Buffer.from(
        actual,
        "base64url"
      );

    const expectedBuffer =
      Buffer.from(
        expected,
        "base64url"
      );

    if (
      actualBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      actualBuffer,
      expectedBuffer
    );
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE SESSION TOKEN                                                       */
/* -------------------------------------------------------------------------- */

export function createSessionToken(
  input: CreateSessionInput
) {
  const now =
    Math.floor(
      Date.now() / 1000
    );

  const payload:
    SessionPayload = {
      loginId:
        input.loginId,

      userId:
        input.userId,

      staffId:
        input.staffId ??
        null,

      accountType:
        input.accountType,

      role:
        input.role,

      name:
        input.name ??
        null,

      phone:
        input.phone ??
        null,

      iat:
        now,

      exp:
        now +
        SESSION_MAX_AGE_SECONDS,
    };

  const encodedPayload =
    toBase64Url(
      JSON.stringify(
        payload
      )
    );

  const signature =
    sign(
      encodedPayload
    );

  return `${encodedPayload}.${signature}`;
}

/* -------------------------------------------------------------------------- */
/* VERIFY SESSION TOKEN                                                       */
/* -------------------------------------------------------------------------- */

export function verifySessionToken(
  token?: string | null
): SessionPayload | null {
  if (!token) {
    return null;
  }

  try {
    const [
      encodedPayload,
      signature,
    ] =
      token.split(".");

    if (
      !encodedPayload ||
      !signature
    ) {
      return null;
    }

    const expectedSignature =
      sign(
        encodedPayload
      );

    if (
      !signaturesMatch(
        signature,
        expectedSignature
      )
    ) {
      return null;
    }

    const parsed =
      JSON.parse(
        fromBase64Url(
          encodedPayload
        )
      ) as
        Partial<SessionPayload>;

    const now =
      Math.floor(
        Date.now() / 1000
      );

    if (
      !parsed.loginId ||
      !parsed.userId ||
      !parsed.accountType ||
      !parsed.role ||
      !parsed.exp ||
      parsed.exp <= now
    ) {
      return null;
    }

    if (
      parsed.accountType !==
        "USER" &&
      parsed.accountType !==
        "STAFF"
    ) {
      return null;
    }

    return {
      loginId:
        String(
          parsed.loginId
        ),

      userId:
        String(
          parsed.userId
        ),

      staffId:
        parsed.staffId
          ? String(
              parsed.staffId
            )
          : null,

      accountType:
        parsed.accountType,

      role:
        String(
          parsed.role
        ),

      name:
        parsed.name
          ? String(
              parsed.name
            )
          : null,

      phone:
        parsed.phone
          ? String(
              parsed.phone
            )
          : null,

      iat:
        Number(
          parsed.iat ||
          0
        ),

      exp:
        Number(
          parsed.exp
        ),
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* COOKIE                                                                     */
/* -------------------------------------------------------------------------- */

export function setSessionCookie(
  response: NextResponse,
  token: string
) {
  response.cookies.set({
    name:
      SESSION_COOKIE_NAME,

    value:
      token,

    httpOnly:
      true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "lax",

    path:
      "/",

    maxAge:
      SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

export function clearSessionCookie(
  response: NextResponse
) {
  response.cookies.set({
    name:
      SESSION_COOKIE_NAME,

    value:
      "",

    httpOnly:
      true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "lax",

    path:
      "/",

    maxAge:
      0,
  });

  return response;
}

/* -------------------------------------------------------------------------- */
/* REQUEST SESSION                                                            */
/* -------------------------------------------------------------------------- */

export function getSessionFromRequest(
  request: NextRequest
) {
  const token =
    request.cookies.get(
      SESSION_COOKIE_NAME
    )?.value;

  return verifySessionToken(
    token
  );
}

/* -------------------------------------------------------------------------- */
/* SESSION HELPERS                                                            */
/* -------------------------------------------------------------------------- */

export function isStaffSession(
  session:
    SessionPayload | null
) {
  return Boolean(
    session &&
      session.accountType ===
        "STAFF" &&
      session.staffId
  );
}

export function isUserSession(
  session:
    SessionPayload | null
) {
  return Boolean(
    session &&
      session.accountType ===
        "USER"
  );
}