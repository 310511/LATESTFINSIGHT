# Accounting Software Sync - System Architecture

## 📋 Problem Statement

**Current Pain Points:**
- Manual data entry between banking and accounting systems
- Risk of human error in transaction reconciliation
- Time-consuming manual matching processes
- Data inconsistencies between systems
- Lack of real-time visibility into financial status
- Difficult to maintain audit trail

**What This Solves:**
- Two-way synchronization between banking and accounting systems
- Automated transaction matching and reconciliation
- Real-time updates across all connected systems
- Single source of truth for financial data
- Automated journal entry creation
- Complete audit trail and compliance reporting

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
│              Accounting Integration Service                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Provider    │  │  Sync        │  │  Mapping     │          │
│  │  Adapter     │  │  Orchestrator│  │  Engine      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Transaction │  │  Reconciliation│ │  Conflict    │          │
│  │  Mapper      │  │  Engine       │  │  Resolver    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  Journal     │  │  Webhook     │                            │
│  │  Entry       │  │  Handler     │                            │
│  │  Generator   │  │              │                            │
│  └──────────────┘  └──────────────┘                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Accounting │ │   Job Queue  │ │   Database   │
│   Providers  │ │    (Redis)   │ │ (PostgreSQL) │
│              │ │              │ │              │
│  - QuickBooks│ │  - Bull MQ   │ │  - Sync Logs │
│  - Xero      │ │  - Workers   │ │  - Mappings  │
│  - Tally     │ │  - Scheduling│ │  - Conflicts │
│  - Sage      │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Accounting APIs                            │
│  - QuickBooks API (Intuit)                                      │
│  - Xero API                                                     │
│  - Tally API                                                    │
│  - Banking Data (from Banking Integration)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Provider Adapter Layer**
- **Responsibility:** Abstract differences between accounting systems
- **Features:**
  - Provider-specific API wrappers
  - OAuth 2.0 flows
  - Rate limit handling
  - Error translation
  - Token management

#### 2. **Sync Orchestrator**
- **Responsibility:** Coordinate bidirectional sync
- **Features:**
  - Conflict detection
  - Sync strategy selection
  - Dependency management
  - Rollback capabilities
  - Scheduling

#### 3. **Mapping Engine**
- **Responsibility:** Map data between systems
- **Features:**
  - Account mapping (bank → chart of accounts)
  - Transaction type mapping
  - Category mapping
  - Custom field mapping
  - Multi-currency handling

#### 4. **Transaction Mapper**
- **Responsibility:** Convert transactions between formats
- **Features:**
  - Format conversion
  - Field mapping
  - Data validation
  - Transformation rules
  - Schema adaptation

#### 5. **Reconciliation Engine**
- **Responsibility:** Match and reconcile transactions
- **Features:**
  - Automatic matching algorithms
  - Manual matching interface
  - Variance detection
  - Reconciliation reports
  - Audit trail

#### 6. **Conflict Resolver**
- **Responsibility:** Handle data conflicts
- **Features:**
  - Conflict detection
  - Resolution strategies
  - User notification
  - Manual resolution UI
  - Conflict history

#### 7. **Journal Entry Generator**
- **Responsibility:** Create accounting entries
- **Features:**
  - Rule-based entry creation
  - Debit/credit calculation
  - Multi-account entries
  - Validation
  - Approval workflows

---

## 🔌 APIs/Services Required

### Internal APIs

#### 1. Connection Management API
```typescript
POST   /api/v1/accounting/connections
GET    /api/v1/accounting/connections
GET    /api/v1/accounting/connections/:connectionId
PUT    /api/v1/accounting/connections/:connectionId
DELETE /api/v1/accounting/connections/:connectionId
POST   /api/v1/accounting/connections/:connectionId/test
POST   /api/v1/accounting/connections/:connectionId/refresh
```

#### 2. Sync Management API
```typescript
POST   /api/v1/accounting/sync
GET    /api/v1/accounting/sync/status/:syncId
GET    /api/v1/accounting/sync/history
POST   /api/v1/accounting/sync/schedule
DELETE /api/v1/accounting/sync/schedule/:scheduleId
```

#### 3. Mapping Management API
```typescript
GET    /api/v1/accounting/mappings
POST   /api/v1/accounting/mappings
PUT    /api/v1/accounting/mappings/:mappingId
DELETE /api/v1/accounting/mappings/:mappingId
POST   /api/v1/accounting/mappings/bulk-import
```

