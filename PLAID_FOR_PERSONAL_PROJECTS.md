# Plaid for Personal Projects - Usage Guide

## ✅ Short Answer

**YES, Plaid is allowed for personal projects!** However, there are some important considerations:

- ✅ **Development/Testing:** Free sandbox access available
- ✅ **Personal Projects:** Allowed with free tier
- ⚠️ **Production:** May require business verification depending on usage
- ⚠️ **High Volume:** Commercial terms apply

---

## 📋 Plaid Usage Tiers

### 1. **Sandbox/Development (Free)**
- ✅ **Free forever** for development
- ✅ No credit card required
- ✅ Full API access in sandbox mode
- ✅ Test bank accounts included
- ✅ Perfect for personal projects
- ✅ No transaction fees

**Limitations:**
- ❌ Test data only (fake bank accounts)
- ❌ Cannot connect real bank accounts in sandbox
- ❌ Not for production use

### 2. **Development (Free)**
- ✅ Real API access
- ✅ Connect real bank accounts
- ✅ Up to 100 items (bank connections)
- ✅ Free for development/personal use
- ⚠️ Requires account verification

**Best for:**
- Personal portfolio projects
- Learning/education
- Small personal apps
- Portfolio demonstrations

### 3. **Launch (Production)**
- ⚠️ Requires business verification
- ⚠️ Transaction-based pricing
- ✅ Production-ready
- ✅ Unlimited items
- ✅ Full support

**Requirements:**
- Business information
- Use case description
- May require legal entity

---

## 🚀 Getting Started with Plaid (Personal Projects)

### Step 1: Create Plaid Account

1. **Sign up:** https://dashboard.plaid.com/signup
   - Use your personal email
   - Select "I'm building a personal project"
   - Or select "Personal/Portfolio Project"

2. **Verify Email:**
   - Check your email
   - Click verification link

3. **Complete Profile:**
   - Fill in basic information
   - Describe your project
   - Select "Personal/Portfolio" as use case

### Step 2: Get API Keys

1. **Go to Dashboard:** https://dashboard.plaid.com/
2. **Navigate to:** Team Settings → Keys
3. **Copy your keys:**
   - Client ID
   - Sandbox secret (for testing)
   - Development secret (for real connections)

### Step 3: Use Sandbox for Development

**Best practice:** Start with sandbox mode:

```javascript
// Use sandbox for development
const plaidConfig = {
  clientId: 'your_client_id',
  secret: 'your_sandbox_secret', // Use sandbox secret
  environment: 'sandbox', // Not 'production'
};
```

### Step 4: Upgrade When Ready

When you want to connect real bank accounts:
1. Request access to Development environment
2. Complete verification (usually quick for personal projects)
3. Get Development API keys
4. Use real bank connections

---

## ⚠️ Important Considerations

### Terms of Service

**Key Points:**
- ✅ Personal projects are explicitly allowed
- ✅ Free tier available for development
- ⚠️ Cannot resell Plaid access
- ⚠️ Must comply with Plaid's terms
- ⚠️ Production use may require business verification

### What's Allowed:

✅ Personal portfolio projects  
✅ Learning/educational projects  
✅ Side projects  
✅ Open source projects (with attribution)  
✅ Personal finance apps for yourself  
✅ Portfolio demonstrations  

### What's NOT Allowed:

❌ Commercial products without proper tier  
❌ Reselling Plaid services  
❌ High-volume production without commercial account  
❌ Misrepresenting your use case  

---

## 💰 Pricing for Personal Projects

### Free Tier (Development):
- **Cost:** $0
- **Items (Connections):** Up to 100
- **Environment:** Sandbox + Development
- **Support:** Community support
- **Perfect for:** Personal projects, learning, portfolios

### Launch Tier (If Needed):
- **Cost:** Transaction-based (starts ~$0.30 per item/month)
- **Items:** Unlimited
- **Environment:** Production
- **Support:** Priority support
- **When needed:** Commercial production use

---

## 🔄 Alternatives for Personal Projects

If Plaid doesn't work for your needs, here are alternatives:

### 1. **Yodlee** (Good Alternative)
- ✅ Free tier available
- ✅ Personal projects allowed
- ⚠️ More complex setup
- ✅ Global coverage

### 2. **Manual Upload** (Simplest)
- ✅ No API limits
- ✅ No external dependencies
- ✅ Free forever
- ❌ Requires manual work
- ✅ Already in your project

