"""Server-side PII redaction of documents (PDF, scanned PDF, PNG/JPG) with PyMuPDF.

Unlike the browser overlay, this changes the file itself: the text and image pixels under each
cover are removed, so the hidden values cannot be copied, searched or recovered.
"""