#### 4. Reconciliation API
```typescript
GET    /api/v1/accounting/reconciliation
POST   /api/v1/accounting/reconciliation/match
POST   /api/v1/accounting/reconciliation/unmatch
POST   /api/v1/accounting/reconciliation/complete
GET    /api/v1/accounting/reconciliation/report
```

#### 5. Transaction API
```typescript
GET    /api/v1/accounting/transactions
POST   /api/v1/accounting/transactions/sync
PUT    /api/v1/accounting/transactions/:transactionId
POST   /api/v1/accounting/transactions/:transactionId/journal-entry
```

#### 6. Conflict Resolution API
```typescript
GET    /api/v1/accounting/conflicts
POST   /api/v1/accounting/conflicts/:conflictId/resolve
POST   /api/v1/accounting/conflicts/resolve-all
```

### External Services

#### Accounting Software Providers

**1. QuickBooks (Intuit)**
- **API:** QuickBooks API / QuickBooks Online API
- **Auth:** OAuth 2.0
- **Rate Limits:** 500 requests/min (sandbox: 100/min)
- **Documentation:** https://developer.intuit.com/

**2. Xero**
- **API:** Xero API
- **Auth:** OAuth 2.0
- **Rate Limits:** 60 requests/min
- **Documentation:** https://developer.xero.com/

**3. Tally**
- **API:** Tally.ERP9 API (ODBC/TDL)
- **Auth:** API Keys / Certificate-based
- **Rate Limits:** Configurable
- **Documentation:** Tally Developer Documentation

**4. Sage (Future)**
- **API:** Sage Business Cloud Accounting API
- **Auth:** OAuth 2.0
- **Rate Limits:** 100 requests/min

---

## 🔄 Data Flow

### Flow 1: Initial Connection Setup

```
User → API Gateway → Connection Service
                       │
                       ├─> OAuth Flow → Accounting Provider
                       │                    │
                       │                    ├─> Authorization
                       │                    └─> Access Token
                       │
                       ├─> Fetch Company/Organization Info
                       │
                       ├─> Fetch Chart of Accounts
                       │
                       ├─> Store Connection (Encrypted)
                       │
                       ├─> Create Default Mappings
                       │
                       └─> Return Connection Status
```

### Flow 2: Transaction Sync (Bank → Accounting)

```
Banking Service → Sync Orchestrator
                      │
                      ├─> Fetch New Transactions
                      │
                      ├─> For Each Transaction:
                      │     ├─> Mapping Engine
                      │     │     └─> Map Bank Account → GL Account
                      │     │     └─> Map Transaction Type
                      │     │
                      │     ├─> Check for Existing Match
                      │     │     └─> Reconciliation Engine
                      │     │
                      │     ├─> If No Match:
                      │     │     ├─> Transaction Mapper
                      │     │     │     └─> Convert Format
                      │     │     │
                      │     │     ├─> Journal Entry Generator
                      │     │     │     └─> Create Entry
                      │     │     │
                      │     │     └─> Provider Adapter
                      │     │           └─> Create in Accounting System
                      │     │
                      │     └─> If Match Found:
                      │           └─> Link & Update Status
                      │
                      └─> Update Sync Status
```

### Flow 3: Reverse Sync (Accounting → Banking)

```
Accounting Webhook → Webhook Handler
                         │
                         ├─> Verify & Parse Event
                         │
                         ├─> Determine Sync Direction
                         │
                         ├─> Fetch Transaction from Accounting
                         │
                         ├─> Check for Banking Transaction Match
                         │
                         ├─> If Match:
                         │     └─> Link Transactions
                         │
                         └─> If No Match:
                               └─> Create Reconciliation Item
```

### Flow 4: Reconciliation Process

```
Reconciliation Trigger → Reconciliation Engine
                              │
                              ├─> Fetch Unreconciled Transactions
                              │     ├─> From Banking
                              │     └─> From Accounting
                              │
                              ├─> Matching Algorithm:
                              │     ├─> Exact Match (Amount + Date)
                              │     ├─> Fuzzy Match (Amount ± tolerance)
                              │     ├─> Rule-Based Match
                              │     └─> ML-Based Match (Future)
                              │
                              ├─> Generate Match Candidates
                              │
                              ├─> User Review (if needed)
                              │
                              ├─> Apply Matches
                              │
                              └─> Generate Reconciliation Report
```

