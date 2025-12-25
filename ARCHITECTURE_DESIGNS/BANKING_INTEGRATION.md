# Banking Integration - System Architecture

## 📋 Problem Statement

**Current Pain Points:**
- Manual bank statement uploads are time-consuming
- Multiple bank formats require manual normalization
- Duplicate transactions cause reconciliation issues
- No real-time visibility into cash flow
- Security concerns with manual file handling

**What This Solves:**
- Automatic bank connection and statement import
- Unified transaction data model across all banks
- Intelligent duplicate detection and handling
- Real-time transaction sync and alerts
- Secure, encrypted data transmission
- Automated reconciliation with accounting systems

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│              (Web App, Mobile App, API Consumers)                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS/WSS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  - Authentication & Authorization                                │
│  - Rate Limiting                                                 │
│  - Request Routing                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Banking Integration Service                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Connection  │  │  Statement   │  │ Transaction  │          │
│  │  Manager     │  │  Processor   │  │  Normalizer  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Duplicate   │  │  Sync        │  │  Webhook     │          │
│  │  Detector    │  │  Orchestrator│  │  Handler     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Banking    │ │   Job Queue  │ │   Database   │
│   Providers  │ │    (Redis)   │ │ (PostgreSQL) │
│              │ │              │ │              │
│  - Plaid     │ │  - Bull MQ   │ │  - Accounts  │
│  - Yodlee    │ │  - Workers   │ │  - Txns      │
│  - Finicity  │ │  - Scheduling│ │  - Sync Logs │
│  - MX        │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Banking APIs                       │
│  - Bank APIs (Open Banking)                                     │
│  - Aggregator APIs (Plaid, Yodlee)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Connection Manager Service**
- **Responsibility:** Manage bank connections, OAuth flows, token refresh
- **Features:**
  - Multi-provider support (Plaid, Yodlee, Finicity, MX)
  - OAuth 2.0 / Open Banking flows
  - Connection status monitoring
  - Token lifecycle management
  - Reconnection handling

#### 2. **Statement Processor Service**
- **Responsibility:** Process various statement formats (PDF, CSV, JSON)
- **Features:**
  - Format detection and parsing
  - OCR for PDF statements
  - CSV normalization
  - Transaction extraction
  - Metadata extraction (dates, balances, etc.)

#### 3. **Transaction Normalizer**
- **Responsibility:** Convert bank-specific formats to unified schema
- **Features:**
  - Schema mapping per bank
  - Currency normalization
  - Date/time standardization
  - Category inference
  - Merchant name extraction

#### 4. **Duplicate Detector**
- **Responsibility:** Identify and handle duplicate transactions
- **Features:**
  - Fuzzy matching algorithms
  - Machine learning-based detection
  - Configurable matching rules
  - Manual merge capabilities

#### 5. **Sync Orchestrator**
- **Responsibility:** Coordinate sync operations
- **Features:**
  - Scheduled sync jobs
  - Event-driven sync triggers
  - Retry mechanisms
  - Conflict resolution

#### 6. **Webhook Handler**
- **Responsibility:** Handle real-time updates from banking providers
- **Features:**
  - Webhook verification
  - Event processing
  - Rate limiting
  - Idempotency handling

---

## 🔌 APIs/Services Required

### Internal APIs

#### 1. Bank Connection API
```typescript
POST   /api/v1/banking/connections
GET    /api/v1/banking/connections
GET    /api/v1/banking/connections/:connectionId
DELETE /api/v1/banking/connections/:connectionId
POST   /api/v1/banking/connections/:connectionId/reconnect
POST   /api/v1/banking/connections/:connectionId/test
```

#### 2. Account Management API
```typescript
GET    /api/v1/banking/accounts
GET    /api/v1/banking/accounts/:accountId
GET    /api/v1/banking/accounts/:accountId/transactions
POST   /api/v1/banking/accounts/:accountId/sync
```

