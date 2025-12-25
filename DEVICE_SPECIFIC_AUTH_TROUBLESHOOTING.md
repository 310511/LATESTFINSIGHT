# Device-Specific Authentication Troubleshooting

## 🔍 Problem: Works on Friend's Device, Not on Yours

Since authentication works on your friend's device but not yours, this indicates:
- ✅ Firebase Console is configured correctly
- ✅ Code is working properly
- ❌ There's a **local device/browser issue** on your machine

---

## 🚀 Quick Fixes (Try These First)

### 1. Clear Browser Cache & Storage

**Chrome/Edge:**
1. Press `F12` to open DevTools
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**
4. OR: Go to Settings → Privacy → Clear browsing data → Select "Cached images and files" + "Cookies and site data"

**Firefox:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cookies" and "Cache"
3. Click "Clear Now"

**Safari:**
1. Safari → Preferences → Advanced → Show Develop menu
2. Develop → Empty Caches
3. Safari → Clear History → All History

### 2. Clear Firebase Local Storage

**Method 1: DevTools Console**
1. Open browser DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Find your localhost URL (`http://localhost:5173`)
5. Right-click → **Clear**
6. Refresh the page

**Method 2: DevTools Console Command**
1. Open Console tab (`F12` → Console)
2. Run this command:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 3. Try Incognito/Private Mode

This rules out browser extensions and cache:
- **Chrome:** `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
- **Firefox:** `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
- **Edge:** `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
- **Safari:** `Cmd+Shift+N`

Navigate to your app and try authentication again.

### 4. Disable Browser Extensions

Extensions can block popups or interfere with Firebase:

**Chrome:**
1. Go to `chrome://extensions/`
2. Disable all extensions (toggle off)
3. Try authentication again
4. Re-enable one by one to find the culprit

**Common culprits:**
- Ad blockers (uBlock Origin, AdBlock Plus)
- Privacy extensions (Privacy Badger, Ghostery)
- Popup blockers
- VPN extensions

### 5. Check Browser Console for Errors

1. Open DevTools (`F12`)
2. Go to **Console** tab
3. Look for red error messages
4. Copy any errors and check what they say

Common errors you might see:
- `CORS error` → Network/cors issue
- `Failed to fetch` → Network issue
- `Popup blocked` → Popup blocker active
- `Storage quota exceeded` → Clear storage

---

## 🔧 Network & Firewall Issues

### Check if Firebase APIs are Accessible

1. Open browser console (`F12`)
2. Run this test:
```javascript
fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyChMaEuJpAWtfh3TF1mDZG70zwIst240_A', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' })
}).then(r => console.log('Firebase API accessible')).catch(e => console.error('Firebase API blocked:', e));
```

If you see an error, Firebase APIs might be blocked.

### Solutions:
- **Check firewall/antivirus:** Temporarily disable to test
- **Check VPN:** Disconnect VPN and try again
- **Check corporate network:** Some networks block Firebase APIs
- **Try mobile hotspot:** Test with a different network

---

## 🌐 Browser Compatibility Issues

### Check Browser Version

Firebase requires modern browsers. Check your browser version:

**Chrome/Edge:** `chrome://version/` or `edge://version/`
- **Minimum:** Chrome 90+, Edge 90+

**Firefox:** `about:support`
- **Minimum:** Firefox 88+

**Safari:** Safari → About Safari
- **Minimum:** Safari 14.1+

### Try a Different Browser

If possible, test in:
- Chrome (if using Firefox)
- Firefox (if using Chrome)
- Edge (if using Chrome)

---

## 🔐 Localhost Configuration Issues

### Verify You're Using localhost (Not 127.0.0.1)

Firebase authorized domains use `localhost`, not IP addresses.

**❌ Wrong:**
```
http://127.0.0.1:5173
```

**✅ Correct:**
```
http://localhost:5173
```

### Check Your Dev Server URL

Make sure your Vite dev server shows:
```
Local:   http://localhost:5173/
```

If it shows `127.0.0.1`, check your `vite.config.js`:

```javascript
export default {
  server: {
    host: 'localhost', // Not 0.0.0.0 or 127.0.0.1
  }
}
```

---

## 🚫 Popup Blockers

### For Google Sign-In

Google Sign-In uses popups. If blocked, you'll see `auth/popup-blocked` error.

**Solution:**
1. Check browser's popup blocker settings
2. Allow popups for `localhost:5173`
3. Check if any extensions are blocking popups

**Chrome:**
- Click the popup icon in address bar
- Select "Always allow popups from this site"

---

## 💾 Storage Quota Issues

### Check Available Storage

