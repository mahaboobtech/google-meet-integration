# 🎥 MeetFlow - Website Google Meet REST API & OAuth 2.0 Integration

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-v4.19-blue.svg)](https://expressjs.com/)
[![Google Meet API](https://img.shields.io/badge/Google%20Meet%20API-v2-4285F4.svg)](https://developers.google.com/workspace/meet)
[![OAuth 2.0](https://img.shields.io/badge/OAuth-2.0-FF6F00.svg)](https://developers.google.com/identity/protocols/oauth2)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

A production-ready full-stack web application for creating and managing **Google Meet meetings directly from your website** using Google's official **Google Meet REST API v2** and **OAuth 2.0**.

Users and co-hosts can generate official Google Meet links (`https://meet.google.com/xxx-xxxx-xxx`) and invite guests directly from your web application **without opening Google Calendar or Google Meet creation pages**.

---

## ✨ Key Features

- 🎥 **Direct Google Meet Space Generation**: Creates Google Meet spaces programmatically using official Google Meet REST API **v2** (`POST https://meet.googleapis.com/v2/spaces`).
- 🔐 **OAuth 2.0 PKCE Authentication**: Secure backend authorization code exchange. The `GOOGLE_CLIENT_SECRET` is kept strictly on the backend server and is **never exposed to the browser**.
- 🚀 **Direct Join Without Asking (Knock Bypass)**: Integrates Google Calendar API (`calendar.events.insert` with `conferenceDataVersion: 1`) to natively email and register guests and co-hosts so they **JOIN DIRECTLY WITHOUT ASKING TO JOIN**.
- ⚙️ **Meeting Customization**:
  - Custom meeting title
  - Access controls (**Restricted**, **Open**, **Trusted**)
  - Entry point access controls (**All Entry Points**, **Creator App Only**)
  - Interactive guest & co-host tag input system
- 🛡️ **Universal Account Compatibility**: Includes automated fallback logic for personal `@gmail.com` consumer accounts and Google Workspace domain accounts.
- 🎨 **Glassmorphic Dark Mode UI**: Modern single-page responsive web interface featuring glowing backdrop filters, toast notifications, one-click copy buttons, and session meeting history.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Web App                     │
│         (HTML5 / Modern Vanilla CSS / JavaScript)       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   Express.js Backend                    │
│   • OAuth 2.0 PKCE Manager                               │
│   • HTTP-Only Session Token Store                       │
│   • CSRF State Validator                                │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼                           ▼
┌─────────────────────────────┐ ┌─────────────────────────┐
│   Google Meet REST API v2   │ │   Google Calendar API   │
│  (meet.googleapis.com/v2)   │ │  (calendar.events.insert)│
└─────────────────────────────┘ └─────────────────────────┘
```

---

## 📋 Google Cloud Setup Checklist

Before running the project locally or in production, configure your Google Cloud Console project:

### 1. Create a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Create Project** and name it **"Website Google Meet Integration"**.

### 2. Enable Required APIs
1. Navigate to **APIs & Services > Library**.
2. Search for **Google Meet API** and click **Enable**.
3. Search for **Google Calendar API** and click **Enable**.

### 3. Configure OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select **User Type**: **External** (or **Internal** if restricted to your Google Workspace organization).
3. Enter App name (e.g. `MeetFlow Manager`), support email, and developer contact info.
4. Add the following **OAuth Scopes**:
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. If testing in unverified status, add your test email addresses under **Test users**.

### 4. Create OAuth 2.0 Credentials
1. Navigate to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
2. Select Application type: **Web application**.
3. Set **Authorized JavaScript origins**: `http://localhost:3000` (and your production URL).
4. Set **Authorized redirect URIs**: `http://localhost:3000/api/google/callback`.
5. Copy your **Client ID** and **Client Secret**.

---

## 🚀 Quick Start & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/mahaboobtech/google-meet-integration.git
cd google-meet-integration
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
SESSION_SECRET=your_super_secret_session_key
```

### 4. Run the Server
```bash
npm start
```
Or for auto-reloading development mode:
```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser!

---

## 🔌 API Endpoint Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/google/auth` | Initiates Google OAuth 2.0 consent flow with state validation | No |
| `GET` | `/api/google/callback` | OAuth 2.0 redirect callback & token exchange | No |
| `GET` | `/api/google/status` | Returns authentication state and user profile | No |
| `POST` | `/api/google/logout` | Revokes and destroys session tokens | Yes |
| `POST` | `/api/meetings` | Creates a Google Meet space & dispatches calendar invites | Yes |
| `GET` | `/api/meetings` | Lists meeting history created in current session | No |
| `GET` | `/api/meetings/:id` | Fetches Google Meet space details from Google API | Yes |

---

## 🛡️ Security Architecture & Practices

- 🔒 **Zero Frontend Exposure**: `GOOGLE_CLIENT_SECRET` is used exclusively on the Node.js server.
- 🛡️ **CSRF Protection**: OAuth requests use randomized `state` validation tokens stored in session.
- 🍪 **HTTP-Only Cookies**: Session cookies are configured with `httpOnly: true` to prevent XSS credential theft.
- 🙈 **Strict Git Exclusions**: Secret files (`.env`, `client_secret_*.json`) are explicitly excluded via `.gitignore`.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
