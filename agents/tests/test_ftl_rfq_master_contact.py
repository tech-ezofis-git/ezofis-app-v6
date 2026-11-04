"""RFQ Master contact details and match safety. All data here is made up."""
from __future__ import annotations

from app.ftl.quote_estimator.rfq_master import overlay_master_addresses, pick_master_row

CLIENT = {
    "Email": "pat@test-elevator.example.com",
    "Company_Name": "Test Elevator Co",
    "Contact_Name": "Pat Example",
    "Phone_Number": "905-555-0100",
    "Billing_Address": "1 Bill Street, Toronto, ON",
    "Shipping_Address": "2 Ship Street, Toronto, ON",
}
OTHER = {
    "Email": "sam@other-lifts.example.com",
    "Company_Name": "Other Lifts Inc",
    "Contact_Name": "Sam Other",
    "Phone_Number": "416-555-0199",
    "Billing_Address": "9 Other Road, Ottawa, ON",
    "Shipping_Address": "9 Other Road, Ottawa, ON",
}


def _quote(**overrides):
    data = {
        "customer_name": "Test Elevator Co",
        "contact_name": "",
        "contact_phone": "",
        "email": "",
        "billing_address": "",
        "shipping_address": "",
        "assumptions": [],
    }
    data.update(overrides)
    return data


def test_exact_company_fills_blank_contact_details():
    out = overlay_master_addresses(_quote(), [CLIENT, OTHER])
    assert out["contact_name"] == "Pat Example"
    assert out["contact_phone"] == "905-555-0100"
    assert out["email"] == CLIENT["Email"]
    assert out["billing_address"] == CLIENT["Billing_Address"]
    assert "ℹ Missing contact details filled from RFQ Master." in out["assumptions"]


def test_contact_stated_in_the_rfq_is_kept():
    out = overlay_master_addresses(
        _quote(contact_name="Riley Site", contact_phone="905-555-0111", email="riley@test-elevator.example.com"),
        [CLIENT],
    )
    assert out["contact_name"] == "Riley Site"
    assert out["contact_phone"] == "905-555-0111"
    assert out["email"] == "riley@test-elevator.example.com"


def test_title_case_keys_are_filled_too():
    quote = {"Company Name": "Test Elevator Co", "Contact": "", "Phone Number": "", "Email": ""}
    out = overlay_master_addresses(quote, [CLIENT])
    assert out["Contact"] == "Pat Example"
    assert out["Phone Number"] == "905-555-0100"
    assert out["Email"] == CLIENT["Email"]


def test_domain_match_fills_address_but_not_a_person():
    quote = _quote(customer_name="", email="other.person@test-elevator.example.com")
    out = overlay_master_addresses(quote, [CLIENT, OTHER])
    assert out["billing_address"] == CLIENT["Billing_Address"]
    assert out["contact_name"] == ""
    assert out["contact_phone"] == ""


def test_free_mail_domain_is_not_a_client_match():
    shared = {**CLIENT, "Email": "owner@gmail.com"}
    quote = _quote(customer_name="", email="stranger@gmail.com")
    assert pick_master_row([shared], quote) is None


def test_exact_email_on_a_free_mail_domain_still_matches():
    shared = {**CLIENT, "Email": "owner@gmail.com"}
    quote = _quote(customer_name="", email="owner@gmail.com")
    assert pick_master_row([shared], quote)["Company_Name"] == "Test Elevator Co"


def test_two_different_clients_tied_means_no_match():
    twin = {**OTHER, "Company_Name": "Test Elevator Co"}
    out = overlay_master_addresses(_quote(billing_address="As written"), [CLIENT, twin])
    assert out["billing_address"] == "As written"
    assert out["contact_name"] == ""
    assert out["billing_address_from_master"] is False


def test_duplicate_rows_of_one_client_still_match():
    assert pick_master_row([CLIENT, dict(CLIENT)], _quote())["Company_Name"] == "Test Elevator Co"


def test_contact_only_row_is_recorded_as_a_match():
    row = {"Company_Name": "Test Elevator Co", "Contact_Name": "Pat Example"}
    out = overlay_master_addresses(_quote(), [row])
    assert out["contact_name"] == "Pat Example"
    assert out["rfq_master_match"] == "RFQ Master"
