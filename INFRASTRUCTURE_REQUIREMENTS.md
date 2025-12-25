# FinSight Infrastructure Requirements

## Overview
This document outlines all databases, storage solutions, and custom APIs required for the FinSight financial document processing application.

---

## 1. DATABASES

### 1.1 Primary Database: **PostgreSQL** (Recommended) or **MongoDB**

**Purpose**: Store structured relational data for users, documents, and processing metadata.

#### Tables/Collections Needed:

**Users Table**
```sql
- user_id (UUID, Primary Key)
- email (String, Unique)
- display_name (String)
- created_at (Timestamp)
- updated_at (Timestamp)
- subscription_tier (String: free/premium/enterprise)
- settings (JSONB)
```

**Documents Table**
```sql
- document_id (UUID, Primary Key)
- user_id (UUID, Foreign Key → Users)
- original_filename (String)
- file_type (String: pdf/xlsx/csv/jpg/png)
- file_size (BigInt, bytes)
- storage_path (String, S3/Firebase Storage path)
- upload_timestamp (Timestamp)
- processing_status (String: pending/processing/completed/failed)
- processing_started_at (Timestamp)
- processing_completed_at (Timestamp)
- error_message (Text, nullable)
```

**Processing Results Table**
```sql
- result_id (UUID, Primary Key)
- document_id (UUID, Foreign Key → Documents)
- extracted_data (JSONB) - Structured extracted data
- insights (JSONB) - AI-generated insights
- summary_stats (JSONB) - Total credits, debits, transactions, etc.
- anomalies (JSONB) - Detected anomalies
- output_files (JSONB) - Paths to generated PDF/Excel/JSON files
- created_at (Timestamp)
```

**Processing History Table**
```sql
- history_id (UUID, Primary Key)
- document_id (UUID, Foreign Key → Documents)
- user_id (UUID, Foreign Key → Users)
- action_type (String: upload/process/download/delete)
- action_timestamp (Timestamp)
- metadata (JSONB)
```

**User Settings Table**
```sql
- setting_id (UUID, Primary Key)
- user_id (UUID, Foreign Key → Users)
- email_notifications (Boolean)
- push_notifications (Boolean)
- dark_mode (Boolean)
- preferred_export_format (String)
- updated_at (Timestamp)
```

**Analytics Table**
```sql
- analytics_id (UUID, Primary Key)
- user_id (UUID, Foreign Key → Users)
- document_id (UUID, Foreign Key → Documents)
- processing_time_ms (Integer)
- success_rate (Float)
- document_type (String)
- created_at (Timestamp)
```

### 1.2 Alternative: **Firebase Firestore** (NoSQL)

If using Firebase ecosystem:
- Collections: `users`, `documents`, `processingResults`, `history`, `settings`, `analytics`
- Similar structure but as NoSQL documents

---

## 2. STORAGE SOLUTIONS

### 2.1 **AWS S3** (Recommended for Production)

**Why S3?**
- Scalable object storage
- Cost-effective for large files
- Better for production workloads
- Direct integration with AI/ML services
- Lifecycle policies for archival

**Bucket Structure:**
```
s3://finsight-documents/
├── uploads/
│   └── {user_id}/
│       └── {document_id}/
│           └── original.{ext}
├── processed/
│   └── {user_id}/
│       └── {document_id}/
│           ├── output.pdf
│           ├── output.xlsx
│           └── output.json
└── temp/
    └── {processing_job_id}/
        └── intermediate_files/
```

**S3 Configuration:**
- **Bucket Name**: `finsight-documents-prod`
- **Region**: `us-east-1` (or your preferred region)
- **Access Control**: Private buckets with signed URLs
- **Lifecycle Rules**: 
  - Move to Glacier after 90 days
  - Delete temp files after 7 days
- **Versioning**: Enabled for document recovery
- **Encryption**: SSE-S3 or SSE-KMS

### 2.2 **Firebase Storage** (Alternative)

**Why Firebase Storage?**
- Already configured in your project
- Easy integration with Firebase Auth
- Good for smaller scale
- Built-in security rules

**Storage Structure:**
```
gs://finsight-78ad1.firebasestorage.app/
├── documents/
│   └── {user_id}/
│       └── {document_id}/
│           ├── original.{ext}
│           └── processed/
│               ├── output.pdf
│               ├── output.xlsx
│               └── output.json
```