#### 3. Transaction API
```typescript
GET    /api/v1/banking/transactions
GET    /api/v1/banking/transactions/:transactionId
PUT    /api/v1/banking/transactions/:transactionId
POST   /api/v1/banking/transactions/batch-merge
POST   /api/v1/banking/transactions/:transactionId/deduplicate
```

#### 4. Sync Management API
```typescript
POST   /api/v1/banking/sync
GET    /api/v1/banking/sync/status/:syncId
GET    /api/v1/banking/sync/history
POST   /api/v1/banking/sync/schedule
```

### External Services

#### Banking Aggregators (Primary)
- **Plaid** (US, Canada, UK) - Most popular, robust API
- **Yodlee** (Global) - Enterprise-grade, broad coverage
- **Finicity** (US) - Mastercard-owned, strong security
- **MX** (US) - Good for data enhancement

#### Open Banking Providers (Europe, UK)
- **TrueLayer** (Europe, UK)
- **Tink** (Europe)
- **Open Banking UK** (UK banks)

#### Direct Bank APIs
- **Bank APIs** (if available) - Direct integration with banks
- **OFX** (Open Financial Exchange) - Legacy standard

---

## 🔄 Data Flow

### Flow 1: Initial Bank Connection

```
User → API Gateway → Connection Manager
                       │
                       ├─> OAuth Flow → Banking Provider
                       │                    │
                       │                    ├─> Authorization Code
                       │                    └─> Exchange for Tokens
                       │
                       ├─> Store Credentials (Encrypted)
                       │
                       ├─> Fetch Accounts List
                       │
                       └─> Store Connection Status → Database
```

### Flow 2: Transaction Sync (Scheduled/Manual)

```
Scheduler/API → Sync Orchestrator
                    │
                    ├─> Get Active Connections
                    │
                    ├─> For Each Connection:
                    │     ├─> Job Queue → Worker Process
                    │     │
                    │     ├─> Fetch Transactions (Plaid/Yodlee)
                    │     │
                    │     ├─> Transaction Normalizer
                    │     │     └─> Convert to Unified Schema
                    │     │
                    │     ├─> Duplicate Detector
                    │     │     └─> Check Against Existing
                    │     │
                    │     ├─> Store/Update Transactions
                    │     │
                    │     └─> Trigger Webhooks/Notifications
                    │
                    └─> Update Sync Status
```

### Flow 3: Real-Time Webhook Processing

```
Banking Provider → Webhook Handler
                        │
                        ├─> Verify Signature
                        │
                        ├─> Check Idempotency
                        │
                        ├─> Parse Event (NEW_TRANSACTION, ACCOUNT_UPDATED)
                        │
                        ├─> Queue Event → Job Queue
                        │
                        └─> Worker Process:
                              ├─> Normalize Transaction
                              ├─> Duplicate Detection
                              ├─> Store Transaction
                              └─> Notify User (Real-time)
```

### Flow 4: Duplicate Detection Algorithm

```
Transaction → Duplicate Detector
                   │
                   ├─> Extract Features:
                   │     - Amount
                   │     - Date (with window)
                   │     - Merchant/Payee
                   │     - Description Hash
                   │
                   ├─> Query Similar Transactions
                   │     └─> PostgreSQL + pg_trgm (fuzzy search)
                   │
                   ├─> Calculate Similarity Scores
                   │     └─> ML Model (optional)
                   │
                   ├─> If Match Found:
                   │     ├─> Mark as Duplicate
                   │     ├─> Link Transactions
                   │     └─> Notify User
                   │
                   └─> If No Match:
                         └─> Store as New Transaction
```

---

## 🔒 Security & Compliance Considerations

### Security Measures

#### 1. **Credential Storage**
- **Encryption at Rest:** AES-256 encryption for stored credentials
- **Key Management:** AWS KMS / HashiCorp Vault
- **Token Refresh:** Automatic refresh before expiration
- **Never Log Credentials:** Comprehensive audit of logging

#### 2. **Data Transmission**
- **TLS 1.3:** All API communications
- **Certificate Pinning:** For mobile applications
- **Webhook Signatures:** Verify all incoming webhooks
- **Rate Limiting:** Prevent abuse and DDoS

