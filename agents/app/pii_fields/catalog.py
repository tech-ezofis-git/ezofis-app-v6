"""Deterministic catalog of sensitive field types.

Used two ways: to recognise existing folder fields by name (e.g. a field
called "PAN No" is a PAN number), and as the fallback recommendation set when
the LLM is unavailable or returns nothing usable.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

ALLOWED_DETECTION_TYPES = ("PATTERN", "NER", "HYBRID", "CONTEXTUAL", "METADATA")

ALLOWED_CATEGORIES = (
    "Personal Identity",
    "Contact Information",
    "Government ID",
    "Financial",
    "Employment",
    "Health",
    "Tax",
    "Document",
    "Other",
)

_NON_KEY_CHARS_RE = re.compile(r"[^a-z0-9]+")


def normalize_field_key(value: str) -> str:
    """'Aadhaar No.' -> 'aadhaar_no'. Empty when nothing usable remains."""
    key = _NON_KEY_CHARS_RE.sub("_", str(value or "").strip().lower()).strip("_")
    return key[:64]


@dataclass(frozen=True)
class PiiFieldType:
    key: str
    display_name: str
    category: str
    detection_type: str
    # Folder field names that mean this type (compared after normalize_field_key).
    aliases: tuple[str, ...] = ()
    # Folder-context keywords that make this type relevant for the fallback.
    contexts: tuple[str, ...] = ()


_PEOPLE = ("customer", "client", "kyc", "account", "bank", "loan", "member", "applicant", "employee", "hr", "patient")
_FINANCE = ("customer", "client", "kyc", "account", "bank", "loan", "payroll", "salary", "invoice", "vendor", "supplier")

CATALOG: tuple[PiiFieldType, ...] = (
    PiiFieldType("customer_name", "Customer Name", "Personal Identity", "NER",
                 ("customer_name", "client_name", "account_holder", "account_holder_name", "applicant_name"),
                 ("customer", "client", "kyc", "account", "bank", "loan", "applicant")),
    PiiFieldType("person_name", "Person Name", "Personal Identity", "NER",
                 ("name", "full_name", "employee_name", "patient_name", "member_name"),
                 ("employee", "hr", "patient", "member", "staff")),
    PiiFieldType("date_of_birth", "Date of Birth", "Personal Identity", "CONTEXTUAL",
                 ("date_of_birth", "dob", "birth_date"), _PEOPLE),
    PiiFieldType("gender", "Gender", "Personal Identity", "CONTEXTUAL", ("gender", "sex"), ()),
    PiiFieldType("father_or_spouse_name", "Father/Spouse Name", "Personal Identity", "NER",
                 ("father_name", "spouse_name", "father_or_spouse_name", "guardian_name"),
                 ("customer", "kyc", "applicant")),
    PiiFieldType("mobile_number", "Mobile Number", "Contact Information", "HYBRID",
                 ("mobile", "mobile_number", "mobile_no", "phone", "phone_number", "phone_no", "contact_number"),
                 _PEOPLE + ("vendor", "supplier")),
    PiiFieldType("email_address", "Email Address", "Contact Information", "PATTERN",
                 ("email", "email_address", "email_id", "mail_id"), _PEOPLE + ("vendor", "supplier")),
    PiiFieldType("residential_address", "Residential Address", "Contact Information", "HYBRID",
                 ("address", "residential_address", "permanent_address", "home_address", "current_address"),
                 _PEOPLE),
    PiiFieldType("aadhaar_number", "Aadhaar Number", "Government ID", "PATTERN",
                 ("aadhaar", "aadhaar_number", "aadhaar_no", "aadhar", "aadhar_number", "aadhar_no", "uid", "uidai_number"),
                 ("customer", "client", "kyc", "account", "bank", "loan", "employee", "hr", "applicant")),
    PiiFieldType("pan_number", "PAN Number", "Government ID", "PATTERN",
                 ("pan", "pan_number", "pan_no", "pan_card", "pan_card_number"),
                 ("customer", "client", "kyc", "account", "bank", "loan", "employee", "payroll", "vendor", "supplier", "invoice")),
    PiiFieldType("passport_number", "Passport Number", "Government ID", "HYBRID",
                 ("passport", "passport_number", "passport_no"), ("customer", "kyc", "applicant", "employee", "travel")),
    PiiFieldType("driving_licence_number", "Driving Licence Number", "Government ID", "HYBRID",
                 ("driving_licence", "driving_license", "dl_number", "dl_no", "licence_number", "license_number"),
                 ("customer", "kyc", "applicant")),
    PiiFieldType("voter_id", "Voter ID", "Government ID", "HYBRID",
                 ("voter_id", "voter_id_number", "epic_number", "epic_no"), ("customer", "kyc", "applicant")),
    PiiFieldType("bank_account_number", "Bank Account Number", "Financial", "HYBRID",
                 ("account_number", "account_no", "bank_account", "bank_account_number", "acc_no", "a_c_no"), _FINANCE),
    PiiFieldType("ifsc_code", "IFSC Code", "Financial", "PATTERN",
                 ("ifsc", "ifsc_code"), ("bank", "account", "customer", "payroll", "vendor", "supplier")),
    PiiFieldType("cif_number", "Customer CIF Number", "Financial", "METADATA",
                 ("cif", "cif_number", "cif_no", "customer_id", "customer_number"), ("bank", "customer", "account", "kyc")),
    PiiFieldType("upi_id", "UPI ID", "Financial", "PATTERN", ("upi", "upi_id", "vpa"), ("bank", "customer", "payment")),
    PiiFieldType("card_number", "Card Number", "Financial", "PATTERN",
                 ("card_number", "card_no", "credit_card", "debit_card"), ("bank", "card", "payment")),
    PiiFieldType("employee_id", "Employee ID", "Employment", "METADATA",
                 ("employee_id", "emp_id", "employee_number", "emp_no", "staff_id"), ("employee", "hr", "payroll", "staff")),
    PiiFieldType("salary_amount", "Salary Amount", "Employment", "CONTEXTUAL",
                 ("salary", "salary_amount", "gross_salary", "net_salary", "ctc"), ("employee", "hr", "payroll", "salary")),
    PiiFieldType("medical_record_number", "Medical Record Number", "Health", "CONTEXTUAL",
                 ("mrn", "medical_record_number", "patient_id", "uhid"), ("patient", "medical", "health", "hospital")),
    PiiFieldType("gstin", "GSTIN", "Tax", "PATTERN",
                 ("gstin", "gst_number", "gst_no", "gst_in"), ("invoice", "vendor", "supplier", "purchase", "tax")),
)

_BY_KEY = {item.key: item for item in CATALOG}
_BY_ALIAS = {alias: item for item in CATALOG for alias in item.aliases}


def get(key: str) -> PiiFieldType | None:
    return _BY_KEY.get(key)


def match_field_name(field_name: str) -> PiiFieldType | None:
    """Catalog type an existing folder field name stands for, if any."""
    return _BY_ALIAS.get(normalize_field_key(field_name))


def contextual_types(context_text: str) -> list[PiiFieldType]:
    """Catalog types whose context keywords appear in the folder name/description."""
    words = set(normalize_field_key(context_text).split("_"))
    if not words:
        return []
    return [item for item in CATALOG if any(ctx in words for ctx in item.contexts)]
