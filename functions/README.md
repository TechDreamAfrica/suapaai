# Firebase Cloud Functions - Sua Pa AI

This folder contains Cloud Functions for syncing Firebase Authentication users to Firestore and automatically managing user data.

## Functions Included

### 1. `syncAuthUsersToFirestore` (Callable)
Syncs all users from Firebase Authentication to Firestore `users` collection.

**Features:**
- Retrieves all users from Firebase Auth
- Creates Firestore documents for new users
- Updates existing user documents with latest auth data
- Automatically assigns admin role to `info@suapaai.com`
- Handles pagination for large user lists
- Returns detailed sync statistics

**Triggered by:** Admin clicking "Sync Auth Users" button in Admin Dashboard

### 2. `onUserCreated` (Auth Trigger)
Automatically creates Firestore document when a new user registers.

**Features:**
- Runs automatically on user registration
- Sets appropriate role (admin/user) based on email
- Creates initial user document with all auth data

### 3. `onUserDeleted` (Auth Trigger)
Handles cleanup when a user is deleted from Firebase Auth.

**Features:**
- Runs automatically on user deletion
- Marks user as deleted in Firestore (preserves data)
- Alternative: Can be configured to delete document entirely

## Setup Instructions

### Prerequisites
- Node.js 18 or higher installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project initialized

### Installation

1. **Navigate to functions folder:**
   ```bash
   cd functions
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Login to Firebase (if not already logged in):**
   ```bash
   firebase login
   ```

4. **Initialize Firebase project (if not done):**
   ```bash
   firebase init functions
   ```
   - Choose "Use an existing project"
   - Select your project: `sua-pa-ai-dfeb8`
   - Choose JavaScript
   - Install dependencies: Yes

### Deployment

**Deploy all functions:**
```bash
firebase deploy --only functions
```

**Deploy specific function:**
```bash
firebase deploy --only functions:syncAuthUsersToFirestore
```

**View deployment logs:**
```bash
firebase functions:log
```

## Usage

### From Admin Dashboard

1. Log in as admin (`info@suapaai.com`)
2. Navigate to Admin Dashboard
3. Click **"Sync Auth Users"** button
4. Wait for sync to complete
5. View results in notification

### Manual Testing (Firebase Console)

1. Go to Firebase Console → Functions
2. Find `syncAuthUsersToFirestore`
3. Click "Test function"
4. Use test data: `{}`
5. View results

## Security

### Permissions Required
- Only **admin** users can call `syncAuthUsersToFirestore`
- Role is verified by checking Firestore `users` collection
- Authentication is required for all functions

### Firestore Rules
Ensure your `firestore.rules` includes:
```javascript
function isAdmin() {
  return isAuthenticated() &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "User sync completed successfully",
  "syncedCount": 5,
  "updatedCount": 10,
  "totalProcessed": 15,
  "errors": null
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here",
  "errors": [
    {
      "uid": "user123",
      "email": "user@example.com",
      "error": "Error details"
    }
  ]
}
```

## Error Handling

The sync function handles:
- ✅ Authentication errors
- ✅ Permission denied
- ✅ Individual user sync failures (logged, doesn't stop process)
- ✅ Pagination for large user lists (1000 at a time)

## Development

### Local Testing
```bash
npm run serve
```

### View Logs
```bash
npm run logs
```

### Function Shell
```bash
npm run shell
```

## Cost Considerations

- **Invocations:** Charged per function call
- **Compute time:** Based on execution duration
- **Network egress:** Data transfer out of Google
- **Free tier:** 2M invocations/month, 400K GB-seconds

**Estimated cost for 1000 users sync:** < $0.01

## Troubleshooting

### Function not found
**Error:** `functions/not-found`
**Solution:** Deploy functions: `firebase deploy --only functions`

### Permission denied
**Error:** `functions/permission-denied`
**Solution:** Ensure logged-in user has `role: 'admin'` in Firestore

### Timeout
**Error:** Function times out for large user base
**Solution:** Function automatically handles pagination (1000 users at a time)

### Missing dependencies
**Error:** Module not found
**Solution:** Run `npm install` in functions folder

## Monitoring

### Firebase Console
1. Go to Firebase Console → Functions
2. View execution logs, errors, and metrics
3. Monitor invocation count and execution time

### Cloud Console
1. Go to Google Cloud Console → Cloud Functions
2. View detailed metrics and logs
3. Set up alerts for errors

## Maintenance

### Update Function Code
1. Edit `functions/index.js`
2. Test locally: `npm run serve`
3. Deploy: `firebase deploy --only functions`

### Update Dependencies
```bash
cd functions
npm update
npm audit fix
```

### Delete Function
```bash
firebase functions:delete syncAuthUsersToFirestore
```

## Support

For issues or questions:
- Email: support@suapa.ai
- Check Firebase Console logs
- Review function execution in Cloud Console

---

**Version:** 1.0.0
**Last Updated:** 2024
**Maintained by:** Sua Pa AI Team
