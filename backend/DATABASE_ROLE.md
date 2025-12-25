# Database Role in FinSight Application

## Overview
The database (Supabase PostgreSQL) serves as the **persistent storage layer** for the FinSight financial document processing application. It stores all user data, document metadata, processing results, and application state.

## Key Roles of the Database

### 1. **Document Management & Tracking**
The database tracks every document uploaded by users:

- **Document Metadata**: Stores file information (filename, type, size, upload date)
- **Processing Status**: Tracks document processing state (pending → processing → completed/failed)
- **Storage References**: Links to S3 storage paths where actual files are stored
- **User Association**: Links documents to specific users for access control

**Table**: `documents`
```sql
- document_id (UUID) - Unique identifier
- user_id (UUID) - Owner of the document
- original_filename - Original file name
- file_type - MIME type (PDF, Excel, etc.)
- file_size - File size in bytes
- storage_path - S3 bucket path
- processing_status - Current status
- processing_started_at / processing_completed_at - Timestamps
- error_message - Error details if processing fails
```

### 2. **Processing Results Storage**
Stores AI-processed data extracted from documents:

- **Extracted Data**: Structured data extracted from documents (transactions, accounts, etc.)
- **Insights**: AI-generated insights and analysis
- **Summary Statistics**: Calculated metrics and summaries
- **Anomalies**: Detected unusual patterns or errors
- **Output Files**: References to generated output files (JSON, Excel, PDF)

**Table**: `processing_results`
```sql
- result_id (UUID)
- document_id (UUID) - Links to documents table
- extracted_data (JSONB) - Structured extracted data
- insights (JSONB) - AI-generated insights
- summary_stats (JSONB) - Summary statistics
- anomalies (JSONB) - Detected anomalies
- output_files (JSONB) - Generated file references
```

### 3. **User Management**
Stores user account information and preferences:

- **User Profiles**: Email, display name, subscription tier
- **User Settings**: Notification preferences, dark mode, export format preferences

**Tables**: 
- `users` - User account information
- `user_settings` - User preferences and settings

### 4. **Processing History & Audit Trail**
Tracks all actions and changes:

- **Action Logs**: Records all processing actions and state changes
- **Audit Trail**: Maintains history of document processing activities
- **Metadata**: Stores additional context about actions

**Table**: `processing_history`
```sql
- history_id (UUID)
- document_id (UUID)
- user_id (UUID)
- action_type - Type of action performed
- action_timestamp - When action occurred
- metadata (JSONB) - Additional action details
```

### 5. **Analytics & Reporting**
Stores metrics for analytics and reporting:

- **Processing Metrics**: Processing times, success rates
- **Usage Statistics**: Document counts, types processed
- **Performance Data**: For generating analytics dashboards

**Table**: `analytics`
```sql
- analytics_id (UUID)
- user_id (UUID)
- document_id (UUID)
- processing_time_ms - How long processing took
- success_rate - Success percentage
- document_type - Type of document processed
```

### 6. **Support System**
Manages customer support tickets:

- **Support Tickets**: User support requests and responses
- **Ticket Status**: Tracks ticket lifecycle (open → in_progress → resolved)

**Table**: `support_tickets`
```sql
- ticket_id (UUID)
- user_id (UUID)
- subject - Ticket subject
- message - Ticket message
- document_id (UUID) - Optional link to related document
- status - Current ticket status
```

## Database Workflow

### Document Upload Flow:
1. **User uploads document** → File stored in S3
2. **Database record created** → `documents` table entry with status='pending'
3. **Processing starts** → Status updated to 'processing'
4. **AI processes document** → Results generated
5. **Results saved** → `processing_results` table populated
6. **Status updated** → Status changed to 'completed' or 'failed'

### Data Retrieval Flow:
1. **User requests document** → Query `documents` table
2. **Get processing status** → Check `processing_status` field
3. **Get results** → Query `processing_results` table
4. **Get file URLs** → Generate signed S3 URLs from `output_files` JSONB

## Why Database is Critical

### 1. **State Management**
- Tracks document processing status in real-time
- Allows users to check progress without reprocessing
- Enables retry mechanisms for failed processing

### 2. **Data Persistence**
- Stores all extracted data permanently
- Enables historical analysis and reporting
- Allows users to access past documents and results

### 3. **User Experience**
- Fast retrieval of document history
- Quick access to processing results
- Personalized settings and preferences

### 4. **Scalability**
- Indexes enable fast queries even with millions of documents
- JSONB columns allow flexible data structures
- Foreign keys maintain data integrity

### 5. **Security & Access Control**
- User-based data isolation (user_id foreign keys)
- Row-level security (RLS) support
- Audit trails for compliance

## Database vs Other Storage

| Storage Type | Purpose | Example |
|-------------|---------|---------|
| **Database (Supabase)** | Metadata, status, results, relationships | Document info, processing status, extracted data |
| **S3 (AWS)** | Actual file storage | PDF files, images, generated outputs |
| **Redis** | Caching, job queues | API response cache, processing queue |

## Key Database Features Used

1. **JSONB Columns**: Store flexible JSON data (extracted_data, insights, etc.)
2. **Foreign Keys**: Maintain referential integrity (cascade deletes)
3. **Indexes**: Fast queries on user_id, status, created_at
4. **Triggers**: Auto-update timestamps (updated_at)
5. **UUID Primary Keys**: Globally unique identifiers
6. **CASCADE Deletes**: Automatic cleanup when users/documents deleted

## Summary

The database is the **backbone** of the FinSight application:
- ✅ Stores all application state
- ✅ Tracks document processing lifecycle
- ✅ Persists AI-extracted data
- ✅ Enables user management
- ✅ Powers analytics and reporting
- ✅ Maintains data relationships and integrity

**Without the database**, the application would have no memory of:
- What documents were uploaded
- Processing results and insights
- User preferences
- Historical data
- Support tickets

The database makes FinSight a **persistent, stateful application** rather than a stateless API.