#### 3. **Authentication & Authorization**
- **OAuth 2.0:** Secure bank connection flows
- **JWT Tokens:** Stateless API authentication
- **Scoped Permissions:** Fine-grained access control
- **MFA Support:** For sensitive operations

#### 4. **Data Privacy**
- **PII Masking:** In logs and analytics
- **Data Retention:** Configurable retention policies
- **Right to Deletion:** GDPR compliance
- **Audit Logs:** All access and modifications logged

### Compliance Requirements

#### 1. **PCI DSS** (Payment Card Industry)
- No storage of card numbers
- Encrypted transmission
- Secure credential handling
- Regular security audits

#### 2. **GDPR** (EU General Data Protection Regulation)
- Explicit consent for data processing
- Right to access, rectify, delete
- Data portability
- Breach notification (72 hours)

#### 3. **SOC 2 Type II**
- Security controls
- Availability monitoring
- Processing integrity
- Confidentiality protection
- Privacy controls

#### 4. **Financial Regulations**
- **PII Handling:** Secure personal information
- **Audit Trails:** Complete transaction history
- **Data Residency:** Store data in compliant regions
- **Regulatory Reporting:** If required by jurisdiction

#### 5. **Open Banking Compliance**
- **PSD2** (EU): Strong Customer Authentication (SCA)
- **Open Banking UK:** API security standards
- **Token Management:** Secure refresh token handling

---

## 🚀 MVP vs Production Approach

### MVP (Minimum Viable Product)

#### Phase 1: Single Provider, Basic Features (2-3 months)
**Scope:**
- Integration with **Plaid only** (easiest, most documented)
- Manual sync trigger only (no scheduling)
- Basic duplicate detection (exact matches only)
- Simple transaction list view
- Support 1-2 bank types

**Tech Stack:**
- Node.js service
- PostgreSQL for transactions
- Basic job queue (Bull with local Redis)
- Simple duplicate detection (SQL-based)

**Limitations:**
- Manual sync only
- No real-time updates
- Basic duplicate detection
- Single provider
- No retry mechanism

**User Flow:**
1. User connects bank via Plaid Link
2. User manually triggers sync
3. Transactions imported
4. Basic duplicate flagging

#### Phase 2: Enhanced MVP (2-3 months)
**Add:**
- Scheduled sync (daily)
- Webhook support
- Improved duplicate detection
- Multiple account support
- Basic error handling

### Production (Scalable System)

#### Architecture Enhancements

**1. Multi-Provider Support**
```typescript
// Provider abstraction
interface BankingProvider {
  connect(credentials: Credentials): Promise<Connection>;
  fetchTransactions(accountId: string, dateRange: DateRange): Promise<Transaction[]>;
  refreshToken(connectionId: string): Promise<Token>;
  handleWebhook(event: WebhookEvent): Promise<void>;
}

// Implementations
class PlaidProvider implements BankingProvider { ... }
class YodleeProvider implements BankingProvider { ... }
class FinicityProvider implements BankingProvider { ... }
```

**2. Scalable Infrastructure**
- **Kubernetes:** Container orchestration
- **Auto-scaling:** Based on queue depth
- **Multi-region:** For global users
- **CDN:** For static assets
- **Load Balancers:** HAProxy/Nginx

**3. Advanced Duplicate Detection**
```python
# ML-based duplicate detection
from sklearn.ensemble import RandomForestClassifier
from sentence_transformers import SentenceTransformer

class DuplicateDetector:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.classifier = RandomForestClassifier()
    
    def detect_duplicates(self, transaction: Transaction, existing: List[Transaction]) -> Optional[Transaction]:
        # Generate embeddings
        features = self.extract_features(transaction)
        similarities = [self.calculate_similarity(features, self.extract_features(t)) for t in existing]
        
        # ML classification
        if max(similarities) > 0.95:
            return existing[similarities.index(max(similarities))]
        return None
```

**4. Real-Time Processing**
- **WebSocket:** Real-time updates to clients
- **Event Streaming:** Apache Kafka / AWS Kinesis
- **CQRS:** Separate read/write models
- **Event Sourcing:** Complete audit trail

