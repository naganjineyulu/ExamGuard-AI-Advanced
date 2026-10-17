# Provider Integration Guide

ExamGuard is not a universal remote controller for arbitrary exam websites.

For an approved provider:
1. Register the provider/domain in ExamGuard.
2. Add the ExamGuard JavaScript SDK.
3. Start a session after explicit student consent.
4. Send supported browser/proctoring events.
5. Display provider-side proctoring status.
6. End the session and retrieve the review report.

Supported patterns:
- JavaScript SDK
- Browser extension/content script
- REST API
- Webhooks
- OAuth
- iframe only where the provider permits it
