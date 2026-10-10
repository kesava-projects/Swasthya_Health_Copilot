# Security Policy & Healthcare Privacy Architecture — Swasthya Copilot

## 1. Overview & Threat Model

Swasthya Copilot is designed with a defense-in-depth security model to handle personal health information (PHI) securely. Every architectural component assumes that uploaded documents and network payloads are untrusted.

### Critical Security Controls Implemented

1. **User-Scoped Isolation**:
   - All documents, observations, prescriptions, reminders, and chatbot conversation records are strictly scoped to the authenticated `userId` extracted from validated JWT claims.
   - User IDs from route parameters or client payloads are never trusted to authorize access.
   - Comprehensive integration tests assert that cross-user queries (Insecure Direct Object Reference - IDOR) return HTTP 404/403.

2. **Private Document Storage**:
   - Uploaded files are stored in a private directory with non-guessable cryptographic filenames (e.g., `<timestamp>-<hex16>.<ext>`).
   - Private storage paths are never served via public static URLs.
   - File downloads require active JWT authentication and ownership validation, with path traversal sanitization via `path.basename` and root boundary verification.

3. **MIME-Type & Magic Byte Validation**:
   - Files are validated against their genuine binary file signatures (Magic Bytes: `%PDF` for PDF, `\x89PNG` for PNG, `\xFF\xD8\xFF` for JPEG) before persistence.
   - Disguised executables or scripts are rejected immediately.

4. **Prompt Injection & AI Sandboxing**:
   - OCR text from uploaded documents is treated as untrusted clinical data.
   - System prompts enforce strict separation between clinical facts and instructions, instructing the LLM never to execute prompt overrides embedded in documents.
   - The RAG retriever injects only records belonging to the authenticated user.

5. **Medical Safety & Grounding**:
   - Grounded RAG citations link answers strictly to specific document titles and page numbers.
   - When requested information is absent from uploaded records, the system states that data is unavailable instead of hallucinating.
   - Built-in emergency escalation guidance advises users on acute medical symptoms (chest pain, severe breathlessness) to seek immediate local emergency medical care (108/112).
   - The AI layer explicitly reminds users that it does not formulate diagnoses or modify medication regimens.

6. **Audit Trail**:
   - All sensitive events (Authentication, Document Upload, Download, Deletion, Extraction Edit, Confirmation, Chat Queries) generate an immutable `AuditLog` entry tracking the actor, IP, timestamp, and resource ID.

---

## 2. Production Deployment Precautions

When deploying Swasthya Copilot to production:

- **HTTPS Mandatory**: Enable TLS 1.3 with automated certificate management (Let's Encrypt / AWS ACM).
- **Strong Secrets**: Generate `JWT_SECRET` with at least 256 bits of entropy:
  ```bash
  openssl rand -hex 32
  ```
- **Private Object Storage**: In cloud environments (AWS, GCP, Azure), replace `LocalDiskStorageAdapter` with private S3/GCS buckets using pre-signed URLs with short 5-minute expiry.
- **HIPAA & DISHA Disclaimer**: Swasthya Copilot provides FHIR-style modeling and mock ABHA ID demonstration fields. It does **not** claim formal HIPAA, GDPR, or ABDM certification until an accredited third-party security audit and legal assessment are conducted.

---

## 3. Reporting a Vulnerability

If you identify a security issue in Swasthya Copilot, please submit a responsible disclosure report to the development security team rather than opening a public issue.