**5. Advanced Features**
- Multi-currency support
- Transaction categorization (ML)
- Fraud detection
- Cash flow forecasting
- Reconciliation automation

---

## 🐛 Technical Challenges & Solutions

### Challenge 1: Multiple Bank Formats

**Problem:**
- Different banks use different formats
- Same bank may have different formats (PDF vs API)
- International banks have regional variations

**Solution:**
```typescript
// Format-agnostic parser pipeline
interface TransactionParser {
  canParse(format: string): boolean;
  parse(data: Buffer | string): Promise<Transaction[]>;
}

class PDFParser implements TransactionParser { ... }
class CSVParser implements TransactionParser { ... }
class JSONParser implements TransactionParser { ... }

// Parser factory
class ParserFactory {
  getParser(format: string): TransactionParser {
    return this.parsers.find(p => p.canParse(format));
  }
}
```

### Challenge 2: Duplicate Detection at Scale

**Problem:**
- Comparing each transaction against millions is expensive
- False positives/negatives are common
- Different matching strategies needed

**Solution:**
```sql
-- Indexed similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_transactions_similarity 
ON transactions USING gin(description gin_trgm_ops);

-- Fast similarity query
SELECT * FROM transactions
WHERE description % 'Similar Description'
  AND amount BETWEEN 99.99 AND 100.01
  AND transaction_date BETWEEN '2024-01-01' AND '2024-01-05'
ORDER BY similarity(description, 'Similar Description') DESC
LIMIT 10;
```

### Challenge 3: Rate Limiting from Banking APIs

**Problem:**
- Banking APIs have strict rate limits
- Burst requests can cause bans
- Different limits per provider

**Solution:**
```typescript
// Token bucket rate limiter per provider
import { RateLimiter } from 'limiter';

class ProviderRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();
  
  constructor() {
    // Plaid: 75 requests/minute
    this.limiters.set('plaid', new RateLimiter({ tokensPerInterval: 75, interval: 'minute' }));
    // Yodlee: 100 requests/minute
    this.limiters.set('yodlee', new RateLimiter({ tokensPerInterval: 100, interval: 'minute' }));
  }
  
  async acquire(provider: string): Promise<void> {
    await this.limiters.get(provider).removeTokens(1);
  }
}
```

### Challenge 4: Token Expiration & Refresh

**Problem:**
- OAuth tokens expire
- Refresh tokens also expire
- User may not be active when refresh needed

**Solution:**
```typescript
// Proactive token refresh
class TokenManager {
  async refreshIfNeeded(connection: Connection): Promise<void> {
    // Refresh 1 day before expiration
    const daysUntilExpiry = (connection.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilExpiry < 1) {
      try {
        const newToken = await this.refreshToken(connection.refreshToken);
        await this.updateConnection(connection.id, newToken);
      } catch (error) {
        // Mark as disconnected, notify user
        await this.markDisconnected(connection.id);
        await this.notifyUser(connection.userId, 'Bank connection expired');
      }
    }
  }
  
  // Background job to refresh all tokens
  async refreshAllTokens(): Promise<void> {
    const connections = await this.getConnectionsNearExpiry(1); // 1 day
    await Promise.all(connections.map(c => this.refreshIfNeeded(c)));
  }
}
```

### Challenge 5: Handling Webhook Idempotency

**Problem:**
- Webhooks may be delivered multiple times
- Processing same event twice causes duplicates
- Need to ensure idempotency

**Solution:**
```typescript
// Idempotent webhook processing
class WebhookHandler {
  async handleWebhook(event: WebhookEvent, signature: string): Promise<void> {
    // Verify signature
    if (!this.verifySignature(event, signature)) {
      throw new Error('Invalid signature');
    }
    
    // Check idempotency key
    const idempotencyKey = `${event.provider}-${event.id}`;
    const existing = await this.redis.get(`webhook:${idempotencyKey}`);
    
    if (existing) {
      // Already processed, return cached result
      return JSON.parse(existing);
    }
    
    // Process event
    const result = await this.processEvent(event);
    
    // Store idempotency key (24 hour TTL)
    await this.redis.setex(`webhook:${idempotencyKey}`, 86400, JSON.stringify(result));
    
    return result;
  }
}
```

