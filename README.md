# ExamGuard AI

Advanced AI-assisted online exam proctoring prototype.

## Included
- Premium React dashboard
- Live monitoring UI
- Student exam interface with webcam permission flow
- Explainable risk engine
- Suspicious event API
- SQLite local development database
- Socket.IO realtime event stream
- Demo URL integration validator
- Chrome/Edge Manifest V3 extension scaffold
- Provider SDK reference
- AI detection abstraction documentation
- Privacy/human-review architecture
- Responsive dark SaaS UI

## Requirements
Node.js 18+ (20+ recommended)

## Install
```bash
npm install
npm run dev
```

## Admin accounts and email verification

Organization admins can create an account from the **Sign up** option on the sign-in screen. New accounts use scrypt-hashed passwords, must verify their email before sign-in, and receive an eight-hour HS256 JWT for admin API access. Exam catalog, integration validation, reports, and the live admin socket require that verified JWT.

For local development, run `npm run dev`. The API generates and stores a private development JWT secret in its local SQLite database. If Cloudflare Email Service credentials are not set, the API prints a development verification URL in its terminal and shows a local verification link in the signup screen. This local shortcut is disabled in production.

To send real verification messages, enable a verified Cloudflare Email Sending domain, then set `CLOUDFLARE_EMAIL_ACCOUNT_ID`, `CLOUDFLARE_EMAIL_API_TOKEN`, `EMAIL_FROM`, and `APP_BASE_URL` in `.env`. The sender must belong to the enabled sending domain. Production also requires a strong `JWT_SECRET` and an HTTPS `APP_BASE_URL`. Keep `.env` private.

Open:
- Dashboard: http://localhost:5173
- API health: http://localhost:5050/api/health

## Production AI models
The current application deliberately includes a DEMO MODE. Replace the AI abstraction in `ai/` with:
- MediaPipe Face Detection / Face Landmarker
- ONNX Runtime Web
- A validated YOLO-compatible phone detector

Never present simulated events as real detections.

## Extension
1. Open Chrome -> Extensions.
2. Enable Developer mode.
3. Load unpacked.
4. Select `extension/`.
5. The provided host permissions intentionally target only approved/demo domains.

## Important platform constraint
A browser extension cannot safely or legitimately take control of arbitrary third-party exam websites. Real deployment requires authorization and integration from the exam host. ExamGuard therefore supports an approved-domain model, provider SDK, extension, REST API, and webhooks.

## Risk engine
Example weights:
- No face: +15
- Multiple faces: +40
- Phone detected: +50
- Repeated looking away: +10
- Long absence: +20
- Possible phone scanning: +60

Risk:
0-20 Normal
21-40 Low
41-60 Medium
61-80 High
81-100 Critical

These are configurable and are not a misconduct verdict.
