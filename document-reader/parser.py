from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Iterable


def _clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("\ufeff", " ").replace("\r", "\n")
    value = re.sub(r"[\t ]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def _flat(value: str) -> str:
    return re.sub(r"\s+", " ", _clean_text(value)).strip()


def _money(value: str | None) -> float | None:
    if not value:
        return None
    value = re.sub(r"[^0-9.]", "", value.replace(",", ""))
    if not value:
        return None
    try:
        return round(float(value), 2)
    except ValueError:
        return None


def _date_iso(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().replace(".", "/").replace("-", "/")
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def _first(patterns: Iterable[str], text: str, flags: int = re.I | re.S) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags)
        if match:
            value = match.group(1).strip(" :\t\n\r-")
            if value:
                return value
    return None


def _normalize_registration(raw: str | None) -> str | None:
    if not raw:
        return None
    token = re.sub(r"[^A-Z0-9]", "", raw.upper())
    # Common OCR fixes only in the state/district prefix context.
    token = token.replace("O", "0") if re.fullmatch(r"[A-Z]{2}\d{1,2}[A-Z]{1,3}[A-Z0-9]{1,4}", token) and token[2:4].isalpha() else token
    m = re.fullmatch(r"([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})", token)
    if not m:
        return raw.strip().upper()
    return "-".join(m.groups())


def _find_registration(text: str) -> str | None:
    upper = text.upper()
    patterns = [
        # With separators/spaces.
        r"\b([A-Z]{2}\s*[- ]?\s*\d{1,2}\s*[- ]?\s*[A-Z]{1,3}\s*[- ]?\s*\d{1,4})\b",
        # Compact old/new RC format.
        r"\b([A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4})\b",
    ]
    for pat in patterns:
        for match in re.finditer(pat, upper):
            candidate = match.group(1)
            compact = re.sub(r"[^A-Z0-9]", "", candidate)
            # Exclude obvious policy / tax IDs.
            if len(compact) <= 11:
                return _normalize_registration(candidate)
    return None


def _insurer(text: str) -> str | None:
    upper = text.upper()
    known = [
        ("UNITED INDIA INSURANCE", "United India Insurance Company Limited"),
        ("NEW INDIA ASSURANCE", "The New India Assurance Company Limited"),
        ("ORIENTAL INSURANCE", "The Oriental Insurance Company Limited"),
        ("NATIONAL INSURANCE", "National Insurance Company Limited"),
        ("ICICI LOMBARD", "ICICI Lombard General Insurance Company Limited"),
        ("HDFC ERGO", "HDFC ERGO General Insurance Company Limited"),
        ("BAJAJ ALLIANZ", "Bajaj Allianz General Insurance Company Limited"),
        ("TATA AIG", "Tata AIG General Insurance Company Limited"),
        ("SBI GENERAL", "SBI General Insurance Company Limited"),
        ("RELIANCE GENERAL", "Reliance General Insurance Company Limited"),
        ("IFFCO TOKIO", "IFFCO Tokio General Insurance Company Limited"),
        ("CHOLA MS", "Cholamandalam MS General Insurance Company Limited"),
        ("GO DIGIT", "Go Digit General Insurance Limited"),
        ("DIGIT GENERAL", "Go Digit General Insurance Limited"),
        ("ACKO", "ACKO General Insurance Limited"),
        ("ZUNO", "Zuno General Insurance Limited"),
        ("ROYAL SUNDARAM", "Royal Sundaram General Insurance Company Limited"),
        ("KOTAK GENERAL", "Kotak Mahindra General Insurance Company Limited"),
        ("LIBERTY GENERAL", "Liberty General Insurance Limited"),
        ("FUTURE GENERALI", "Generali Central Insurance Company Limited"),
        ("SHRIRAM GENERAL", "Shriram General Insurance Company Limited"),
        ("MAGMA HDI", "Magma General Insurance Limited"),
        ("NAVI GENERAL", "Navi General Insurance Limited"),
    ]
    for needle, canonical in known:
        if needle in upper:
            return canonical

    line = _first(
        [r"^\s*([A-Z][A-Z &.()'-]{4,80}(?:INSURANCE|ASSURANCE)[A-Z &.()'-]*(?:LTD\.?|LIMITED))\s*$"],
        text,
        re.I | re.M,
    )
    return re.sub(r"\s+", " ", line).title() if line else None


def _vehicle_class(text: str, make_model: str = "") -> tuple[str | None, str | None]:
    upper = f"{text}\n{make_model}".upper()
    if any(x in upper for x in ("M'CYCLE", "MOTORCYCLE", "SCOOTER", "TWO WHEELER", "2WN", "ACTIVA", "PASSION PRO")):
        subclass = "Scooter" if any(x in upper for x in ("SCOOTER", "ACTIVA")) else "Motorcycle"
        return "TWO_WHEELER", subclass
    if any(x in upper for x in ("PRIVATE CAR", "MOTOR CAR", "LMV CAR")):
        return "PRIVATE_CAR", None
    if any(x in upper for x in ("GOODS CARRIAGE", "GOODS CARRYING", "TRUCK", "PICKUP")):
        return "GOODS_CARRYING", None
    if any(x in upper for x in ("PASSENGER CARRYING", "TAXI", "BUS", "AUTO RICKSHAW")):
        return "PASSENGER_CARRYING", None
    if any(x in upper for x in ("TRACTOR", "EXCAVATOR", "CRANE", "EARTH MOVER", "SPECIAL PURPOSE")):
        return "MISC_SPECIAL", None
    return None, None


def _cover_type(text: str) -> str | None:
    # Cover type must be detected from the schedule/certificate heading, not from
    # generic wording later in the policy that mentions third-party liability.
    head = text[:3500].upper()
    if "LIABILITY ONLY" in head:
        return "THIRD_PARTY"
    if "STANDALONE OWN DAMAGE" in head or "STANDALONE OD" in head:
        return "STANDALONE_OD"
    if "PACKAGE POLICY" in head or "MOTORCYCLE / SCOOTER - PACKAGE" in head or "COMPREHENSIVE" in head:
        return "COMPREHENSIVE"
    if "THIRD PARTY" in head:
        return "THIRD_PARTY"
    if "MOTOR INSURANCE" in head:
        return "STANDARD"
    return None


def _extract_make_model(text: str) -> tuple[str | None, str | None]:
    # Best layout in many digital policy schedules.
    segment = _first(
        [
            r"Vehicle Make\s*&\s*Model\s*\n(.{3,180}?)\n\s*Type Of Body",
            r"Make/Model\s*\n(?:Type of Body[^\n]*\nYear of Mfg[^\n]*\nCubic[^\n]*\nCapacity[^\n]*\nSeating[^\n]*\ndriver[^\n]*\nVehicle[^\n]*\nTrailer[^\n]*\n\(if[^\n]*\nany\)[^\n]*\n)?(?:[^\n]*\n){0,8}?([A-Z][A-Z0-9 ()&./'-]{4,160})\n",
        ],
        text,
    )
    if segment:
        segment = re.sub(r"\s+", " ", segment).strip()
        segment = re.sub(r"\b(?:Type Of Body|AA Membership).*", "", segment, flags=re.I).strip()
        # UIIC uses either / or & between make and model.
        if " / " in segment:
            make, model = segment.split(" / ", 1)
            return make.strip(), model.strip()
        if " & " in segment:
            make, model = segment.rsplit(" & ", 1)
            return make.strip(), model.strip()

    # RC cards commonly print Maker's Name and Model Name separately.
    make = _first(
        [
            r"Maker'?s?\s*Name\s*:?[ \t]*([^\n]{3,100})",
            r"Maker'?s?\s*Name\s*\n([^\n]{3,100})",
        ],
        text,
        re.I,
    )
    model = _first(
        [
            r"Model\s*Name\s*:?[ \t]*([^\n]{2,100})",
            r"Model\s*Name\s*\n([^\n]{2,100})",
            r"Maker'?s?\s*Classification\s*:?[ \t]*([^\n]{2,100})",
        ],
        text,
        re.I,
    )
    return (make.strip() if make else None, model.strip() if model else None)


def _policy_product(text: str) -> str | None:
    upper_lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    for line in upper_lines[:80]:
        u = line.upper()
        if "MOTORCYCLE / SCOOTER" in u and ("PACKAGE" in u or "LIABILITY ONLY" in u):
            return line.title().replace("Uin:", "UIN:")
        if "MOTOR INSURANCE" in u and "POLICY" in u and len(line) < 140:
            return line.title()
    return None


def _parse_policy(text: str) -> dict[str, Any]:
    flat = _flat(text)
    policy_number = _first(
        [
            r"Policy\s*(?:No\.?|Number)\s*:?\s*([A-Z0-9/-]{8,40})",
            r"Certificate\s*Number\s*:?\s*([A-Z0-9/-]{8,40})",
        ],
        flat,
        re.I,
    )
    company = _insurer(text)
    registration = _find_registration(text)

    start_raw = _first(
        [
            r"Period of Insurance\s*From.*?of\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"Insurance Start Date\s*&\s*Time\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"Insurance Start Date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        ],
        flat,
    )
    expiry_raw = _first(
        [
            r"Period of Insurance\s*From.*?To\s*(?:Midnight\s*of\s*)?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"Insurance expiry Date\s*&\s*Time\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"Insurance Expiry Date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
        ],
        flat,
    )

    premium_raw = _first(
        [
            r"TOTAL PAYABLE PREMIUM\s*(?:₹|Rs\.?|INR)?\s*:?\s*([\d,]+(?:\.\d{1,2})?)",
            r"Total\s*\(Rounded Off\)\s*:?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)",
            r"Receipt Amount\s*:?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)",
            r"Premium\s*:\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)",
        ],
        flat,
    )

    idv_raw = _first(
        [
            r"Insured'?s? Declared Value\s*(?:\([^)]*\))?\s*:?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)",
            r"INSURED DECLARED VALUE.*?\bVehicle\b.*?\b([\d,]+(?:\.\d{1,2})?)\b",
        ],
        flat,
    )

    ncb_raw = _first(
        [
            r"(?:NCB|No Claim Bonus)(?:\s*Discount)?\s*[:%-]?\s*(\d{1,3}(?:\.\d+)?)\s*%",
            r"(\d{1,3}(?:\.\d+)?)\s*%\s*(?:NCB|No Claim Bonus)",
        ],
        flat,
    )

    year_raw = _first(
        [
            r"Year\s*(?:Of|of)\s*(?:Manufacture|Mfg)\s*:?\s*(\d{4})",
            r"Year of Mfg\s*.*?\b(19\d{2}|20\d{2})\b",
        ],
        flat,
    )

    engine = None
    chassis = None

    vehicle_segment = text
    marker = text.lower().find("particulars of vehicle insured")
    if marker >= 0:
        vehicle_segment = text[marker: marker + 1800]

    serial_candidates = []
    for token in re.findall(r"\b[A-Z0-9]{10,20}\b", vehicle_segment.upper()):
        if any(ch.isdigit() for ch in token) and any(ch.isalpha() for ch in token):
            if token not in serial_candidates:
                serial_candidates.append(token)

    if serial_candidates:
        engine = serial_candidates[0]
    if len(serial_candidates) > 1:
        chassis = serial_candidates[1]

    if not engine:
        engine = _first(
            [r"Engine(?:/Motor)?\s*(?:No\.?|Number)\s*:?\s*([A-Z0-9]{7,30})"],
            flat,
        )
    if not chassis:
        chassis = _first(
            [r"Chassis\s*(?:No\.?|Number)\s*:?\s*([A-Z0-9]{10,30})"],
            flat,
        )
    fuel = _first(
        [
            r"Type Of Body\s*/\s*Fuel\s*Type.*?/\s*(PETROL|DIESEL|ELECTRIC|CNG|LPG|HYBRID)",
            r"(?:SOLO|PILLION|BODY)[^\n/]{0,80}/\s*(PETROL|DIESEL|ELECTRIC|CNG|LPG|HYBRID)",
            r"Fuel(?:\s*Type)?\s*:?\s*(PETROL|DIESEL|ELECTRIC|CNG|LPG|HYBRID)",
        ],
        flat,
    )

    make, model = _extract_make_model(text)
    make_model = " ".join(x for x in (make, model) if x)
    vehicle_class, subclass = _vehicle_class(text, make_model)
    cover_type = _cover_type(text)

    fields = {
        "policyNumber": policy_number,
        "previousPolicyNumber": _first(
            [r"Previous Policy No\s*:?\s*([A-Z0-9/-]{6,40})", r"Previous Policy Number\s*:?\s*([A-Z0-9/-]{6,40})"],
            flat,
            re.I,
        ),
        "companyName": company,
        "productName": _policy_product(text),
        "premium": _money(premium_raw),
        "sumInsured": None,
        "startDate": _date_iso(start_raw),
        "expiryDate": _date_iso(expiry_raw),
        "motorVehicleClass": vehicle_class,
        "motorVehicleSubClass": subclass,
        "motorCoverType": cover_type,
        "vehicleRegistrationNumber": registration,
        "vehicleMake": make,
        "vehicleModel": model,
        "vehicleYear": int(year_raw) if year_raw and year_raw.isdigit() else None,
        "vehicleIdv": _money(idv_raw),
        "vehicleNcbPercent": _money(ncb_raw),
        "ownerName": _first(
            [r"Name of the Insured\s*:?\s*([^\n]{3,80})", r"Insured Name/ID\s*:?\s*([^/\n]{3,80})"],
            text,
            re.I,
        ),
        "engineNumber": engine,
        "chassisNumber": chassis,
        "fuelType": fuel.strip().title() if fuel else None,
    }
    return fields


def _parse_rc(text: str) -> dict[str, Any]:
    flat = _flat(text)
    registration = _find_registration(text)
    make, model = _extract_make_model(text)

    # Some old Kerala RCs use Brief Description as a useful model fallback.
    if not model:
        model = _first(
            [r"Brief Description\s*:?\s*([^\n]{3,100})"],
            text,
            re.I,
        )

    year_raw = _first(
        [
            r"Year of mnfr\s*:?\s*(\d{4})",
            r"Year of m(?:anufacture|fg)\s*:?\s*(\d{4})",
            r"Month-Year of Mfg\.?\s*:?\s*(?:\d{1,2}[-/]?)?(\d{4})",
            r"Month-Year of Mfg\.?\s*:?\s*\d{1,2}[-/](\d{4})",
        ],
        flat,
    )
    if not year_raw:
        # Visible old RC layout: "Month of mnfr : Aug    Year of mnfr : 2018"
        year_raw = _first([r"Year of mnfr\s*:?\s*(\d{4})"], flat)

    engine = _first(
        [
            r"Engine(?:/Motor)?\s*(?:No\.?|Number)\s*:?\s*([A-Z0-9]{7,30})",
            r"Engine/Motor No\s*:?\s*([A-Z0-9]{7,30})",
        ],
        flat,
    )
    chassis = _first(
        [r"Chassis\s*(?:No\.?|Number)\s*:?\s*([A-Z0-9]{10,30})"],
        flat,
    )
    fuel = _first(
        [r"Fuel\s*:?\s*(PETROL|DIESEL|ELECTRIC|CNG|LPG|HYBRID)"],
        flat,
    )
    owner = _first(
        [
            r"Name of Regd\.? Owner\s*:?\s*([^\n]{3,80})",
            r"Owner Name\s*:?\s*([^\n]{3,80})",
            r"Registered Owner\s*:?\s*([^\n]{3,80})",
        ],
        text,
        re.I,
    )

    vehicle_class, subclass = _vehicle_class(text, " ".join(x for x in (make, model) if x))

    return {
        "policyNumber": None,
        "companyName": None,
        "productName": None,
        "premium": None,
        "sumInsured": None,
        "startDate": None,
        "expiryDate": None,
        "motorVehicleClass": vehicle_class,
        "motorVehicleSubClass": subclass,
        "motorCoverType": None,
        "vehicleRegistrationNumber": registration,
        "vehicleMake": make,
        "vehicleModel": model,
        "vehicleYear": int(year_raw) if year_raw and year_raw.isdigit() else None,
        "vehicleIdv": None,
        "vehicleNcbPercent": None,
        "ownerName": owner,
        "engineNumber": engine,
        "chassisNumber": chassis,
        "fuelType": fuel.title() if fuel else None,
    }


def _parse_aadhaar(text: str) -> dict[str, Any]:
    flat = _flat(text)
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines() if line.strip()]

    aadhaar_number = _first(
        [
            r"\b(\d{4}\s+\d{4}\s+\d{4})\b",
            r"\b(\d{12})\b",
        ],
        flat,
        re.I,
    )
    last4 = re.sub(r"\D", "", aadhaar_number or "")[-4:] or None

    dob_raw = _first(
        [
            r"(?:DOB|Date of Birth)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
            r"(?:DOB|Date of Birth)\s*:?\s*(\d{4}[/-]\d{1,2}[/-]\d{1,2})",
        ],
        flat,
        re.I,
    )
    yob = _first(
        [r"(?:YOB|Year of Birth)\s*:?\s*(19\d{2}|20\d{2})"],
        flat,
        re.I,
    )
    gender = _first(
        [r"\b(MALE|FEMALE|TRANSGENDER)\b"],
        flat,
        re.I,
    )

    # Aadhaar layouts vary greatly. Prefer a short line before DOB/YOB as the name.
    name = _first(
        [
            r"(?:Name)\s*:?\s*([A-Z][A-Z .]{2,80}?)(?=\s+(?:DOB|YOB|Date of Birth|Year of Birth|Male|Female)\b)",
        ],
        flat,
        re.I,
    )
    if not name:
        stop_words = {
            "GOVERNMENT OF INDIA", "GOVT OF INDIA", "AADHAAR", "UNIQUE IDENTIFICATION AUTHORITY OF INDIA",
            "MALE", "FEMALE", "TRANSGENDER", "DOB", "YOB", "ADDRESS"
        }
        for line in lines[:25]:
            u = line.upper().strip(" :")
            if any(word in u for word in stop_words):
                continue
            if re.fullmatch(r"[A-Za-z][A-Za-z .]{2,60}", line) and 1 <= len(line.split()) <= 6:
                name = line
                break

    address = _first(
        [
            r"Address\s*:?\s*(.{15,250}?)(?=\b\d{4}\s*\d{4}\s*\d{4}\b|\bVID\b|$)",
        ],
        text,
        re.I | re.S,
    )
    if address:
        address = re.sub(r"\s+", " ", address).strip(" ,:;-")

    return {
        "policyNumber": None,
        "previousPolicyNumber": None,
        "companyName": None,
        "productName": None,
        "premium": None,
        "sumInsured": None,
        "startDate": None,
        "expiryDate": None,
        "motorVehicleClass": None,
        "motorVehicleSubClass": None,
        "motorCoverType": None,
        "vehicleRegistrationNumber": None,
        "vehicleMake": None,
        "vehicleModel": None,
        "vehicleYear": None,
        "vehicleIdv": None,
        "vehicleNcbPercent": None,
        "ownerName": name,
        "engineNumber": None,
        "chassisNumber": None,
        "fuelType": None,
        "aadhaarName": name,
        "aadhaarDob": _date_iso(dob_raw),
        "aadhaarYearOfBirth": yob,
        "aadhaarGender": gender.title() if gender else None,
        "aadhaarAddress": address,
        "aadhaarLast4": last4,
    }


def _detect_document_type(text: str, hint: str) -> str:
    hint = (hint or "AUTO").upper()
    if hint in {"POLICY", "OLD_POLICY", "RC", "AADHAAR"}:
        return hint
    upper = text.upper()
    if "AADHAAR" in upper or "UNIQUE IDENTIFICATION AUTHORITY OF INDIA" in upper:
        return "AADHAAR"
    if "CERTIFICATE OF INSURANCE" in upper or "POLICY NUMBER" in upper or "POLICY NO" in upper:
        return "POLICY"
    if "REGISTRATION CERTIFICATE" in upper or "REGN. NUMBER" in upper or ("CHASSIS" in upper and "ENGINE" in upper):
        return "RC"
    return "UNKNOWN"


def _confidence(document_type: str, data: dict[str, Any]) -> float:
    if document_type in {"POLICY", "OLD_POLICY"}:
        keys = [
            "policyNumber", "companyName", "vehicleRegistrationNumber", "startDate",
            "expiryDate", "premium", "vehicleMake", "vehicleModel"
        ]
    elif document_type == "RC":
        keys = [
            "vehicleRegistrationNumber", "vehicleMake", "vehicleModel", "vehicleYear",
            "engineNumber", "chassisNumber", "ownerName", "fuelType"
        ]
    elif document_type == "AADHAAR":
        keys = ["aadhaarName", "aadhaarDob", "aadhaarYearOfBirth", "aadhaarGender", "aadhaarAddress", "aadhaarLast4"]
    else:
        keys = ["vehicleRegistrationNumber", "policyNumber", "vehicleMake", "vehicleModel"]
    found = sum(1 for key in keys if data.get(key) not in (None, "", []))
    return round(min(0.98, 0.35 + 0.63 * (found / max(1, len(keys)))), 2)


def parse_document(text: str, hint: str = "AUTO") -> dict[str, Any]:
    text = _clean_text(text)
    document_type = _detect_document_type(text, hint)
    if document_type in {"POLICY", "OLD_POLICY"}:
        data = _parse_policy(text)
        data["policyType"] = "MOTOR" if any(
            data.get(k) for k in ("vehicleRegistrationNumber", "vehicleMake", "vehicleModel")
        ) or "MOTOR" in text.upper() else None
    elif document_type == "RC":
        data = _parse_rc(text)
        data["policyType"] = "MOTOR"
    elif document_type == "AADHAAR":
        data = _parse_aadhaar(text)
        data["policyType"] = None
    else:
        # Try policy and RC first. Aadhaar is intentionally detected only by explicit labels/hint.
        p = _parse_policy(text)
        r = _parse_rc(text)
        p_count = sum(v not in (None, "", []) for v in p.values())
        r_count = sum(v not in (None, "", []) for v in r.values())
        if p_count >= r_count:
            data, document_type = p, "POLICY"
        else:
            data, document_type = r, "RC"
        data["policyType"] = "MOTOR" if data.get("vehicleRegistrationNumber") else None

    detected = [key for key, value in data.items() if value not in (None, "", [])]
    data["documentType"] = document_type
    data["confidence"] = _confidence(document_type, data)
    data["detectedFields"] = detected
    data["remarks"] = [
        "Extracted locally by Agents India Document Reader.",
        "Please verify extracted values before saving the policy.",
    ]
    return data
