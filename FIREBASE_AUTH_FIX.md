# Firebase Authentication Error Fix: auth/operation-not-allowed

## 🔴 Problem

You're encountering the error: **`Firebase: Error (auth/operation-not-allowed)`**

This error occurs when the authentication method you're trying to use is **not enabled** in your Firebase Console.

---

## ✅ Solution: Enable Authentication Methods

### Step 1: Enable Email/Password Authentication

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/
   - Select your project: `inner-doodad-461919-n6`

2. **Navigate to Authentication:**
   - Click **"Authentication"** in the left sidebar
   - Click **"Sign-in method"** tab

3. **Enable Email/Password:**
   - Find **"Email/Password"** in the list
   - Click on it
   - Toggle **"Enable"** to ON
   - **Save** the changes

### Step 2: Enable Google Sign-In

1. **In the same "Sign-in method" tab:**
   - Find **"Google"** in the list
   - Click on it

2. **Enable Google Sign-In:**
   - Toggle **"Enable"** to ON
   - Enter a **Project support email** (required)
   - Click **"Save"**

3. **Optional - Configure OAuth consent screen:**
   - If prompted, configure OAuth consent screen
   - Add authorized domains if needed

### Step 3: Add Authorized Domains

1. **In Authentication > Settings:**
   - Click **"Authorized domains"** tab

2. **Add your domains:**
   - Make sure these are listed:
     - `localhost` (already there by default)
     - `inner-doodad-461919-n6.firebaseapp.com` (your Firebase domain)
   - If deploying to production, add your production domain

### Step 4: Verify Configuration

After enabling, verify in Firebase Console:

- ✅ Email/Password: **Enabled**
- ✅ Google: **Enabled**
- ✅ Authorized domains include: `localhost`

---

## 🛠️ Enhanced Error Handling

I've updated your `src/firebase/auth.js` file to provide better error messages that will help users understand what went wrong.

---

## 📋 Quick Checklist

Before testing, make sure:

- [ ] Email/Password authentication is **Enabled** in Firebase Console
- [ ] Google Sign-In is **Enabled** in Firebase Console  
- [ ] `localhost` is in **Authorized domains**
- [ ] Project support email is set (for Google Sign-In)

---

## 🔍 Detailed Steps with Screenshots

### Step 1: Access Firebase Console

1. Go to: https://console.firebase.google.com/
2. Click on your project: **inner-doodad-461919-n6**
3. If you don't see it, make sure you're logged in with the correct Google account

### Step 2: Navigate to Authentication

1. In the left sidebar, click **"Authentication"**
2. If you see a "Get started" button, click it to initialize Authentication
3. Click the **"Sign-in method"** tab at the top

### Step 3: Enable Email/Password

You should see a list of sign-in providers. Find **"Email/Password"**:

1. Click on **"Email/Password"**
2. Toggle the **"Enable"** switch to **ON** (blue)
3. Leave other settings as default
4. Click **"Save"**

**Expected Result:** Status should show "Enabled" with a green checkmark.

### Step 4: Enable Google Sign-In

1. Scroll down or find **"Google"** in the provider list
2. Click on **"Google"**
3. Toggle the **"Enable"** switch to **ON** (blue)
4. Enter a **Project support email** (required - use your email)
5. Optionally enter **Project public-facing name**
6. Click **"Save"**

**Note:** If this is your first time enabling Google Sign-In, you may need to configure OAuth consent screen in Google Cloud Console. Firebase will guide you through this.

### Step 5: Verify Authorized Domains

1. Still in Authentication, click the **"Settings"** tab
2. Scroll down to **"Authorized domains"**
3. Make sure these are listed:
   - `localhost` ✅ (should be there by default)
   - `inner-doodad-461919-n6.firebaseapp.com` ✅ (your Firebase domain)
   - Any production domains you're using

---

## 🧪 Test After Enabling

1. **Clear browser cache** (optional but recommended)
2. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```
3. **Try signing in again:**
   - Test Email/Password login
   - Test Google Sign-In

---

## ❌ Still Getting Errors?

### Check Browser Console

Open browser DevTools (F12) and check the Console tab for detailed error messages.

### Common Issues

#### Issue 1: "Email/Password not enabled"
**Solution:** Make sure you saved the changes after enabling Email/Password in Firebase Console.

#### Issue 2: "Google Sign-In not enabled"  
**Solution:** 
- Verify Google provider is enabled and saved
- Check that OAuth consent screen is configured (Google Cloud Console)
- Wait 5-10 minutes for changes to propagate

#### Issue 3: "Unauthorized domain"
**Solution:**
- Add your domain to Authorized domains
- For localhost, make sure you're using `http://localhost:5173` (not 127.0.0.1)
- Wait a few minutes after adding domains

#### Issue 4: "OAuth consent screen not configured"
**Solution:**
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services > OAuth consent screen**
4. Complete the consent screen configuration
5. Return to Firebase Console and save Google provider again

---

## 🔐 Additional Security Settings (Optional)

### Email Link (Passwordless) Authentication

If you want to allow passwordless sign-in:

1. In Email/Password settings
2. Enable **"Email link (passwordless sign-in)"**
3. Configure email templates

### Email Verification

1. In Authentication > Settings > Templates
2. Customize email verification template
3. Ensure "Email verification" is required (if desired)

---

## 📝 Verification Checklist

After completing the steps above, verify:

✅ Firebase Console shows:
- Email/Password: **Enabled**
- Google: **Enabled**

✅ Your code:
- Firebase config has correct `projectId`
- `authDomain` matches your Firebase project
- No typos in API keys

✅ Browser:
- No console errors
- Can successfully sign in with email/password
- Can successfully sign in with Google

---

## 🚀 Testing Commands

After enabling authentication methods, test your app:

```bash
# Make sure your dev server is running
npm run dev

# Open browser to http://localhost:5173
# Navigate to /login or /signup
# Try both authentication methods
```

---

## 📞 Still Need Help?

If you're still experiencing issues:

1. **Check Firebase Status:** https://status.firebase.google.com/
2. **Review Firebase Docs:** https://firebase.google.com/docs/auth
3. **Common Error Codes:**
   - `auth/operation-not-allowed` → Provider not enabled
   - `auth/invalid-api-key` → Wrong API key
   - `auth/unauthorized-domain` → Domain not authorized
   - `auth/network-request-failed` → Network issue

---

## ✅ Success Indicators

You'll know it's working when:

- ✅ Email/password sign-up creates a new user
- ✅ Email/password sign-in successfully authenticates
- ✅ Google sign-in popup appears and completes
- ✅ User is redirected to dashboard after successful auth
- ✅ No errors in browser console

---

**Last Updated:** Fix applied for auth/operation-not-allowed error

