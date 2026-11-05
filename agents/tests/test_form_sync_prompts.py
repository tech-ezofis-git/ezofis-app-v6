"""The form-sync prompt keeps its field mapping rules."""
from app.prompts.form_sync_prompts import FORM_SYNC_SYSTEM_PROMPT


def test_version_cal_maps_to_version_not_version_number():
    assert "`Version_cal` -> `Version`" in FORM_SYNC_SYSTEM_PROMPT
    assert "do not put it in `Version_Number`" in FORM_SYNC_SYSTEM_PROMPT
