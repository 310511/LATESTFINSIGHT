# Plaid Postman Setup Guide for FinSight

## 🚀 Quick Start: Using Plaid with Postman

This guide will help you test Plaid API integration using Postman before implementing it in your code.

---

## 📋 Prerequisites

1. **Plaid Account** (Free - sign up at https://dashboard.plaid.com/signup)
2. **Postman** (Free - download at https://www.postman.com/downloads/)
3. **Plaid API Keys** (Get from Plaid Dashboard)

---

## 🔧 Step 1: Get Your Plaid API Keys

1. **Sign up/Login to Plaid:**
   - Go to: https://dashboard.plaid.com/
   - Sign up with your email (free for personal projects)

2. **Get Your Keys:**
   - Navigate to: **Team Settings** → **Keys**
   - Copy these values:
     - `client_id` (Client ID)
     - `secret` (Sandbox Secret for testing)

3. **Save them for later:**
   ```env
   PLAID_CLIENT_ID=your_client_id_here
   PLAID_SECRET=your_sandbox_secret_here
   ```

---

## 📥 Step 2: Import Plaid Postman Collection

### Option A: Import from Plaid (Recommended)

1. **Go to Plaid Postman Collection:**
   - Visit: https://www.postman.com/plaid/workspace/plaid-public/collection/18649141-5c8a-4b1c-8693-4dfe4f3d5b5c
   - Or search "Plaid" in Postman's public workspace

2. **Click "Run in Postman"** button

3. **Fork the Collection:**
   - Click "Fork Collection" when prompted
   - Create a free Postman account if needed
   - Save to your workspace

### Option B: Manual Import

1. **Open Postman**
2. **Click "Import"** (top left)
3. **Paste this URL:**
   ```
   https://raw.githubusercontent.com/plaid/plaid-postman/master/Plaid.postman_collection.json
   ```
4. **Click "Import"**

---

## ⚙️ Step 3: Configure Environment Variables

### Create Sandbox Environment

1. **In Postman, click the gear icon** (top right) → **"Manage Environments"**

2. **Click "Add"** to create new environment

3. **Name it:** `Plaid Sandbox`

4. **Add these variables:**

   | Variable | Initial Value | Current Value |
   |----------|--------------|---------------|
   | `client_id` | `your_client_id` | `your_client_id` |
   | `secret` | `your_sandbox_secret` | `your_sandbox_secret` |
   | `env_url` | `sandbox.plaid.com` | `sandbox.plaid.com` |
   | `public_token` | (leave empty) | (leave empty) |
   | `access_token` | (leave empty) | (leave empty) |

5. **Fill in your actual values:**
   - Replace `your_client_id` with your actual Client ID
   - Replace `your_sandbox_secret` with your actual Sandbox Secret

6. **Save** and **select this environment** from the dropdown (top right)

---

## 🧪 Step 4: Test Plaid API (Sandbox Mode)

### Quick Test Flow:

#### 1. Create Item (Sandbox Only)

1. **Navigate to:** `Plaid API Endpoints` → `Items` → `Item Creation` → `Create Item [Sandbox Only]`

2. **Click "Body" tab**

3. **Update the body** (optional):
   ```json
   {
     "client_id": "{{client_id}}",
     "secret": "{{secret}}",
     "institution_id": "ins_109508",
     "initial_products": ["transactions", "auth"],
     "options": {
       "webhook": "https://your-webhook-url.com"
     }
   }
   ```

4. **Click "Send"**

5. **Check Response:**
   - Should return `public_token`
   - This token is automatically saved to `{{public_token}}` variable

#### 2. Exchange Token

1. **Navigate to:** `Plaid API Endpoints` → `Items` → `Item Creation` → `Exchange Token`

2. **Click "Body" tab**

3. **The `public_token` should already be filled** (from previous step)

4. **Click "Send"**

5. **Check Response:**
   - Should return `access_token`
   - This is automatically saved to `{{access_token}}` variable

#### 3. Get Account Balance

1. **Navigate to:** `Plaid API Endpoints` → `Products` → `Balance` → `Retrieve Balance`

2. **Click "Body" tab**

3. **The `access_token` should already be filled**

4. **Click "Send"**

5. **You should see account balance data!** ✅

---

## 📊 Common API Endpoints to Test

### Transactions

**Get Transactions:**
- Path: `Products` → `Transactions` → `Transactions Get`
- Body:
```json
{
  "access_token": "{{access_token}}",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

### Accounts

**Get Accounts:**
- Path: `Products` → `Accounts` → `Accounts Get`
- Body:
```json
{
  "access_token": "{{access_token}}"
}
```

### Identity

**Get Identity:**
- Path: `Products` → `Identity` → `Identity Get`
- Body:
```json
{
  "access_token": "{{access_token}}"
}
```

---

## 🔄 Complete Test Flow Example

Here's a complete flow to test end-to-end:

### Step-by-Step:

1. **Create Item [Sandbox Only]**
   - Gets `public_token`
   - Uses test institution: `ins_109508` (First Platypus Bank)

2. **Exchange Token**
   - Converts `public_token` → `access_token`

3. **Get Accounts**
   - Retrieves account information

4. **Get Balance**
   - Gets account balances

5. **Get Transactions**
   - Retrieves transaction history

---

## 🎯 Testing for FinSight Integration

### What to Test:

1. **Bank Connection:**
   - Test: Create Item → Exchange Token
   - Verify: You get `access_token`

2. **Account Retrieval:**
   - Test: Get Accounts
   - Verify: Account data structure

3. **Transaction Sync:**
   - Test: Get Transactions
   - Verify: Transaction format matches your needs

4. **Error Handling:**
   - Test: Invalid tokens, expired tokens
   - Verify: Error responses

---

## 🔐 Environment Variables Reference

### Sandbox Environment:
```json
{
  "client_id": "your_client_id",
  "secret": "your_sandbox_secret",
  "env_url": "sandbox.plaid.com"
}
```

### Production Environment (When Ready):
```json
{
  "client_id": "your_client_id",
  "secret": "your_production_secret",
  "env_url": "production.plaid.com"
}
```

---

## 📝 Postman Collection Structure

The Plaid Postman collection is organized as:

```
Plaid API Endpoints/
├── Items/
│   ├── Item Creation/
│   │   ├── Create Item [Sandbox Only]
│   │   └── Exchange Token
│   └── Item Management/
│       ├── Get Item
│       └── Remove Item
├── Products/
│   ├── Accounts/
│   │   └── Accounts Get
│   ├── Balance/
│   │   └── Retrieve Balance
│   ├── Transactions/
│   │   └── Transactions Get
│   └── Identity/
│       └── Identity Get
└── Link Tokens/
    └── Create Link Token
```

---

## 🐛 Troubleshooting

### Issue: "Invalid client_id or secret"

**Solution:**
- Double-check your API keys in environment variables
- Make sure you're using Sandbox secret (not Production)
- Verify keys in Plaid Dashboard

### Issue: "Invalid public_token"

**Solution:**
- Make sure you completed "Create Item" step first
- Check that `{{public_token}}` variable is set
- Try creating a new item

### Issue: "Item not found"

**Solution:**
- Make sure you exchanged the token
- Verify `{{access_token}}` is set
- Try the flow from the beginning

### Issue: "Environment variables not working"

**Solution:**
- Make sure environment is selected (top right dropdown)
- Check variable names match exactly (case-sensitive)
- Use `{{variable_name}}` syntax in requests

---

## 💡 Pro Tips

### 1. Save Common Requests
- Right-click request → "Save Response" → "Save as Example"
- Use for reference when coding

### 2. Use Pre-request Scripts
- Automatically set variables
- Add timestamps
- Generate test data

### 3. Create Test Scripts
- Validate responses
- Check data structure
- Auto-save tokens

### 4. Organize with Folders
- Group related requests
- Create test suites
- Share with team

---

## 🔄 Integration with Your Code

Once you've tested in Postman, you can use the same structure in your code:

### Example: Node.js Implementation

```javascript
// Based on Postman request structure
const plaid = require('plaid');

const client = new plaid.Client({
  clientID: process.env.PLAID_CLIENT_ID,
  secret: process.env.PLAID_SECRET,
  env: plaid.environments.sandbox, // or production
});

// Create Link Token (equivalent to Postman request)
const linkTokenResponse = await client.createLinkToken({
  user: { client_user_id: 'user123' },
  client_name: 'FinSight',
  products: ['transactions', 'auth'],
  country_codes: ['US'],
});

// Exchange Public Token (equivalent to Postman request)
const exchangeResponse = await client.exchangePublicToken(publicToken);

// Get Accounts (equivalent to Postman request)
const accountsResponse = await client.getAccounts(exchangeResponse.access_token);

// Get Transactions (equivalent to Postman request)
const transactionsResponse = await client.getTransactions(
  exchangeResponse.access_token,
  '2024-01-01',
  '2024-12-31'
);
```

---

## 📚 Next Steps

After testing in Postman:

1. **Understand the API structure** from Postman responses
2. **Map responses to your database schema** (see `BANKING_INTEGRATION.md`)
3. **Implement in your backend** using Plaid Node.js SDK
4. **Test with real connections** (when ready)

---

## 🔗 Useful Links

- **Plaid Dashboard:** https://dashboard.plaid.com/
- **Plaid Docs:** https://plaid.com/docs/
- **Postman Collection:** https://www.postman.com/plaid/workspace/plaid-public
- **Plaid Node.js SDK:** https://github.com/plaid/plaid-node

---

## ✅ Checklist

Before implementing in code:

- [ ] Plaid account created
- [ ] API keys obtained
- [ ] Postman collection imported
- [ ] Environment variables configured
- [ ] Successfully created item in Sandbox
- [ ] Successfully exchanged token
- [ ] Successfully retrieved accounts
- [ ] Successfully retrieved transactions
- [ ] Understood response structure
- [ ] Ready to implement in code

---

**Last Updated:** Plaid Postman setup guide for FinSight project