### Flow 5: Conflict Resolution

```
Sync Process → Conflict Detector
                    │
                    ├─> Detect Conflicts:
                    │     ├─> Same ID, Different Data
                    │     ├─> Modified in Both Systems
                    │     └─> Deleted in One System
                    │
                    ├─> Classify Conflict:
                    │     ├─> Data Mismatch
                    │     ├─> Timestamp Conflict
                    │     └─> Status Conflict
                    │
                    ├─> Apply Resolution Strategy:
                    │     ├─> Last Write Wins (auto)
                    │     ├─> Source System Priority
                    │     ├─> Manual Resolution (notify user)
                    │     └─> Merge (if applicable)
                    │
                    └─> Log Conflict & Resolution
```

---

## 🔒 Security & Compliance Considerations

### Security Measures

#### 1. **Credential Management**
- **Encryption:** AES-256 for stored OAuth tokens
- **Key Rotation:** Regular credential rotation
- **Token Refresh:** Automatic refresh before expiration
- **Vault Integration:** HashiCorp Vault / AWS Secrets Manager

#### 2. **Data Protection**
- **Encryption in Transit:** TLS 1.3
- **Encryption at Rest:** Database-level encryption
- **PII Masking:** In logs and non-production environments
- **Access Controls:** Role-based access (RBAC)

#### 3. **Audit Trail**
- **Complete Logging:** All sync operations logged
- **Change Tracking:** Who changed what, when
- **Compliance Reports:** Audit-ready reports
- **Immutable Logs:** Write-once log storage

#### 4. **API Security**
- **OAuth 2.0:** Secure provider connections
- **API Keys:** Rotating keys for integrations
- **Rate Limiting:** Prevent abuse
- **IP Whitelisting:** For enterprise customers

### Compliance Requirements

#### 1. **SOC 2 Type II**
- Security controls
- Availability monitoring
- Processing integrity
- Confidentiality

#### 2. **GDPR**
- Data minimization
- Right to deletion
- Data portability
- Consent management

#### 3. **Financial Regulations**
- **GAAP Compliance:** Generally Accepted Accounting Principles
- **IFRS Compliance:** International Financial Reporting Standards
- **Audit Requirements:** Maintain complete audit trail
- **Data Retention:** Configurable retention policies

#### 4. **Accounting Standards**
- **Double-Entry Bookkeeping:** Enforce accounting principles
- **Chart of Accounts:** Respect user's COA structure
- **Fiscal Year Handling:** Support different fiscal years
- **Multi-Currency:** Proper currency handling

---

## 🚀 MVP vs Production Approach

### MVP (Minimum Viable Product)

#### Phase 1: Single Provider, One-Way Sync (2-3 months)
**Scope:**
- **QuickBooks Online** only (best API documentation)
- **One-way sync:** Banking → QuickBooks (simpler to start)
- Manual sync trigger only
- Basic transaction mapping
- Simple reconciliation (exact matches)

**Tech Stack:**
- Node.js service
- QuickBooks Node SDK
- PostgreSQL for mappings
- Basic job queue

**Limitations:**
- Single provider
- One-way sync only
- Manual sync
- Basic reconciliation
- No conflict resolution

**User Flow:**
1. User connects QuickBooks
2. User maps bank accounts to GL accounts
3. User triggers sync
4. Transactions imported as journal entries
5. Basic reconciliation available

#### Phase 2: Enhanced MVP (2-3 months)
**Add:**
- Scheduled syncs
- Two-way sync (basic)
- Xero support
- Improved reconciliation
- Basic conflict handling

### Production (Scalable System)

#### Architecture Enhancements

**1. Multi-Provider Abstraction**
```typescript
// Provider interface
interface AccountingProvider {
  connect(oauthCode: string): Promise<Connection>;
  getCompany(): Promise<Company>;
  getChartOfAccounts(): Promise<Account[]>;
  createTransaction(transaction: Transaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Transaction): Promise<Transaction>;
  getTransactions(filters: TransactionFilters): Promise<Transaction[]>;
  createJournalEntry(entry: JournalEntry): Promise<JournalEntry>;
}

// Implementations
class QuickBooksProvider implements AccountingProvider { ... }
class XeroProvider implements AccountingProvider { ... }
class TallyProvider implements AccountingProvider { ... }
```

