### This is a simple web based notepad application, using angular, hosted using express-server and firebase functions for login OTPs.

# Project Structure:
1. ui directory:
    - Angular source code for frontend.
    - Express server for serving packaged UI files.
2. backend directory:
    - Firebase functions for sending and verifying OTP for User login.
    - Mails are handled by resend.com


# UI - Steps
## Setup Node Packages:
1. Angular App -> cd into 'ui/notepad-app' and run 'npm install'.
2. Express-Server -> cd into 'ui/express-server' and run 'npm install express-server'

## Local Pre-Deployment Test on express-server
1. cd into 'ui/express-server' directory.
2. Build the Angular code using custom script 'npm run angular-build', and make sure build output files are created under 'dist'.
3. Run the express-server (server.js) using custom script 'npm run start'.


## Deployment Steps (GCP Cloud Run)

### UI
1. Checkout the source code.
2. cd into 'ui/express-server' directory.
3. Build and Test the code, refer above 'Pre-Deployment' Steps.
4. Run below GCP command:
```
gcloud run deploy kv-notepad --source . --region asia-southeast1 --allow-unauthenticated
```
5. Done


## Notes:
1. Source code and node_modules are skipped during GCP deploy due to usage of '.gcloudignore' file and avoids uploading unnecessary files.

## Backend - Firebase Functions Deployment Steps
Run these commands sequentially in your terminal or command prompt from your project's root folder.

### 1. Install Firebase CLI globally (if not already installed)
`npm install -g firebase-tools`

### 2. Log in to your Firebase account
`firebase login`

### 3. Navigate to the functions folder and install project dependencies
```
cd functions
npm install firebase-admin firebase-functions resend
cd ..
```

### 4. Configure your secure Resend API Key in Cloud Secret Manager
`firebase functions:secrets:set RESEND_API_KEY` (When  prompted, enter your actual KEY)

### 5. Deploy the OTP functions to Firebase
-  All functions -> `firebase deploy --only functions`
- Individual Functions -> `firebase deploy --only functions:sendOtp functions:verifyOtp`


### 6. Once successfully deployed, you should URLs for each functions like below.
```
SEND_OTP = 'https://sendotp-k5dqedb3pq-uc.a.run.app';
VERIFY_OTP = 'https://verifyotp-k5dqedb3pq-uc.a.run.app';
```