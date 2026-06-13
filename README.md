# ResumeGen

A fully customizable, client-side resume builder web application.

## Features
- **Import:** JSON, LinkedIn Profile Zip, PDF, or raw text.
- **Export:** High-resolution ATS-friendly PDF or structured JSON.
- **10 Templates:** Modern, Classic, Minimal, Executive, Creative, ATS Pro, Tech, Bold, Compact, and Serif.
- **Customization:** 20+ precise accent colors, custom color picker, 20+ typography options, custom font uploads, and an applicant photo field.
- **Interactive Manual Pagination:** Pull up or push down individual projects/experience entries dynamically from the live preview to customize page-break margins.
- **Customizable PDF Downloads:** Configure font size, line spacing, and margins specifically for the downloaded PDF.
- **Lightweight PDFs (< 2MB):** Automatic client-side image compression on photo upload ensures the exported PDF complies with standard job portal file limits.
- **Privacy First:** All data is processed locally in your browser. No server storage.
- **Glassmorphic UI:** Modern and sleek responsive interface.

## Tech Stack
- HTML5, CSS3, Vanilla JavaScript
- `pdf.js` for PDF text extraction

## Setup
No build step is required! Just serve the root directory locally using any basic HTTP server:

```bash
python -m http.server 5173
```
Then navigate to `http://localhost:5173` in your browser.

## Contributing
Pull requests welcome. Use the vanilla JS architecture gracefully.