**Firebase Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{userId}/{documentId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2.3 **Hybrid Approach** (Recommended)
- **S3**: Production document storage
- **Firebase Storage**: User profile images, small metadata files
- **CDN**: CloudFront for fast document delivery

---

## 3. CUSTOM APIs REQUIRED

### 3.1 **Document Upload API**

**Endpoint**: `POST /api/v1/documents/upload`

**Request:**
```json
{
  "file": "multipart/form-data",
  "user_id": "uuid",
  "document_type": "bank_statement|invoice|gst|payroll|audit"
}
```

**Response:**
```json
{
  "success": true,
  "document_id": "uuid",
  "file_url": "s3://...",
  "status": "uploaded",
  "uploaded_at": "2025-01-15T10:24:00Z"
}
```

**Functionality:**
- Validate file type and size
- Upload to S3/Firebase Storage
- Create database record
- Queue processing job
- Return document metadata

---

### 3.2 **Document Processing API**

**Endpoint**: `POST /api/v1/documents/{document_id}/process`

**Request:**
```json
{
  "processing_options": {
    "extract_tables": true,
    "detect_anomalies": true,
    "generate_insights": true,
    "output_formats": ["pdf", "excel", "json"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "uuid",
  "status": "processing",
  "estimated_completion": "2025-01-15T10:26:00Z"
}
```

**Functionality:**
- Trigger AI/ML processing pipeline
- Extract text, tables, transactions
- Categorize transactions
- Detect anomalies
- Generate insights
- Create output files (PDF, Excel, JSON)
- Update database with results

**Processing Pipeline:**
1. Text Extraction (OCR/Tesseract or AWS Textract)
2. Table Detection (Computer Vision)
3. Transaction Identification (NLP)
4. Categorization (ML Model)
5. Anomaly Detection (ML Model)
6. Report Generation

---

### 3.3 **Document Status API**

**Endpoint**: `GET /api/v1/documents/{document_id}/status`

**Response:**
```json
{
  "document_id": "uuid",
  "status": "processing|completed|failed",
  "progress": 75,
  "current_step": "Categorization",
  "estimated_time_remaining": 30
}
```

**Functionality:**
- Real-time processing status
- WebSocket support for live updates
- Progress tracking

---

### 3.4 **Document Results API**

**Endpoint**: `GET /api/v1/documents/{document_id}/results`

**Response:**
```json
{
  "document_id": "uuid",
  "extracted_data": {
    "transactions": [...],
    "summary": {
      "total_credits": 825000,
      "total_debits": 765800,
      "net_balance": 59200,
      "transaction_count": 324
    },
    "anomalies": [...],
    "insights": "..."
  },
  "output_files": {
    "pdf": "s3://.../output.pdf",
    "excel": "s3://.../output.xlsx",
    "json": "s3://.../output.json"
  },
  "processed_at": "2025-01-15T10:25:00Z"
}
```

**Functionality:**
- Retrieve processed results
- Include signed URLs for download
- Cache results for performance

---

### 3.5 **Document History API**

**Endpoint**: `GET /api/v1/users/{user_id}/documents`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `date_from`: Start date
- `date_to`: End date
- `search`: Search by filename

**Response:**
```json
{
  "documents": [
    {
      "document_id": "uuid",
      "filename": "BankStatement_Jan2025.pdf",
      "type": "bank_statement",
      "status": "completed",
      "uploaded_at": "2025-01-15T10:24:00Z",
      "processed_at": "2025-01-15T10:25:00Z",
      "file_size": 2457600
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1248,
    "total_pages": 63
  }
}
```

**Functionality:**
- List user's documents
- Pagination
- Filtering and search
- Sorting options

---

### 3.6 **Document Download API**

**Endpoint**: `GET /api/v1/documents/{document_id}/download`

**Query Parameters:**
- `format`: pdf|excel|json

**Response:**
- Binary file or signed S3 URL
- Content-Type headers
- File download

**Functionality:**
- Generate signed URLs for S3
- Support multiple formats
- Track download history

---

### 3.7 **Document Delete API**

**Endpoint**: `DELETE /api/v1/documents/{document_id}`

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Functionality:**
- Delete from database
- Delete from S3/Firebase Storage
- Soft delete option (archive)

---

### 3.8 **User Settings API**

**Endpoint**: `GET /api/v1/users/{user_id}/settings`
**Endpoint**: `PUT /api/v1/users/{user_id}/settings`

**Request:**
```json
{
  "email_notifications": true,
  "push_notifications": false,
  "dark_mode": true,
  "preferred_export_format": "excel"
}
```

**Functionality:**
- Get user settings
- Update user settings
- Validate settings

---

### 3.9 **Analytics API**

**Endpoint**: `GET /api/v1/users/{user_id}/analytics`

**Response:**
```json
{
  "total_documents": 1248,
  "today_files": 26,
  "avg_processing_time": 3.4,
  "success_rate": 98.7,
  "documents_by_type": {
    "bank_statement": 450,
    "invoice": 320,
    "gst": 280,
    "payroll": 198
  },
  "recent_activity": [...]
}
```

**Functionality:**
- Dashboard statistics
- Processing metrics
- Usage analytics

---

### 3.10 **Support/Contact API**

**Endpoint**: `POST /api/v1/support/contact`

**Request:**
```json
{
  "user_id": "uuid",
  "subject": "Issue with document processing",
  "message": "...",
  "document_id": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "ticket_id": "uuid",
  "message": "Support ticket created"
}
```

**Functionality:**
- Create support tickets
- Email notifications
- Ticket tracking

---

## 4. AI/ML SERVICES REQUIRED

### 4.1 **OCR/Text Extraction**
- **AWS Textract** (Recommended)
- **Google Cloud Vision API**
- **Tesseract OCR** (Open source, self-hosted)

### 4.2 **Document Classification**
- **Custom ML Model** (TensorFlow/PyTorch)
- **AWS Comprehend**
- **Google Cloud Document AI**

### 4.3 **Transaction Extraction**
- **Custom NLP Model**
- **SpaCy/NLTK** for text processing
- **Regex patterns** for financial data

### 4.4 **Anomaly Detection**
- **Custom ML Model** (Isolation Forest, Autoencoders)
- **AWS SageMaker**
- **TensorFlow/PyTorch**

---

## 5. INFRASTRUCTURE ARCHITECTURE

```
┌─────────────┐
│   React App │
│  (Frontend) │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         API Gateway                  │
│    (Express.js / FastAPI)            │
└──────┬───────────────────┬───────────┘
       │                   │
       ▼                   ▼
┌─────────────┐    ┌──────────────┐
│  PostgreSQL │    │  AWS S3 /    │
│  Database   │    │  Firebase    │
│             │    │  Storage     │
└─────────────┘    └──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│    Processing Queue                 │
│    (RabbitMQ / AWS SQS)             │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│    AI/ML Processing Workers         │
│    (Python / Node.js Workers)       │
│    - Text Extraction                │
│    - Table Detection                 │
│    - Transaction Extraction          │
│    - Anomaly Detection               │
└─────────────────────────────────────┘
```

---

## 6. RECOMMENDED TECH STACK

### Backend:
- **Node.js + Express** or **Python + FastAPI**
- **PostgreSQL** (Primary database)
- **Redis** (Caching & session management)
- **RabbitMQ** or **AWS SQS** (Job queue)

### Storage:
- **AWS S3** (Primary document storage)
- **CloudFront** (CDN for fast delivery)

### AI/ML:
- **AWS Textract** (OCR)
- **AWS SageMaker** (Custom ML models)
- **Python** (Processing scripts)

### Infrastructure:
- **AWS EC2/ECS** (API servers)
- **AWS Lambda** (Serverless processing)
- **AWS RDS** (PostgreSQL)
- **AWS ElastiCache** (Redis)

---

## 7. ESTIMATED COSTS (Monthly)

### Small Scale (100-500 users):
- **S3 Storage**: $10-50
- **Database**: $50-100 (RDS)
- **API Servers**: $50-150 (EC2)
- **AI Services**: $100-300 (Textract)
- **Total**: ~$210-600/month

### Medium Scale (500-5000 users):
- **S3 Storage**: $100-500
- **Database**: $200-500 (RDS)
- **API Servers**: $200-500 (EC2/ECS)
- **AI Services**: $500-2000 (Textract)
- **Total**: ~$1000-3500/month

---

## 8. IMPLEMENTATION PRIORITY

### Phase 1 (MVP):
1. ✅ Firebase Auth (Already done)
2. ⚠️ PostgreSQL Database Setup
3. ⚠️ S3 Storage Integration
4. ⚠️ Document Upload API
5. ⚠️ Basic Processing API
6. ⚠️ Results Retrieval API

### Phase 2:
1. Document History API
2. User Settings API
3. Analytics API
4. Download API

### Phase 3:
1. Advanced AI/ML Processing
2. Real-time Status Updates (WebSocket)
3. Support API
4. Advanced Analytics

---

## 9. SECURITY CONSIDERATIONS

1. **Authentication**: Firebase Auth (JWT tokens)
2. **Authorization**: Role-based access control
3. **Data Encryption**: 
   - At rest: S3 SSE-KMS
   - In transit: HTTPS/TLS
4. **API Security**: 
   - Rate limiting
   - Input validation
   - SQL injection prevention
5. **File Security**:
   - Signed URLs with expiration
   - Private S3 buckets
   - Virus scanning

---

## 10. NEXT STEPS

1. Set up PostgreSQL database
2. Configure AWS S3 bucket
3. Create API backend (Express.js or FastAPI)
4. Implement document upload endpoint
5. Integrate OCR service (AWS Textract)
6. Build processing pipeline
7. Connect frontend to APIs



# Updated: Thu Dec 25 17:21:01 IST 2025
