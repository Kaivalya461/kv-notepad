### This is a simple web based notepad application, using angular, hosted using express-server

## Local Pre-Deployment Test on express-server
1. cd into 'ui/express-server' directory.
2. Build the Angular code using custom script 'npm run angular-build', and make sure build output files are created under 'dist'.
3. Run the express-server (server.js) using custom script 'npm run start'.


## Deployment Steps (GCP Cloud Run)

### UI
1. Checkout the source code.
2. cd into 'ui/express-server' directory.
2. Build and Test the code, refer above 'Pre-Deployment' Steps.
2. Run below GCP command:
```
gcloud run deploy kv-notepad --source . --region asia-southeast1 --allow-unauthenticated
```
3. Done


## Notes:
1. Source code and node_modules are skipped during GCP deploy due to usage of '.gcloudignore' file and avoids uploading unnecessary files.