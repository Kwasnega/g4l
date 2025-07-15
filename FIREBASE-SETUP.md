# Firebase Security Rules Setup

## 🔥 Fix Permission Denied Errors

To fix the "permission_denied" errors, you need to add the `/users` path to your existing Firebase Realtime Database security rules.

### 📋 Steps to Update Security Rules:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project

2. **Navigate to Realtime Database**
   - Click "Realtime Database" in the left sidebar
   - Click on the "Rules" tab

3. **Add Users Section to Your Existing Rules**
   - Find your existing rules
   - Add this section before the final `".read": false, ".write": false`:

```json
"users": {
  ".read": "auth != null && root.child('adminUsers').child(auth.uid).val() === true",
  "$userId": {
    ".read": "auth != null && ($userId === auth.uid || root.child('adminUsers').child(auth.uid).val() === true)",
    ".write": "auth != null && $userId === auth.uid",
    ".validate": "newData.hasChildren(['uid', 'email', 'registeredAt']) || newData.val() === null",
    "uid": { ".validate": "newData.isString() && newData.val() === auth.uid" },
    "email": { ".validate": "newData.isString()" },
    "registeredAt": { ".validate": "newData.isString()" },
    "lastLoginAt": { ".validate": "newData.isString() || newData.val() === null" },
    "$other": { ".validate": false }
  }
},
```

4. **Or Use Complete Rules**
   - Copy the complete content from `firebase-security-rules.json`
   - Replace your entire rules with this updated version
   - Click "Publish"

### 🛡️ What These Rules Do:

- **Products**: Public read, admin-only write
- **Gallery**: Public read, admin-only write  
- **Orders**: Users can read/write their own orders, admins can access all
- **Users**: Users can read/write their own data, admins can read all
- **Admin Users**: Only admins can read/write admin list

### 🔧 Alternative: Temporary Open Rules (Development Only)

If you want to test quickly, you can use these temporary rules (NOT for production):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**⚠️ WARNING**: These rules allow anyone to read/write your database. Only use for testing!

### 🎯 After Updating Rules:

1. Refresh your website
2. The permission errors should be gone
3. User tracking in admin dashboard will work
4. All features will be accessible

### 📞 Need Help?

If you're still having issues:
1. Check that your Firebase project is properly configured
2. Verify your `.env` file has correct Firebase credentials
3. Make sure you're logged in as an admin user