**2. Advanced Reconciliation**
```python
# ML-based transaction matching
from sklearn.ensemble import GradientBoostingClassifier
from sentence_transformers import SentenceTransformer

class ReconciliationEngine:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.classifier = GradientBoostingClassifier()
    
    def find_matches(self, bank_txn: Transaction, accounting_txns: List[Transaction]) -> List[Match]:
        matches = []
        for acc_txn in accounting_txns:
            score = self.calculate_match_score(bank_txn, acc_txn)
            if score > 0.85:  # Confidence threshold
                matches.append(Match(bank_txn, acc_txn, score))
        return sorted(matches, key=lambda x: x.score, reverse=True)
    
    def calculate_match_score(self, txn1: Transaction, txn2: Transaction) -> float:
        features = [
            abs(txn1.amount - txn2.amount) < 0.01,  # Exact amount match
            abs((txn1.date - txn2.date).days) < 3,  # Date proximity
            self.text_similarity(txn1.description, txn2.description),
            txn1.category == txn2.category,
        ]
        return self.classifier.predict_proba([features])[0][1]
```

**3. Real-Time Sync**
- **WebSocket:** Real-time updates to clients
- **Event Streaming:** Kafka/Kinesis for events
- **Webhooks:** Provider webhook support
- **CQRS:** Separate read/write models

**4. Advanced Features**
- Multi-company support
- Inter-company transactions
- Tax code mapping
- Inventory sync (for Tally)
- Payroll integration
- Budget vs Actual reports

---

## 🐛 Technical Challenges & Solutions

### Challenge 1: Different Accounting Standards

**Problem:**
- QuickBooks uses different transaction structure than Xero
- Tally has different account codes
- Chart of Accounts structures vary

**Solution:**
```typescript
// Unified transaction model
interface UnifiedTransaction {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  account: AccountReference;
  debitAccount?: AccountReference;
  creditAccount?: AccountReference;
  category?: string;
  metadata: Record<string, any>;
}

// Provider-specific adapters
class TransactionAdapter {
  static toQuickBooks(unified: UnifiedTransaction): QuickBooksTransaction {
    return {
      Date: unified.date.toISOString().split('T')[0],
      Amount: unified.amount,
      // ... mapping logic
    };
  }
  
  static toXero(unified: UnifiedTransaction): XeroTransaction {
    return {
      Date: unified.date,
      Total: unified.amount,
      // ... mapping logic
    };
  }
}
```

### Challenge 2: Two-Way Sync Conflicts

**Problem:**
- Same transaction modified in both systems
- Deletion in one system, modification in other
- Timing conflicts

**Solution:**
```typescript
// Conflict resolution strategies
enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'last_write_wins',
  SOURCE_PRIORITY = 'source_priority',
  MANUAL = 'manual',
  MERGE = 'merge'
}

class ConflictResolver {
  async resolve(conflict: Conflict, strategy: ConflictResolutionStrategy): Promise<void> {
    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        const lastModified = conflict.bankTransaction.updatedAt > conflict.accountingTransaction.updatedAt
          ? conflict.bankTransaction
          : conflict.accountingTransaction;
        await this.syncToOtherSystem(lastModified);
        break;
        
      case ConflictResolutionStrategy.MANUAL:
        await this.notifyUser(conflict);
        await this.pauseSync(conflict.id);
        break;
        
      // ... other strategies
    }
  }
}
```

### Challenge 3: Chart of Accounts Mapping

**Problem:**
- Different COA structures
- Parent-child relationships
- Custom accounts
- Multi-currency accounts

**Solution:**
```typescript
// Intelligent account mapping
class AccountMappingEngine {
  async suggestMapping(bankAccount: BankAccount, chartOfAccounts: Account[]): Promise<Account[]> {
    // Rule-based suggestions
    const rules = [
      { pattern: /checking|current/i, type: 'Bank' },
      { pattern: /savings/i, type: 'Bank' },
      { pattern: /credit/i, type: 'Credit Card' },
    ];
    
    // ML-based suggestions (future)
    const mlSuggestions = await this.mlModel.predict(bankAccount);
    
    // Combine and rank
    return this.rankSuggestions([...rules, ...mlSuggestions]);
  }
  
  async createMapping(bankAccount: BankAccount, glAccount: Account): Promise<Mapping> {
    return await this.db.query(`
      INSERT INTO account_mappings (
        user_id, bank_account_id, gl_account_id, 
        mapping_type, priority
      ) VALUES ($1, $2, $3, $4, $5)
    `, [userId, bankAccount.id, glAccount.id, 'manual', 1]);
  }
}
```

