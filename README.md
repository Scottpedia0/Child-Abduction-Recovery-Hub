# Recovery Hub: International Parental Abduction Support Tool

**A "Mission Control" platform for left-behind parents navigating the crisis of International Parental Child Abduction (IPCA).**

> **⚠️ Status:** Active Development / Beta
> **⚠️ Disclaimer:** This tool uses Artificial Intelligence to organize information and draft communications. It is **not** a substitute for legal counsel.

---

## 🚀 GO LIVE MANUAL (Deployment Guide)

To take this app from code to a live website, follow these steps:

### 1. Get Your API Keys
*   **Gemini API Key:** Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and click **Create API Key**. Copy this string.

### 2. Firebase Setup (Backend)
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
          allow read: if true; // Public can view campaigns
          allow write: if request.auth != null; // Only auth'd users can create
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

### 3. Vercel Setup (Hosting)
1.  Push this code to a GitHub repository.
2.  Go to [Vercel](https://vercel.com) and "Add New Project".
3.  Import your GitHub repo.
4.  **Environment Variables:** Add the following variable in Vercel settings:
    *   `VITE_GEMINI_API_KEY`: [Paste your Gemini API Key here]
5.  Click **Deploy**.

---

## 💻 Local Development

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/recovery-hub.git
    cd recovery-hub
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

---

## ✨ Key Features

### 🛡️ Crisis Management
*   **Intelligence Dossier:** AI analyzes the specific country pair to determine Hague compliance.
*   **Universal Task List:** Auto-generates a priority checklist based on legal status.
*   **Live Strategy Guide:** Real-time, voice-activated AI companion using Gemini Live API.
*   **Strategy Brainstormer:** Chat interface to turn concerns into tasks.

### 📂 Evidence & Logistics
*   **Digital Vault:** Secure, local-first document storage (IndexedDB).
*   **Unified Timeline:** Merged view of logs, calls, and documents.
*   **Expense Tracker:** Logs costs for restitution.

### 📢 Outreach
*   **Comms HQ:** AI email drafter with context injection.
*   **Campaign Builder:** Generates/hosts a public SEO-optimized "Bring [Child] Home" website.

---

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript, Vite
*   **AI:** Google Gemini API
*   **Storage:** Firebase Firestore (Cloud) + IndexedDB (Local)

## 📄 License
[MIT License](LICENSE)