# ExamGuard AI Architecture

Browser / Extension
  -> Consent + camera
  -> CV observation layer
  -> Browser event collector
  -> Event API
  -> Risk engine
  -> Realtime socket
  -> Proctor dashboard
  -> Human review
  -> Report

Privacy:
- Prefer on-device CV where practical.
- Store event metadata and selected evidence only when configured and legally permitted.
- Do not automatically label a student as cheating.
- Do not attempt to bypass another site's security.
