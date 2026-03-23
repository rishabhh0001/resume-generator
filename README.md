# ResumeGen

A fully customizable, client-side resume builder web application.

## Features
- **Import:** JSON, LinkedIn Profile Zip, PDF, or raw text.
- **Export:** High-resolution PDF or structured JSON.
- **5 Templates:** Modern, Classic, Minimal, Executive, Creative.
- **Customization:** 20+ precise accent colors, custom color picker, 20+ typography options, custom font uploads, and an applicant photo field.
- **Privacy First:** All data is processed locally in your browser. No server storage.
- **Glassmorphic UI:** Modern and sleek responsive interface.

## Tech Stack
- HTML5, CSS3, Vanilla JavaScript
- `pdf.js` for PDF text extraction
- `html2canvas` and `jsPDF` for PDF rendering

## Setup
No build step is required! Just serve the root directory locally using any basic HTTP server:

```bash
python -m http.server 5173
```
Then navigate to `http://localhost:5173` in your browser.

## Contributing
Pull requests welcome. Use the vanilla JS architecture gracefully.
