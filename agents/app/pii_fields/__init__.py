"""PII field recommendations for folder (repository) configuration.

Recommends which kinds of sensitive values documents in a folder are likely
to contain, from the folder's name, description and field definitions only.
It never sees documents or record values, and it never redacts anything:
recommendations are predictions for an admin to review, not detections.
"""