### 3. **Open Banking APIs** (Region-specific)
- ✅ Free (EU/UK)
- ✅ Direct bank APIs
- ⚠️ Region-specific
- ⚠️ More complex

### 4. **Mock/Sample Data** (For Demos)
- ✅ Free
- ✅ No API needed
- ✅ Good for portfolios
- ❌ Not real data

---

## 📝 Implementation Recommendations

### For Personal Projects:

**Option 1: Use Plaid Sandbox (Recommended)**
```javascript
// Free, unlimited, perfect for development
const PLAID_ENV = 'sandbox'; // Free sandbox mode
const PLAID_SECRET = 'your_sandbox_secret';
```

**Benefits:**
- ✅ Completely free
- ✅ No credit card needed
- ✅ Full API access
- ✅ Test data included
- ✅ Perfect for demos

**Limitations:**
- ❌ Cannot connect real banks
- ❌ Test data only

**Option 2: Development Environment**
```javascript
// For real bank connections (free tier available)
const PLAID_ENV = 'development';
const PLAID_SECRET = 'your_dev_secret';
```

**Benefits:**
- ✅ Connect real bank accounts
- ✅ Free for up to 100 items
- ✅ Real transaction data

**Requirements:**
- Account verification (usually quick)

**Option 3: Hybrid Approach**
```javascript
// Best of both worlds
const PLAID_ENV = process.env.NODE_ENV === 'production' 
  ? 'production'  // If you upgrade
  : 'sandbox';    // Free for development
```

---

## ✅ Recommended Setup for Personal Projects

### Development/Testing Phase:

1. **Use Plaid Sandbox:**
   ```env
   PLAID_ENV=sandbox
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_sandbox_secret
   ```

2. **Benefits:**
   - No costs
   - Unlimited testing
   - Complete API access
   - Perfect for portfolios

### If You Need Real Connections:

1. **Request Development Access:**
   - Usually approved quickly for personal projects
   - Free tier: up to 100 bank connections
   - Real transaction data

2. **Upgrade Path:**
   - Only if going commercial
   - Only if exceeding free tier
   - Business verification required

---

## 🎯 Best Practices

### For Personal Projects:

1. **Start with Sandbox:**
   - Free and unlimited
   - Perfect for development
   - Test everything thoroughly

2. **Document Your Use Case:**
   - Be clear it's a personal project
   - Helps with any support requests

3. **Follow Terms:**
   - Don't exceed free tier limits
   - Don't resell access
   - Use appropriately

4. **Upgrade Only When Needed:**
   - Only if going commercial
   - Only if need production
   - Only if exceeding limits

---

## 📚 Resources

### Official Plaid Resources:
- **Sign Up:** https://dashboard.plaid.com/signup
- **Docs:** https://plaid.com/docs/
- **Pricing:** https://plaid.com/pricing/
- **Support:** support@plaid.com

### For Personal Projects:
- **Sandbox Guide:** https://plaid.com/docs/sandbox/
- **Quick Start:** https://plaid.com/docs/quickstart/
- **Test Credentials:** Provided in dashboard

---

## 🆘 FAQ

### Q: Do I need a credit card for personal projects?
**A:** No! Sandbox and development tiers are free with no credit card required.

### Q: Can I use Plaid for my portfolio website?
**A:** Yes! Sandbox mode is perfect for portfolio demos.

### Q: What if I exceed the free tier?
**A:** Contact Plaid support. For personal projects, they're usually understanding.

### Q: Can I use real bank accounts in sandbox?
**A:** No, sandbox uses test data. Use development environment for real accounts.

### Q: Do I need a business for personal projects?
**A:** No! Personal projects are explicitly supported on free tier.

### Q: Can I show Plaid integration in my portfolio?
**A:** Yes! Just mention you're using Plaid's sandbox/test environment.

### Q: What happens if I want to go commercial later?
**A:** You can upgrade to Launch tier when needed. Personal project usage doesn't prevent commercial use later.

---

## ✅ Summary

**For Personal Projects:**

1. ✅ **Plaid is FREE** for development (sandbox)
2. ✅ **Personal projects are allowed** and supported
3. ✅ **No credit card needed** for sandbox/development
4. ✅ **Up to 100 connections** free in development
5. ✅ **Perfect for portfolios** and learning

**Recommendation:**
- Start with Plaid Sandbox (free, unlimited)
- Upgrade to Development only if you need real connections
- Upgrade to Production only if going commercial

**Bottom Line:** Plaid is an excellent choice for personal projects! 🎉

---

**Last Updated:** Guide for using Plaid in personal projects