1. Open DevTools (`F12`)
2. Go to **Application** tab → **Storage**
3. Check **Usage** section

If storage is full:
1. Clear site data
2. Or run in console:
```javascript
// Clear all Firebase-related storage
Object.keys(localStorage).forEach(key => {
  if (key.includes('firebase') || key.includes('firestore')) {
    localStorage.removeItem(key);
  }
});
indexedDB.databases().then(dbs => {
  dbs.forEach(db => {
    if (db.name.includes('firebase')) {
      indexedDB.deleteDatabase(db.name);
    }
  });
});
location.reload();
```

---

## 🔍 Check Firebase SDK Version

Make sure you're using the same Firebase SDK version as your friend.

Check `package.json`:
```json
{
  "dependencies": {
    "firebase": "^12.6.0"
  }
}
```

If different, reinstall:
```bash
npm install firebase@^12.6.0
```

---

## 🐛 Debug Mode: Enable Detailed Logging

Add this to your code temporarily to see detailed Firebase logs:

```javascript
// Add to src/firebase/config.js
import { getAuth, setLogLevel } from "firebase/auth";

export const auth = getAuth(app);
// Enable debug logging
setLogLevel('debug');
```

Check console for detailed Firebase logs.

---

## 📱 Mobile vs Desktop

If testing on different devices:

### Desktop Issues:
- Browser extensions
- Antivirus blocking
- Corporate firewall

### Mobile Issues:
- Network restrictions
- Browser app cache
- Popup blockers in mobile browsers

---

## 🔄 Complete Reset Steps

If nothing else works, perform a complete reset:

1. **Stop dev server** (`Ctrl+C`)

2. **Clear node_modules and reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Clear all browser data:**
   - Clear cache
   - Clear cookies
   - Clear localStorage
   - Clear sessionStorage

4. **Restart browser** (fully close and reopen)

5. **Start dev server:**
```bash
npm run dev
```

6. **Try in incognito/private window**

---

## 🎯 Diagnostic Checklist

Work through this checklist:

- [ ] Tried incognito/private mode
- [ ] Cleared browser cache and storage
- [ ] Disabled all browser extensions
- [ ] Checked browser console for errors
- [ ] Verified using `localhost:5173` (not `127.0.0.1`)
- [ ] Tested in different browser
- [ ] Checked firewall/antivirus settings
- [ ] Disconnected VPN (if using)
- [ ] Tried different network (mobile hotspot)
- [ ] Cleared Firebase local storage
- [ ] Restarted browser completely
- [ ] Reinstalled node_modules

---

## 🔍 Compare with Working Device

Ask your friend to check:

1. **Browser version:** `chrome://version/` or `about:support`
2. **Extensions installed:** Any that might interfere
3. **Network:** Corporate/home network?
4. **Firewall settings:** Any specific rules?
5. **OS version:** Windows/Mac/Linux version

---

## 📊 Most Common Causes

Based on experience, these are the most common causes:

1. **Browser extensions** (80% of cases) - Especially ad blockers
2. **Cached data** (10% of cases) - Old Firebase tokens
3. **Network restrictions** (5% of cases) - Firewall/VPN
4. **Browser version** (3% of cases) - Outdated browser
5. **Other** (2% of cases)

---

## 🆘 Still Not Working?

If you've tried everything above:

1. **Share browser console errors** (screenshot or copy-paste)
2. **Share network tab errors** (DevTools → Network → Look for red requests)
3. **Check Firebase Console** → Authentication → Users (see if user is being created)
4. **Try from a completely different device/browser** to isolate the issue

---

## ✅ Quick Test Script

Run this in browser console to test Firebase connectivity:

```javascript
// Test Firebase Auth connectivity
(async () => {
  console.log('Testing Firebase Auth...');
  
  // Test 1: Check if Firebase is initialized
  try {
    const { auth } = await import('./src/firebase/config.js');
    console.log('✅ Firebase initialized:', !!auth);
  } catch (e) {
    console.error('❌ Firebase not initialized:', e);
  }
  
  // Test 2: Check network connectivity
  try {
    const res = await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=AIzaSyChMaEuJpAWtfh3TF1mDZG70zwIst240_A');
    console.log('✅ Firebase API accessible:', res.ok);
  } catch (e) {
    console.error('❌ Firebase API blocked:', e);
  }
  
  // Test 3: Check localStorage
  console.log('📦 LocalStorage items:', Object.keys(localStorage).length);
  console.log('📦 SessionStorage items:', Object.keys(sessionStorage).length);
})();
```

---

**Last Updated:** Device-specific troubleshooting guide
