# Authentication Token Format Testing Guide

## Current Status
✅ **Modified**: `app.config.ts` authInterceptor now uses `User ${token}` format

## What Changed
1. **Token Format**: Changed from `Bearer ${token}` to `User ${token}`
2. **Token Persistence**: Removed automatic token clearing on app startup
3. **Debug Logging**: Added console.log statements to track token retrieval

## Testing Instructions

### Step 1: Login to the App
1. Navigate to the login page
2. Enter valid credentials
3. Successfully log in
4. You should be redirected to the booking page

### Step 2: Verify Token is Stored
Open browser DevTools (F12) → Console and run:
```javascript
console.log(localStorage.getItem('token'));
```
You should see a token string (not null/undefined)

### Step 3: Check Interceptor Logs
1. Open browser DevTools Console (F12)
2. Perform any action that makes an API call
3. Look for these logs:
   - `🔐 Token found in localStorage: ...` (first 20 chars of token)
   - `📤 Using Authorization header format: User`
   - `📤 Full header value: User ...` (first 50 chars)

### Step 4: Verify Network Requests
1. Open DevTools → Network tab
2. Make an API request (e.g., navigate to booking page)
3. Click on any API request
4. Go to "Headers" section
5. Look for `Authorization` header
6. It should show: `User <your_token_here>`

### Step 5: Test the get-user-data Endpoint
If you want to manually test the specific endpoint:

**Option A: Using Console**
```javascript
const token = localStorage.getItem('token');
fetch('https://warm-spa.vercel.app/api/v1/users/get-user-data', {
  method: 'GET',
  headers: {
    'Authorization': `User ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

**Option B: Using the Test Script**
1. Copy the contents of `test-auth-formats.ts`
2. Paste into browser console
3. It will automatically test all 4 formats and show which one works

## Expected Results

### ✅ If Working Correctly
- Console shows: `🔐 Token found in localStorage`
- Network tab shows: `Authorization: User <token>`
- API responses return 200/201 status
- No "Unauthorized: Invalid bearer type" errors

### ❌ If Still Getting Errors
Check:
1. Is token actually in localStorage? (Step 2)
2. Is interceptor running? (Look for console logs in Step 3)
3. Is the Authorization header correct? (Step 4)
4. Try other formats if needed (see Alternative Formats below)

## Alternative Formats to Try

If `User ${token}` doesn't work, the interceptor can be modified to try:

1. **Client Format**: `Client ${token}`
2. **Bearer Format**: `Bearer ${token}`
3. **Token Only**: Just the token without prefix

To test these, modify line 32 in `app.config.ts`:
```typescript
let authHeader = `User ${token}`;  // Change this line
```

Replace `User` with `Client`, `Bearer`, or remove the prefix entirely.

## Files Modified
- `src/app/app.config.ts` - Updated authInterceptor function
- `src/app/app.config.ts` - Updated initAuthState function

## Debugging Tips
1. Check browser console for any JavaScript errors
2. Check Network tab for actual HTTP status codes
3. Look at the full error response in Network tab
4. Verify token is not empty or malformed
5. Check if API endpoint is accessible (try in Postman)

## API Endpoint Details
- **URL**: `https://warm-spa.vercel.app/api/v1/users/get-user-data`
- **Method**: GET
- **Required Header**: Authorization (with correct format)
- **Expected Response**: User data object

## Next Steps
1. Test the changes by logging in
2. Check console logs and network requests
3. Report which format works (or if none work)
4. If needed, we can implement fallback logic to try multiple formats