### Challenge 4: Rate Limiting from Accounting APIs

**Problem:**
- QuickBooks: 500 req/min (production), 100 req/min (sandbox)
- Xero: 60 req/min
- Rate limit violations cause sync failures

**Solution:**
```typescript
// Distributed rate limiter with Redis
import { RateLimiterRedis } from 'rate-limiter-flexible';

class ProviderRateLimiter {
  private limiters: Map<string, RateLimiterRedis> = new Map();
  
  constructor(redisClient: Redis) {
    // QuickBooks: 500/min = ~8/sec, use 7/sec for safety
    this.limiters.set('quickbooks', new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:qb',
      points: 7,
      duration: 1,
    }));
    
    // Xero: 60/min = 1/sec
    this.limiters.set('xero', new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:xero',
      points: 1,
      duration: 1,
    }));
  }
  
  async acquire(provider: string): Promise<void> {
    try {
      await this.limiters.get(provider).consume(provider);
    } catch (rejRes) {
      // Rate limit exceeded
      const retryAfter = Math.round(rejRes.msBeforeNext / 1000);
      throw new RateLimitError(`Rate limit exceeded. Retry after ${retryAfter} seconds`);
    }
  }
}
```

### Challenge 5: Transaction Volume at Scale

**Problem:**
- Large companies have thousands of transactions
- API pagination required
- Batch processing needed

**Solution:**
```typescript
// Batch processing with pagination
class TransactionSyncService {
  async syncTransactions(connectionId: string, dateRange: DateRange): Promise<void> {
    const pageSize = 100;
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      // Fetch batch
      const transactions = await this.provider.getTransactions({
        page,
        pageSize,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      
      // Process in parallel (with concurrency limit)
      await pLimit(10, async (txn) => {
        await this.processTransaction(txn, connectionId);
      })(transactions);
      
      hasMore = transactions.length === pageSize;
      page++;
      
      // Rate limit respect
      await this.rateLimiter.acquire(connectionId);
    }
  }
}
```

### Challenge 6: Journal Entry Generation

**Problem:**
- Complex rules for different transaction types
- Need to handle taxes, fees, splits
- Must respect accounting principles

**Solution:**
```typescript
// Rule-based journal entry generation
class JournalEntryGenerator {
  private rules: JournalEntryRule[] = [];
  
  async generateEntry(transaction: Transaction, mapping: AccountMapping): Promise<JournalEntry> {
    // Find applicable rule
    const rule = this.findRule(transaction, mapping);
    
    // Generate entry based on rule
    const entry: JournalEntry = {
      date: transaction.date,
      description: transaction.description,
      lineItems: [],
    };
    
    // Debit entry
    entry.lineItems.push({
      account: mapping.debitAccount,
      amount: transaction.amount,
      type: 'debit',
    });
    
    // Credit entry (from mapping)
    entry.lineItems.push({
      account: mapping.creditAccount,
      amount: transaction.amount,
      type: 'credit',
    });
    
    // Apply tax rules if applicable
    if (transaction.hasTax) {
      const taxEntry = await this.generateTaxEntry(transaction);
      entry.lineItems.push(...taxEntry.lineItems);
    }
    
    // Validate double-entry
    this.validateDoubleEntry(entry);
    
    return entry;
  }
  
  private validateDoubleEntry(entry: JournalEntry): void {
    const totalDebits = entry.lineItems
      .filter(l => l.type === 'debit')
      .reduce((sum, l) => sum + l.amount, 0);
    
    const totalCredits = entry.lineItems
      .filter(l => l.type === 'credit')
      .reduce((sum, l) => sum + l.amount, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entry does not balance');
    }
  }
}
```

---

## 📊 Database Schema