### Challenge 6: Data Consistency

**Problem:**
- Concurrent syncs can cause race conditions
- Partial failures leave inconsistent state
- Need transactional guarantees

**Solution:**
```typescript
// Optimistic locking for transactions
class TransactionService {
  async upsertTransaction(transaction: Transaction): Promise<void> {
    // Use PostgreSQL UPSERT with conflict resolution
    await this.db.query(`
      INSERT INTO transactions (
        id, account_id, amount, date, description, hash
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (hash, account_id) 
      DO UPDATE SET
        amount = EXCLUDED.amount,
        updated_at = NOW(),
        version = transactions.version + 1
      WHERE transactions.version = EXCLUDED.version - 1
    `, [transaction.id, transaction.accountId, ...]);
  }
}
```

---

## 📊 Database Schema

```sql
-- Bank connections
CREATE TABLE bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) NOT NULL, -- 'plaid', 'yodlee', etc.
    provider_connection_id VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT NOT NULL, -- Encrypted
    refresh_token_encrypted TEXT, -- Encrypted
    expires_at TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- 'active', 'expired', 'error'
    institution_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider_connection_id)
);

-- Bank accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    provider_account_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50), -- 'checking', 'savings', 'credit'
    currency VARCHAR(10) DEFAULT 'USD',
    current_balance DECIMAL(15,2),
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(connection_id, provider_account_id)
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    provider_transaction_id VARCHAR(255),
    transaction_hash VARCHAR(64) NOT NULL, -- For duplicate detection
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    transaction_date DATE NOT NULL,
    posted_date DATE,
    description TEXT,
    merchant_name VARCHAR(255),
    category VARCHAR(100),
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES transactions(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'cleared', 'reconciled'
    metadata JSONB,
    version INTEGER DEFAULT 1, -- For optimistic locking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(account_id, transaction_hash)
);

-- Indexes for performance
CREATE INDEX idx_transactions_account_date ON transactions(account_id, transaction_date DESC);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_duplicate ON transactions(is_duplicate, duplicate_of);
CREATE INDEX idx_transactions_similarity ON transactions USING gin(description gin_trgm_ops);

-- Sync logs
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES bank_connections(id),
    sync_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'webhook'
    status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'failed'
    accounts_synced INTEGER DEFAULT 0,
    transactions_imported INTEGER DEFAULT 0,
    duplicates_found INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_connection ON sync_logs(connection_id, created_at DESC);
```

---

## 🎯 Success Metrics

### Technical Metrics
- **Sync Success Rate:** > 99%
- **Duplicate Detection Accuracy:** > 95%
- **API Response Time:** < 200ms (p95)
- **Sync Processing Time:** < 30 seconds per account
- **Uptime:** > 99.9%

### Business Metrics
- **Connection Success Rate:** > 90% (user completes flow)
- **Daily Active Syncs:** Track usage patterns
- **Transactions Imported:** Volume metrics
- **User Satisfaction:** CSAT score > 4.5/5

---

## 📝 Implementation Checklist

### Phase 1: MVP
- [ ] Integrate Plaid SDK
- [ ] Implement OAuth flow
- [ ] Create connection management API
- [ ] Build transaction sync service
- [ ] Implement basic duplicate detection
- [ ] Create transaction list API
- [ ] Add error handling and logging

### Phase 2: Production
- [ ] Add multiple provider support
- [ ] Implement scheduled syncs
- [ ] Add webhook handling
- [ ] Improve duplicate detection (ML)
- [ ] Add retry mechanisms
- [ ] Implement rate limiting
- [ ] Add comprehensive monitoring
- [ ] Security audit and penetration testing
- [ ] Load testing
- [ ] Documentation

---

This architecture provides a robust, scalable foundation for banking integration that can handle thousands of users while maintaining security and compliance standards.

