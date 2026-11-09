# TIFF to searchable PDF

Scanned TIFF files (single or multi-page, fax included) are turned into **searchable PDFs**:
each page keeps its scanned image and gets an invisible OCR text layer, so the PDF can be
searched (Ctrl+F) and its text selected or copied in any PDF viewer.

It is used by **bulk upload** and **single-file upload**: the PDF is what gets stored,
indexed and archived. OCR (the index fields) still reads the **original TIFF** with the
normal OCR engine, so field quality does not change. It is a plain endpoint on the agents
service, not a separate agent.

| Part | Where |
|---|---|
| Conversion | `agents/app/services/tiff_pdf.py` |
| Endpoint | `POST /api/agents/convert/tiff-to-pdf` (`agents/app/main.py`) |
| API client | `api/src/Modules/Repository/Repository.Infrastructure/Services/TiffPdfConverterClient.cs` |
| Bulk upload hook | `RepositoryUploadIndexService.ProcessBulkOcrForStageAsync` |
| Single upload hook | `RepositoryUploadIndexService.UploadWithOcrAsync` (both overloads) |

---

## 1. Endpoint (agents service)

```
POST /api/agents/convert/tiff-to-pdf
Content-Type: multipart/form-data
```

| Form field | Required | Default | Meaning |
|---|---|---|---|
| `file` | yes | | The TIFF (`.tif` / `.tiff`, or TIFF bytes). Up to 200 MB. |
| `language` | no | `eng` | Tesseract language(s) for the text layer, e.g. `eng`, `eng+ara`. Only languages installed in the agents image can be used (today: `eng`). |
| `ocr` | no | `true` | `false` makes an image-only PDF (no text layer, faster). |

**Success: `200 OK`**, body = the PDF bytes.

| Header | Example | Meaning |
|---|---|---|
| `Content-Type` | `application/pdf` | |
| `Content-Disposition` | `attachment; filename="scan.pdf"` | TIFF name with `.pdf` |
| `X-Page-Count` | `3` | Pages in the PDF (= pages in the TIFF) |
| `X-Searchable-Pages` | `3` | Pages that got a text layer |

**Errors**

| Status | When |
|---|---|
| `400` | Not a TIFF, unreadable / empty TIFF, or a bad `language` value |
| `413` | File larger than 200 MB |

**Example**

```bash
curl -F "file=@scan.tiff;type=image/tiff" \
     -o scan.pdf -D - \
     http://localhost:8010/api/agents/convert/tiff-to-pdf
```

### How the PDF is made
1. PyMuPDF opens the TIFF and renders every page at **300 dpi** (fax resolutions such as
   204×98 dpi come out with the right proportions). Very large pages are capped at about
   A2 at 300 dpi.
2. Each page is passed to **Tesseract** (`tesseract page.png out pdf`), which writes a PDF
   page with the image and an invisible text layer.
3. Black-and-white pages (fax, text scans) are stored as **1-bit** images, which keeps the
   PDF small (a 3-page G4 fax: 57 KB TIFF → about 165 KB PDF). Colour and grey pages keep
   their colours.
4. All pages are joined into one PDF.

**Speed:** about 1–1.5 seconds per page. **No page is ever dropped:** if OCR is unavailable
for a page (Tesseract or the language missing), that page is added as an image-only page
and `X-Searchable-Pages` is lower than `X-Page-Count`.

Requirements: `tesseract-ocr` in the agents image (already installed by `agents/Dockerfile`)
and `pymupdf` (already in `requirements.txt`). Pillow (already present) is used for the
1-bit pages.

---

## 2. Upload flows (API)

Nothing changes for callers. TIFFs are recognised by name (`.tif` / `.tiff`) or type
(`image/tiff`).

**Why OCR reads the TIFF, not the PDF:** when the OCR service gets a PDF that already has
usable text, it reuses that text instead of running its own engine. The PDF's text layer is
Tesseract's, so OCR on the PDF would mean Tesseract quality for the index fields. Reading the
original TIFF keeps the normal engine (PaddleOCR) for the fields; the PDF's text layer is only
for searching inside the PDF.

### 2a. Single-file upload (Upload screen, one file)

1. `POST /api/uploadAndIndex/uploadForOcr`: OCR on the **TIFF**, as before; returns the fields.
2. `POST /api/uploadAndIndex/uploadWithOcr`: the TIFF is converted and the **PDF** is staged
   (`scan.pdf`, `application/pdf`) with the OCR fields and text.
3. `PUT index/{id}/fields`, `PUT index/{id}`: the **PDF** is archived.

The conversion runs inside step 2, so that request takes about 1–1.5 s longer per page.

### 2b. Bulk upload

When a staged file is a TIFF, the background OCR job converts it first:

1. **Upload** `POST /api/uploadAndIndex/bulkUpload`: files are staged (status Queued /
   PendingOCR) and a Hangfire OCR job is queued, as before.
2. **OCR job** (`ProcessBulkOcrForStageAsync`), per file:
   - **TIFF** (`.tif` / `.tiff` or `image/tiff`): the API calls
     `POST {agents}/api/agents/convert/tiff-to-pdf`, saves the PDF in the monitor storage,
     points the stage row at it (`file_path`, `file_name` → `.pdf`, `file_type` →
     `application/pdf`, `file_size`, `total_pages`) and deletes the TIFF.
   - OCR and field extraction then run on the **original TIFF** bytes (see above).
   - Other file types are unchanged.
3. **Index**: the indexing screen shows the PDF (`POST index/all`, `load/{id}`).
4. **Archive** `PUT /api/uploadAndIndex/index/{id}`: the **PDF** is archived with the index
   fields and OCR text, as before.

If the conversion fails (agents service down, bad TIFF), the job logs a warning, **keeps the
TIFF** and continues: OCR, indexing and archiving still work on the TIFF, so an upload never
fails because of the conversion. A retried job does not convert twice (the stage row is
already a PDF).

In both flows the archive keeps only the PDF; the original TIFF is not stored.

Not covered: uploads that skip staging (`POST /api/repositories/{id}/items/upload`,
`…/upload-archive`, workflow attachments) still store TIFFs as uploaded.

### Settings (`appsettings` → `Agents`)

| Key | Default | Meaning |
|---|---|---|
| `Agents:ChatUrl` | (existing) | The agents `/chat` URL. The converter URL is built from it: `http://agents:8000/chat` → `http://agents:8000/api/agents/convert/tiff-to-pdf`. |
| `Agents:ConvertTiffToPdf` | `true` | `false` keeps TIFFs as uploaded (no conversion). |
| `Agents:TiffPdfLanguage` | `eng` | Tesseract language(s) for the text layer. |

Example:

```json
"Agents": {
  "ChatUrl": "http://agents:8000/chat",
  "ConvertTiffToPdf": true,
  "TiffPdfLanguage": "eng"
}
```

The API waits up to 15 minutes for one conversion (long multi-page TIFFs).

---

## 3. Tests

- `agents/tests/test_tiff_pdf.py`: multi-page TIFF → one PDF page per TIFF page at the right
  size; G4 fax TIFF gets a searchable text layer; bad input rejected; endpoint returns a PDF
  with the headers, and 400 for a non-TIFF (uses the `client` fixture from `conftest.py`,
  which fakes the database, so it runs in CI without Postgres).
- `api/tests/Api.Tests/TiffPdfConverterTests.cs`: TIFF detection, PDF file name, converter
  URL from `ChatUrl`, the client posts the file and language and reads the PDF and headers,
  agent errors and non-PDF replies, the on/off switch.
