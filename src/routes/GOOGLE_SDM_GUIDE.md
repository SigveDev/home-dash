# Google Smart Device Management (SDM) Setup Guide

To control your Google Nest devices (Lights, Thermostats, etc.) from this dashboard, you need to set up the Google Device Access Console and Cloud Project.

## Prerequisites
- A Google Account with Nest devices connected (migrated from Nest account).
- A credit card (Google charges a one-time $5 fee for Device Access registration).

## Step 1: Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project**. Name it something like "Home Dash".
3. Note the **Info Panel** -> **Project ID** (e.g., `home-dash-12345`). This is NOT the Enterprise ID yet, but you'll need it.
4. **Enable APIs**:
   - Go to **APIs & Services** -> **Library**.
   - Search for and enable:
     - **Smart Device Management API**
     - **Cloud Pub/Sub API** (Optional, but good for future real-time updates).

## Step 2: Configure OAuth Screen
1. Go to **APIs & Services** -> **OAuth consent screen**.
2. Choose **External** (unless you have a Google Workspace organization).
3. Fill in required fields (App Name: "Home Dash", User Support Email: your email).
4. **Scopes**: Add permissions if asked, but for SDM you'll essentially just need the defaults + specific SDM scopes later.
5. **Test Users**: Add your own Google Email address. This is critical as the app is in "Testing" mode.

## Step 3: Device Access Registration
1. Go to the [Google Device Access Console](https://console.nest.google.com/device-access/).
2. Click **Go to Console**. Accept terms and pay the $5 fee if you haven't already.
3. Click **Create Project**.
4. **Project Name**: "Home Dash Integration".
5. **OAuth Client ID**: 
   - You need to go back to Google Cloud Console -> **Credentials** -> **Create Credentials** -> **OAuth Client ID**.
   - Type: **Web application**.
   - Name: "SDM Client".
   - **Authorized JavaScript origins**: `http://localhost:5173` (and your production URL).
   - **Authorized redirect URIs**: `http://localhost:5173/` (Appwrite handles this usually, but strict SDM might require the direct callback if we were doing custom auth. For Appwrite, use the Appwrite callback URL: `https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/project/<YOUR_APPWRITE_PROJECT_ID>`).
   - Copy the **Client ID** and **Client Secret**.
6. Back in Device Access Console, paste the **Client ID**.
7. Enable **Events** (optional).
8. Click **Create Project**.

## Step 4: Get Key IDs
Once created, you will see your project listed in the Device Access Console.
1. **Project ID**: This looks like a UUID (e.g., `32fd4c22- ...`). **This is the "SDM Project ID" needed in Settings.**
2. **Authorize the Project**:
   - You must link your Google Account to this SDM Project.
   - Using the link logic usually involves a specific URL, but providing the correct Scopes in Appwrite handles the permission request.
   - **Important**: The Appwrite Google OAuth provider must request the scope: `https://www.googleapis.com/auth/sdm.service`.

## Step 5: Configure Appwrite
1. In Appwrite Console -> **Auth** -> **Settings**.
2. Enable **Google**.
3. Paste the **App ID** (Client ID) and **App Secret** (Client Secret) from Cloud Console (Step 3).
4. **Scopes**: Ensure your Appwrite login code requests:
   - `https://www.googleapis.com/auth/sdm.service`
   - `https://www.googleapis.com/auth/calendar.readonly` (for Calendar)

## Step 6: Configure Dashboard
1. Go to Home Dash **Settings**.
2. **Google SDM / Project ID**: Paste the UUID from **Step 4.1**.
3. Click **Save**.
4. (Re-login might be required to grant new scopes if you just added them).

## Troubleshooting
- **403 Error**:
    - Did you add your email as a **Test User** in Google Cloud Console?
    - Did you pay the $5 fee?
    - Is the "Smart Device Management API" enabled in Cloud Console?
- **404 Error**:
    - Is the Project ID correct? It must be the Device Access one (UUID), NOT the Cloud Project ID (name-based).
