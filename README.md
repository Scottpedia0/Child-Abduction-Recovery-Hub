# Recovery Hub: International Parental Abduction Support Tool

**A "Mission Control" platform for left-behind parents navigating the crisis of International Parental Child Abduction (IPCA).**

> **⚠️ Status:** Active Development / Beta
> **⚠️ Disclaimer:** This tool uses Artificial Intelligence to organize information and draft communications. It is **not** a substitute for legal counsel.

**[Project update: Two children came home with help from Recovery Hub. Now it needs maintainers.](https://hub.rescuecharlotte.org/maintainers.html)**

---

## 🚀 GO LIVE MANUAL (Deployment Guide)

To take this app from code to a live website, follow these steps:

### 1. Firebase Setup (Backend)
1.  Go to the [Firebase Console](https://console.firebase.google.com).
2.  Create/Open project `recovery-hub-prod` (or create a new one).
3.  **Authentication:** Go to Build > Authentication. Click "Get Started".
    *   Enable **Google** Sign-in.
    *   Enable **Anonymous** Sign-in (Required for the Public Campaign Builder).
4.  **Database:** Go to Build > Firestore Database. Click "Create Database" (Production Mode).
    *   Go to the **Rules** tab in Firestore and paste this (allows users to read their own data):
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{userId}/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
        match /campaigns/{campaignId} {
          allow read: if true; // Campaign pages are intentionally public
          allow create: if request.auth != null
            && request.resource.data.ownerUid == request.auth.uid;
          allow update: if request.auth != null
            && resource.data.ownerUid == request.auth.uid
            && request.resource.data.ownerUid == request.auth.uid;
          allow delete: if request.auth != null
            && resource.data.ownerUid == request.auth.uid;
        }
      }
    }
    ```
5.  **Connect Code:**
    *   Go to Project Overview (Gear Icon) > Project Settings.
    *   Scroll to "Your apps" > Click the Web icon (</>). 
    *   Copy the `firebaseConfig` object (apiKey, authDomain, etc.).
    *   **IMPORTANT:** Open `index.tsx` in your code and replace the existing `const firebaseConfig = { ... }` with your new one.
6.  **Domains:** Go to Authentication > Settings > Authorized Domains. Add your production domain (e.g., `recovery-hub.vercel.app`).

### 2. Vercel Setup (Hosting)
1.  Push this code to a GitHub repository.
2.  Go to [Vercel](https://vercel.com) and "Add New Project".
3.  Import your GitHub repo.
4.  Click **Deploy**.

---

## 💻 Local Development

1.  **Clone the repo**
    ```bash
    git clone https://github.com/Scottpedia0/Child-Abduction-Recovery-Hub.git
    cd Child-Abduction-Recovery-Hub
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

---

## ✨ Key Features

### 🛡️ Crisis Management
*   **Intelligence Dossier:** AI creates a country-pair assessment, red flags, and suggested tasks that users should verify independently.
*   **Universal Task List:** Auto-generates a priority checklist based on legal status.
*   **Live Strategy Guide:** Real-time, voice-activated AI companion.
*   **Strategy Brainstormer:** Chat interface to turn concerns into tasks.

### 📂 Evidence & Logistics
*   **Digital Vault:** Local-first document storage in IndexedDB; documents selected for AI analysis are sent to Gemini for processing.
*   **Unified Timeline:** Merged view of logs, calls, and documents.
*   **Expense Tracker:** Logs costs for restitution.

### 📢 Outreach
*   **Comms HQ:** AI email drafter with context injection.
*   **Campaign Builder:** Generates and hosts a public "Bring [Child] Home" campaign page.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18, TypeScript, Vite
*   **Storage:** localStorage + IndexedDB (browser), with optional Firebase Firestore sync
*   **AI:** Google Gemini

## 📄 License
[MIT License](LICENSE)

## 🤝 Contributing

Recovery Hub needs maintainers across frontend engineering, offline-first data storage, privacy and security, accessibility, testing, and child-welfare workflow validation.

Read the [maintainer call](https://hub.rescuecharlotte.org/maintainers.html), review the code, and [open an issue](https://github.com/Scottpedia0/Child-Abduction-Recovery-Hub/issues/new) with a concrete area you can own. Do not post family case details, documents, or identifying information in public issues.
