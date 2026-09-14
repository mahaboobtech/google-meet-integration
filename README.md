# 🎥 MeetFlow - Direct Google Meet REST API & OAuth 2.0 Integration

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-v4.19-blue.svg)](https://expressjs.com/)
[![Google Meet API](https://img.shields.io/badge/Google%20Meet%20API-v2-4285F4.svg)](https://developers.google.com/workspace/meet)
[![Google Calendar API](https://img.shields.io/badge/Google%20Calendar%20API-v3-34A853.svg)](https://developers.google.com/calendar)
[![OAuth 2.0](https://img.shields.io/badge/OAuth-2.0-FF6F00.svg)](https://developers.google.com/identity/protocols/oauth2)

A complete, production-ready web application for **creating and managing Google Meet meetings directly from your website** using Google's official **Google Meet REST API v2** and **OAuth 2.0**.

This project allows users, co-hosts, and guests to generate official Google Meet links (`https://meet.google.com/xxx-xxxx-xxx`) and invite attendees **without opening Google Calendar or Google Meet creation pages**.

---

## 📘 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Step 1: Google Cloud Console Setup (Getting Your Keys)](#-step-1-google-cloud-console-setup-getting-your-keys)
3. [Step 2: Project Installation & Local Setup](#-step-2-project-installation--local-setup)
4. [Step 3: Running the Application](#-step-3-running-the-application)
5. [How the Code Works (Developer Guide)](#-how-the-code-works-developer-guide)
6. [API Endpoints Reference](#-api-endpoints-reference)
7. [Troubleshooting & Gotchas](#-troubleshooting--gotchas)

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes bundled with Node.js)
- **A Google Account**: (Standard `@gmail.com` or Google Workspace account)

---

## 🔑 Step 1: Google Cloud Console Setup (Getting Your Keys)

Follow these step-by-step instructions to create your Google Cloud Project, enable required APIs, and obtain your OAuth Client Credentials.

### 1.1 Create a New Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top navigation bar, click the **Project Dropdown** and click **New Project**.
3. Set **Project Name**: `Website Google Meet Integration`.
4. Click **Create** and select your newly created project.

### 1.2 Enable Required Google REST APIs
You must enable **two** official Google APIs for this project:

1. **Google Meet API**:
   - Go to **APIs & Services > Library** (or open [Google Meet API Library](https://console.cloud.google.com/apis/library/meet.googleapis.com)).
   - Click **Enable**.
2. **Google Calendar API**:
   - Go to **APIs & Services > Library** (or open [Google Calendar API Library](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)).
   - Click **Enable**.

### 1.3 Configure OAuth Consent Screen & Test Users
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **User Type**:
   - Choose **External** (if testing with personal `@gmail.com` accounts).
   - Choose **Internal** (if restricted to your Google Workspace organization).
3. Click **Create**.
4. Fill in App Information:
   - **App name**: `MeetFlow Integration`
   - **User support email**: Select your email address.
   - **Developer contact information**: Enter your email address.
5. Click **Save and Continue**.
6. On the **Scopes** page, click **Add or Remove Scopes** and add these 5 scope URLs:
   ```text
   https://www.googleapis.com/auth/meetings.space.created
   https://www.googleapis.com/auth/meetings.space.readonly
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```
7. Click **Update** and then **Save and Continue**.
8. On the **Test users** page, click **+ ADD USERS**:
   - Add your own email address (`your-email@gmail.com`) and any co-host email addresses.
   - *Note: If you skip adding test users, Google will block sign-in with Error 403: access_denied.*
9. Click **Save and Continue**.

### 1.4 Create OAuth 2.0 Credentials (Client ID & Client Secret)
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Set **Application type**: **Web application**.
4. Set **Name**: `MeetFlow Web Client`.
5. Under **Authorized JavaScript origins**, click **+ ADD URI**:
   - Enter: `http://localhost:3000`
6. Under **Authorized redirect URIs**, click **+ ADD URI**:
   - Enter: `http://localhost:3000/api/google/callback`
7. Click **Create**.
8. A modal will pop up with your **Client ID** and **Client Secret**. Copy both values!

---

## 💻 Step 2: Project Installation & Local Setup

### 2.1 Clone the Repository
```bash
git clone https://github.com/mahaboobtech/google-meet-integration.git
cd google-meet-integration
```

### 2.2 Install Node.js Dependencies
```bash
npm install
```

### 2.3 Environment Variable Configuration (`.env`)
Create a new file named **`.env`** in the root directory of the project (copying from `.env.example`):

```bash
cp .env.example .env
```

Open `.env` and fill in your Google Cloud OAuth credentials obtained in **Step 1.4**:

```env
# Server Port
PORT=3000

# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=1033455873238-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Secret key for encrypting HTTP-only user session cookies
SESSION_SECRET=meetflow-secure-session-key-2026
```

> ⚠️ **Security Warning**: NEVER commit your `.env` or Client Secret to GitHub! `.env` is automatically ignored in `.gitignore`.

---

## 🚀 Step 3: Running the Application

### Start the Express Server
Run the following command in your terminal:

```bash
npm start
```

Or for development mode (auto-reloading on file changes):

```bash
npm run dev
```

You will see output confirming startup:

```text
====================================================
🚀 Website Google Meet Integration Server Running
🌐 URL: http://localhost:3000
🔑 OAuth Redirect: http://localhost:3000/api/google/callback
====================================================
```

### Test the Integration Flow in Your Browser
1. Open [`http://localhost:3000`](http://localhost:3000).
2. Click **Connect Google Account** in the top right navbar to authenticate via Google OAuth 2.0.
3. Once authenticated, enter a **Meeting Title** (e.g. `Architecture Review`).
4. Add guest & co-host email addresses (e.g. `cohost@example.com`) with role selection.
5. Click **CREATE GOOGLE MEET**.
6. Your official Google Meet link (`https://meet.google.com/xxx-xxxx-xxx`) is generated instantly with a **One-Click Copy Link** button!

---

## 🧠 How the Code Works (Developer Guide)

Here is how the project files interact under the hood:

```text
google-meet-integration/
├── .env.example                # Sample environment configuration template
├── .gitignore                  # Prevents committing secrets & node_modules
├── package.json                # Project dependencies & scripts
├── README.md                   # Developer documentation
├── public/
│   ├── index.html              # Modern single-page web UI
│   ├── css/style.css           # Dark mode glassmorphism styling
│   └── js/app.js               # Client-side form controller & API fetcher
└── src/
    ├── server.js               # Express server setup & session middleware
    ├── routes/
    │   └── api.js              # REST API endpoints (/api/google/*, /api/meetings)
    └── services/
        ├── googleAuth.js       # OAuth 2.0 client & token management
        ├── googleMeet.js       # Direct Google Meet REST API v2 service
        └── googleCalendar.js   # Native Calendar invitation service for Direct Join
```

### Key Technical Mechanisms Explained

1. **Direct Space Creation (`src/services/googleMeet.js`)**:
   - Uses `authClient.request({ url: 'https://meet.googleapis.com/v2/spaces', method: 'POST', data: ... })`.
   - Using `authClient.request` ensures the HTTP `Authorization: Bearer <access_token>` header is injected into every Google API call.
2. **Direct Join Without Asking (`src/services/googleCalendar.js`)**:
   - Standard standalone Meet URLs require external guests to click "Ask to join" (knock screen).
   - To bypass knocking, `sendCalendarInvitation()` invokes Google Calendar API (`calendar.events.insert`) passing **`conferenceDataVersion: 1`**, `guestsCanInviteOthers: true`, and native `conferenceData`.
   - This registers attendee emails directly with Google's video servers, allowing co-hosts & guests to **JOIN DIRECTLY WITHOUT ASKING**.
3. **Consumer `@gmail.com` Fallback**:
   - Setting custom enterprise `accessType` policies is restricted by Google on personal `@gmail.com` accounts.
   - `googleMeet.js` catches 403 `updateAccessType` restrictions and automatically retries space creation with standard account defaults, guaranteeing 100% success for all account types.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/google/auth` | Redirects browser to Google OAuth 2.0 consent screen | No |
| `GET` | `/api/google/callback` | OAuth callback, exchanges authorization code for tokens | No |
| `GET` | `/api/google/status` | Returns `{ authenticated: true/false, user: {...} }` | No |
| `POST` | `/api/google/logout` | Destroys user session tokens | Yes |
| `POST` | `/api/meetings` | Creates Google Meet space & dispatches calendar invites | Yes |
| `GET` | `/api/meetings` | Returns meeting history created in current session | No |
| `GET` | `/api/meetings/:id` | Fetches Google Meet space details from Google REST API | Yes |

---

## ❓ Troubleshooting & Gotchas

### 1. Error 403: access_denied (`App has not completed Google verification`)
- **Cause**: Google Cloud project is in "Testing" mode and your email is not listed under Test Users.
- **Solution**: Go to Google Cloud Console > **OAuth consent screen > Test users**, click **+ ADD USERS**, and add your email.

### 2. Error 403: `Google Calendar API has not been used... or it is disabled`
- **Cause**: Google Calendar API is not enabled in your Google Cloud Project.
- **Solution**: Open [Google Calendar API Library](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) and click **Enable**.

### 3. Guests still see "Ask to Join" (Knock Screen)
- **Cause**: The guest opened the link while signed into a different email address than the one invited.
- **Solution**: Ensure the guest is logged into the exact email address specified when adding guests.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for details.