```sql
-- Accounting connections
CREATE TABLE accounting_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) NOT NULL, -- 'quickbooks', 'xero', 'tally'
    provider_connection_id VARCHAR(255) NOT NULL,
    company_id VARCHAR(255), -- Provider's company/org ID
    company_name VARCHAR(255),
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    expires_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider, company_id)
);

-- Account mappings (Bank Account → GL Account)
CREATE TABLE account_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    connection_id UUID NOT NULL REFERENCES accounting_connections(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    gl_account_id VARCHAR(255) NOT NULL, -- Provider's account ID
    gl_account_name VARCHAR(255),
    mapping_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto', 'rule'
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(connection_id, bank_account_id)
);

-- Transaction mappings
CREATE TABLE transaction_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    bank_transaction_id UUID NOT NULL REFERENCES transactions(id),
    accounting_transaction_id VARCHAR(255) NOT NULL, -- Provider's transaction ID
    provider VARCHAR(50) NOT NULL,
    mapping_type VARCHAR(50), -- 'auto', 'manual', 'reconciled'
    journal_entry_id VARCHAR(255), -- If created as journal entry
    synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(bank_transaction_id, accounting_transaction_id, provider)
);

-- Reconciliation records
CREATE TABLE reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    account_id UUID NOT NULL REFERENCES bank_accounts(id),
    connection_id UUID NOT NULL REFERENCES accounting_connections(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    opening_balance DECIMAL(15,2),
    closing_balance DECIMAL(15,2),
    bank_balance DECIMAL(15,2),
    accounting_balance DECIMAL(15,2),
    difference DECIMAL(15,2),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    reconciled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reconciliation matches
CREATE TABLE reconciliation_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
    bank_transaction_id UUID NOT NULL REFERENCES transactions(id),
    accounting_transaction_id VARCHAR(255) NOT NULL,
    match_type VARCHAR(50), -- 'exact', 'fuzzy', 'manual'
    confidence_score DECIMAL(5,2),
    matched_by UUID REFERENCES users(id),
    matched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(reconciliation_id, bank_transaction_id, accounting_transaction_id)
);

-- Sync logs
CREATE TABLE accounting_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES accounting_connections(id),
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'reverse'
    direction VARCHAR(50) NOT NULL, -- 'bank_to_accounting', 'accounting_to_bank', 'bidirectional'
    status VARCHAR(50) NOT NULL,
    transactions_synced INTEGER DEFAULT 0,
    transactions_created INTEGER DEFAULT 0,
    transactions_updated INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conflict records
CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES accounting_connections(id),
    transaction_id UUID,
    accounting_transaction_id VARCHAR(255),
    conflict_type VARCHAR(50), -- 'data_mismatch', 'timestamp', 'deletion'
    bank_data JSONB,
    accounting_data JSONB,
    resolution_strategy VARCHAR(50),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved', 'ignored'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal entry rules
CREATE TABLE journal_entry_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    connection_id UUID NOT NULL REFERENCES accounting_connections(id),
    name VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL, -- Rule conditions
    debit_account_id VARCHAR(255),
    credit_account_id VARCHAR(255),
    tax_code VARCHAR(100),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_account_mappings_user ON account_mappings(user_id, is_active);
CREATE INDEX idx_transaction_mappings_bank ON transaction_mappings(bank_transaction_id);
CREATE INDEX idx_transaction_mappings_accounting ON transaction_mappings(accounting_transaction_id, provider);
CREATE INDEX idx_reconciliations_account ON reconciliations(account_id, status);
CREATE INDEX idx_sync_conflicts_connection ON sync_conflicts(connection_id, status);
```

---

## 🎯 Success Metrics

### Technical Metrics
- **Sync Success Rate:** > 99%
- **Reconciliation Accuracy:** > 95%
- **Conflict Resolution Time:** < 24 hours
- **API Response Time:** < 300ms (p95)
- **Sync Processing Time:** < 5 minutes per account

### Business Metrics
- **Connection Success Rate:** > 85%
- **Auto-Reconciliation Rate:** > 80%
- **User Satisfaction:** CSAT > 4.5/5
- **Time Saved:** > 10 hours/week per user

---

## 📝 Implementation Checklist

### Phase 1: MVP
- [ ] Integrate QuickBooks SDK
- [ ] Implement OAuth flow
- [ ] Create connection management API
- [ ] Build account mapping UI
- [ ] Implement one-way sync (Bank → QB)
- [ ] Create basic reconciliation
- [ ] Add journal entry generation
- [ ] Error handling and logging

### Phase 2: Production
- [ ] Add Xero support
- [ ] Implement two-way sync
- [ ] Advanced reconciliation
- [ ] Conflict resolution system
- [ ] Scheduled syncs
- [ ] Webhook support
- [ ] Multi-company support
- [ ] Comprehensive testing
- [ ] Documentation

---

This architecture provides a robust foundation for accounting software integration with support for multiple providers, bidirectional sync, and intelligent reconciliation.

