# Team Collaboration - System Architecture

## 📋 Problem Statement

**Current Pain Points:**
- Single-user system limits team productivity
- No way to share documents and reports with team members
- Manual coordination required for document reviews
- No audit trail for compliance requirements
- Difficult to track who did what and when
- Approval processes are manual and slow
- Comments and feedback scattered across channels
- No visibility into team activity and workload

**What This Solves:**
- Shared workspaces for team collaboration
- Role-based access control (RBAC) for security
- Automated approval workflows
- In-context commenting and annotations
- Complete audit trail for compliance
- Activity tracking and notifications
- Team workload visibility
- Document version control

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
│              Collaboration Service                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Workspace   │  │  Permission  │  │  Workflow    │          │
│  │  Manager     │  │  Engine      │  │  Engine      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Comment     │  │  Activity    │  │  Notification│          │
│  │  Service     │  │  Tracker     │  │  Service     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  Audit       │  │  Real-Time   │                            │
│  │  Logger      │  │  Service     │                            │
│  │              │  │  (WebSocket) │                            │
│  └──────────────┘  └──────────────┘                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Job Queue  │ │   Database   │ │   Cache      │
│    (Redis)   │ │ (PostgreSQL) │ │   (Redis)    │
│              │ │              │ │              │
│  - Bull MQ   │ │  - Workspaces│ │  - Perms     │
│  - Workers   │ │  - Members   │ │  - Sessions  │
│  - Events    │ │  - Comments  │ │  - Presence  │
└──────────────┘ └──────────────┘ └──────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Real-Time Infrastructure                       │
│  - WebSocket Server (Socket.io)                                 │
│  - Event Streaming (Kafka/RabbitMQ)                             │
│  - Push Notification Service (FCM/APNS)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Workspace Manager**
- **Responsibility:** Manage workspaces, members, and hierarchies
- **Features:**
  - Workspace creation and management
  - Member invitation and management
  - Workspace settings and configuration
  - Hierarchical workspace support (parent/child)
  - Workspace templates

#### 2. **Permission Engine (RBAC)**
- **Responsibility:** Handle role-based access control
- **Features:**
  - Role definitions and permissions
  - Permission inheritance
  - Resource-level permissions
  - Dynamic permission evaluation
  - Permission caching

#### 3. **Workflow Engine**
- **Responsibility:** Manage approval workflows
- **Features:**
  - Workflow definition (BPMN-like)
  - Workflow execution
  - State management
  - Conditional routing
  - Parallel approvals
  - Escalation rules

#### 4. **Comment Service**
- **Responsibility:** Handle comments and annotations
- **Features:**
  - Document-level comments
  - Threaded conversations
  - @mentions
  - Rich text support
  - File attachments
  - Resolution tracking

#### 5. **Activity Tracker**
- **Responsibility:** Track all user activities
- **Features:**
  - Activity logging
  - Activity aggregation
  - Activity feed generation
  - Filtering and search
  - Export capabilities

#### 6. **Notification Service**
- **Responsibility:** Deliver notifications
- **Features:**
  - In-app notifications
  - Email notifications
  - Push notifications
  - SMS notifications (optional)
  - Notification preferences
  - Delivery tracking

#### 7. **Audit Logger**
- **Responsibility:** Maintain compliance audit trail
- **Features:**
  - Immutable audit logs
  - Comprehensive event logging
  - Search and query capabilities
  - Retention policies
  - Export for compliance

#### 8. **Real-Time Service**
- **Responsibility:** WebSocket-based real-time updates
- **Features:**
  - Presence tracking
  - Live typing indicators
  - Real-time notifications
  - Collaborative editing hints
  - Online/offline status

---

## 🔌 APIs/Services Required

### Internal APIs

#### 1. Workspace Management API
```typescript
POST   /api/v1/workspaces
GET    /api/v1/workspaces
GET    /api/v1/workspaces/:workspaceId
PUT    /api/v1/workspaces/:workspaceId
DELETE /api/v1/workspaces/:workspaceId
POST   /api/v1/workspaces/:workspaceId/duplicate
GET    /api/v1/workspaces/:workspaceId/stats
```

#### 2. Member Management API
```typescript
POST   /api/v1/workspaces/:workspaceId/members
GET    /api/v1/workspaces/:workspaceId/members
GET    /api/v1/workspaces/:workspaceId/members/:memberId
PUT    /api/v1/workspaces/:workspaceId/members/:memberId
DELETE /api/v1/workspaces/:workspaceId/members/:memberId
POST   /api/v1/workspaces/:workspaceId/members/invite
POST   /api/v1/workspaces/:workspaceId/members/:memberId/roles
```

#### 3. Permission API
```typescript
GET    /api/v1/workspaces/:workspaceId/permissions
GET    /api/v1/workspaces/:workspaceId/permissions/check
POST   /api/v1/workspaces/:workspaceId/permissions/grant
POST   /api/v1/workspaces/:workspaceId/permissions/revoke
GET    /api/v1/permissions/roles
```

#### 4. Workflow API
```typescript
POST   /api/v1/workspaces/:workspaceId/workflows
GET    /api/v1/workspaces/:workspaceId/workflows
GET    /api/v1/workflows/:workflowId
PUT    /api/v1/workflows/:workflowId
POST   /api/v1/workflows/:workflowId/start
POST   /api/v1/workflows/:workflowId/approve
POST   /api/v1/workflows/:workflowId/reject
GET    /api/v1/workflows/:workflowId/status
```

#### 5. Comment API
```typescript
POST   /api/v1/documents/:documentId/comments
GET    /api/v1/documents/:documentId/comments
GET    /api/v1/comments/:commentId
PUT    /api/v1/comments/:commentId
DELETE /api/v1/comments/:commentId
POST   /api/v1/comments/:commentId/reply
POST   /api/v1/comments/:commentId/resolve
GET    /api/v1/comments/:commentId/reactions
POST   /api/v1/comments/:commentId/reactions
```

#### 6. Activity API
```typescript
GET    /api/v1/workspaces/:workspaceId/activities
GET    /api/v1/users/:userId/activities
GET    /api/v1/documents/:documentId/activities
GET    /api/v1/activities/:activityId
```

#### 7. Notification API
```typescript
GET    /api/v1/notifications
GET    /api/v1/notifications/unread-count
PUT    /api/v1/notifications/:notificationId/read
PUT    /api/v1/notifications/read-all
GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
```

#### 8. Audit API
```typescript
GET    /api/v1/audit-logs
GET    /api/v1/audit-logs/:logId
POST   /api/v1/audit-logs/export
GET    /api/v1/audit-logs/search
```

---

## 🔄 Data Flow

### Flow 1: Workspace Creation & Member Invitation

```
User → API Gateway → Workspace Manager
                       │
                       ├─> Create Workspace → Database
                       │
                       ├─> Assign Creator Role (Owner)
                       │
                       ├─> Generate Invitation Link
                       │
                       ├─> Send Invitation Email
                       │     └─> Notification Service
                       │
                       └─> Log Activity → Activity Tracker
```

### Flow 2: Permission Check Flow

```
API Request → Permission Engine
                  │
                  ├─> Extract User, Resource, Action
                  │
                  ├─> Check Cache → Redis
                  │     └─> If Found: Return Permission
                  │
                  ├─> If Not Cached:
                  │     ├─> Get User Roles (Workspace + Resource)
                  │     │
                  │     ├─> Get Permissions for Roles
                  │     │
                  │     ├─> Check Resource-Specific Overrides
                  │     │
                  │     ├─> Evaluate Permission
                  │     │
                  │     ├─> Cache Result → Redis (TTL: 5 min)
                  │     │
                  │     └─> Return Permission
                  │
                  └─> Log Permission Check → Audit Logger
```

### Flow 3: Approval Workflow

```
User Action → Workflow Engine
                  │
                  ├─> Load Workflow Definition
                  │
                  ├─> Determine Current Step
                  │
                  ├─> Get Required Approvers
                  │     └─> Based on: Role, User, Group
                  │
                  ├─> If Parallel Approval:
                  │     ├─> Notify All Approvers
                  │     │     └─> Notification Service
                  │     │
                  │     └─> Wait for All Approvals
                  │
                  ├─> If Sequential Approval:
                  │     ├─> Notify First Approver
                  │     │
                  │     └─> On Approval → Next Approver
                  │
                  ├─> On Approval:
                  │     ├─> Update Workflow State
                  │     │
                  │     ├─> If All Steps Complete:
                  │     │     ├─> Mark Workflow Complete
                  │     │     │
                  │     │     └─> Trigger Next Action
                  │     │
                  │     └─> Notify Initiator & Team
                  │
                  ├─> On Rejection:
                  │     ├─> Update Workflow State
                  │     │
                  │     ├─> Notify Initiator
                  │     │
                  │     └─> Rollback (if configured)
                  │
                  └─> Log Workflow Event → Audit Logger
```

### Flow 4: Real-Time Commenting

```
User Creates Comment → Comment Service
                            │
                            ├─> Validate Permission
                            │
                            ├─> Store Comment → Database
                            │
                            ├─> Extract @mentions
                            │
                            ├─> Notify Mentioned Users
                            │     └─> Notification Service
                            │
                            ├─> Broadcast via WebSocket
                            │     └─> Real-Time Service
                            │           └─> Push to Connected Clients
                            │
                            └─> Log Activity → Activity Tracker
```

### Flow 5: Activity Feed Generation

```
User Requests Feed → Activity Tracker
                         │
                         ├─> Get User Workspaces
                         │
                         ├─> Query Activities:
                         │     ├─> Workspace Activities
                         │     ├─> Document Activities (in user's workspaces)
                         │     ├─> User Activities (followed users)
                         │     └─> Comment Activities
                         │
                         ├─> Filter by:
                         │     ├─> Date Range
                         │     ├─> Activity Types
                         │     ├─> Workspaces
                         │     └─> Users
                         │
                         ├─> Aggregate Similar Activities
                         │     └─> "User X uploaded 5 documents"
                         │
                         ├─> Sort by Timestamp
                         │
                         ├─> Paginate Results
                         │
                         └─> Return Feed
```

### Flow 6: Audit Log Query

```
Admin Query → Audit Logger
                  │
                  ├─> Parse Query Parameters:
                  │     ├─> Date Range
                  │     ├─> User IDs
                  │     ├─> Action Types
                  │     ├─> Resource Types
                  │     └─> Workspace IDs
                  │
                  ├─> Query Audit Logs (Read-Only)
                  │     └─> Optimized Indexes
                  │
                  ├─> Apply Filters
                  │
                  ├─> Format Results
                  │
                  └─> Return Audit Trail
```

---

## 🔒 Security & Compliance Considerations

### Security Measures

#### 1. **Role-Based Access Control (RBAC)**
```typescript
// Role definitions
enum Role {
  OWNER = 'owner',           // Full control
  ADMIN = 'admin',           // Manage members, settings
  EDITOR = 'editor',         // Create, edit, delete documents
  VIEWER = 'viewer',         // Read-only access
  APPROVER = 'approver',     // Can approve workflows
  AUDITOR = 'auditor',       // Read-only + audit logs
}

// Permission matrix
const Permissions = {
  [Role.OWNER]: ['*'], // All permissions
  [Role.ADMIN]: [
    'workspace:update',
    'workspace:delete',
    'member:invite',
    'member:remove',
    'member:update-role',
    'document:create',
    'document:edit',
    'document:delete',
    'workflow:create',
    'workflow:manage',
  ],
  [Role.EDITOR]: [
    'document:create',
    'document:edit',
    'document:delete',
    'comment:create',
    'comment:edit',
    'comment:delete',
  ],
  [Role.VIEWER]: [
    'document:view',
    'comment:view',
    'comment:create',
  ],
  [Role.APPROVER]: [
    'workflow:approve',
    'workflow:reject',
    'document:view',
  ],
  [Role.AUDITOR]: [
    'document:view',
    'audit:read',
    'activity:read',
  ],
};
```

#### 2. **Resource-Level Permissions**
- Document-level permissions (override workspace default)
- Folder-level permissions (inheritance)
- Granular permission matrix (read, write, delete, share)

#### 3. **Data Isolation**
- Tenant isolation at database level
- Workspace-level data segregation
- User can only access allowed workspaces

#### 4. **Audit Trail**
- Immutable audit logs
- All actions logged (create, read, update, delete)
- Who, what, when, where, why
- Tamper-proof storage

#### 5. **Encryption**
- Data at rest: AES-256
- Data in transit: TLS 1.3
- Encrypted comments and annotations
- Secure file sharing links

### Compliance Requirements

#### 1. **SOC 2 Type II**
- Access controls
- Activity monitoring
- Data protection
- Audit trail

#### 2. **GDPR**
- Right to access data
- Right to deletion
- Data portability
- Consent management

#### 3. **HIPAA** (if handling healthcare data)
- PHI protection
- Access controls
- Audit logs
- Business Associate Agreements

#### 4. **Financial Regulations**
- Complete audit trail
- Non-repudiation
- Data retention policies
- Compliance reporting

---

## 🚀 MVP vs Production Approach

### MVP (Minimum Viable Product)

#### Phase 1: Basic Workspaces & Permissions (2-3 months)
**Scope:**
- Simple workspace creation
- 4 basic roles: Owner, Admin, Editor, Viewer
- Member invitation via email
- Basic permission checks
- Simple activity feed

**Tech Stack:**
- Node.js service
- PostgreSQL for data
- Redis for permission caching
- Basic email notifications

**Limitations:**
- No workflows
- Basic comments only
- Limited activity tracking
- No real-time updates

**User Flow:**
1. User creates workspace
2. User invites team members
3. Members get access to documents
4. Basic activity feed shows updates

#### Phase 2: Enhanced MVP (2-3 months)
**Add:**
- Basic approval workflows (simple linear)
- Threaded comments
- @mentions in comments
- Enhanced activity tracking
- Basic audit logs

### Production (Scalable System)

#### Architecture Enhancements

**1. Advanced Workflow Engine**
```typescript
// BPMN-like workflow definition
interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
  startCondition: Condition;
}

interface WorkflowStep {
  id: string;
  type: 'approval' | 'notification' | 'action';
  name: string;
  approvers: ApproverConfig;
  conditions?: Condition;
  timeout?: number;
  escalation?: EscalationConfig;
  parallel?: boolean;
}

interface ApproverConfig {
  type: 'role' | 'user' | 'group' | 'dynamic';
  value: string | string[];
  requireAll?: boolean; // For parallel approval
}

// Workflow execution engine
class WorkflowEngine {
  async executeWorkflow(workflowId: string, context: WorkflowContext): Promise<void> {
    const definition = await this.getDefinition(workflowId);
    const execution = await this.createExecution(definition, context);
    
    for (const step of definition.steps) {
      if (await this.evaluateCondition(step.conditions, execution)) {
        await this.executeStep(step, execution);
        
        if (execution.status === 'rejected') {
          break;
        }
      }
    }
    
    if (execution.status === 'pending') {
      execution.status = 'completed';
      await this.completeWorkflow(execution);
    }
  }
}
```

**2. Real-Time Infrastructure**
```typescript
// WebSocket service for real-time updates
import { Server as SocketIOServer } from 'socket.io';

class RealTimeService {
  private io: SocketIOServer;
  
  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: { origin: process.env.FRONTEND_URL },
    });
    
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      // Authenticate socket
      socket.on('authenticate', async (token) => {
        const user = await this.verifyToken(token);
        socket.data.userId = user.id;
        socket.join(`user:${user.id}`);
      });
      
      // Join workspace room
      socket.on('join-workspace', (workspaceId) => {
        socket.join(`workspace:${workspaceId}`);
      });
      
      // Handle typing indicators
      socket.on('typing', (data) => {
        socket.to(`workspace:${data.workspaceId}`).emit('user-typing', {
          userId: socket.data.userId,
          ...data,
        });
      });
      
      // Handle presence
      socket.on('presence', (data) => {
        this.updatePresence(socket.data.userId, data);
        socket.to(`workspace:${data.workspaceId}`).emit('presence-update', {
          userId: socket.data.userId,
          status: data.status,
        });
      });
    });
  }
  
  broadcastToWorkspace(workspaceId: string, event: string, data: any): void {
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
  }
}
```

**3. Advanced Activity Tracking**
```typescript
// Activity aggregation for performance
class ActivityTracker {
  async trackActivity(activity: Activity): Promise<void> {
    // Store individual activity
    await this.db.query(`
      INSERT INTO activities (...) VALUES (...)
    `);
    
    // Aggregate similar activities (background job)
    await this.activityQueue.add('aggregate', {
      userId: activity.userId,
      type: activity.type,
      workspaceId: activity.workspaceId,
    });
  }
  
  async aggregateActivities(job: Job): Promise<void> {
    // Find similar activities in time window
    const similar = await this.db.query(`
      SELECT * FROM activities
      WHERE user_id = $1
        AND type = $2
        AND workspace_id = $3
        AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at
    `);
    
    if (similar.length > 3) {
      // Create aggregated activity
      await this.db.query(`
        INSERT INTO activity_aggregates (...)
        VALUES (...)
      `);
      
      // Delete individual activities (keep aggregate)
      await this.db.query(`
        DELETE FROM activities
        WHERE id = ANY($1)
      `, [similar.map(s => s.id)]);
    }
  }
}
```

**4. Advanced Features**
- Custom roles and permissions
- Workflow templates
- Approval delegation
- Comment reactions and emojis
- Document annotations (highlight, draw)
- Collaborative editing (OT/CRDT)
- Activity analytics
- Workspace templates
- Guest access with time limits

---

## 🐛 Technical Challenges & Solutions

### Challenge 1: Permission Performance at Scale

**Problem:**
- Permission checks on every request
- Complex permission inheritance
- Thousands of users, millions of documents

**Solution:**
```typescript
// Multi-level caching strategy
class PermissionEngine {
  private redis: Redis;
  private localCache: LRUCache;
  
  async checkPermission(
    userId: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    // L1: Local cache (in-process)
    const localKey = `${userId}:${resourceId}:${action}`;
    const localResult = this.localCache.get(localKey);
    if (localResult !== undefined) {
      return localResult;
    }
    
    // L2: Redis cache
    const redisKey = `perm:${userId}:${resourceId}:${action}`;
    const cached = await this.redis.get(redisKey);
    if (cached !== null) {
      const result = cached === 'true';
      this.localCache.set(localKey, result, { ttl: 60000 }); // 1 min
      return result;
    }
    
    // L3: Database query
    const permission = await this.evaluatePermission(userId, resourceId, action);
    
    // Cache results
    await this.redis.setex(redisKey, 300, permission.toString()); // 5 min
    this.localCache.set(localKey, permission, { ttl: 60000 });
    
    return permission;
  }
}
```

### Challenge 2: Workflow State Management

**Problem:**
- Concurrent approvals
- State consistency
- Workflow versioning

**Solution:**
```typescript
// Event sourcing for workflow state
class WorkflowStateManager {
  async applyEvent(workflowId: string, event: WorkflowEvent): Promise<void> {
    // Store event (immutable)
    await this.db.query(`
      INSERT INTO workflow_events (workflow_id, event_type, data, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [workflowId, event.type, JSON.stringify(event.data)]);
    
    // Rebuild state from events
    const events = await this.getEvents(workflowId);
    const state = this.rebuildState(events);
    
    // Update current state snapshot
    await this.db.query(`
      UPDATE workflows
      SET current_state = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(state), workflowId]);
  }
  
  private rebuildState(events: WorkflowEvent[]): WorkflowState {
    let state: WorkflowState = { status: 'pending', currentStep: 0 };
    
    for (const event of events) {
      switch (event.type) {
        case 'STEP_STARTED':
          state.currentStep = event.data.stepId;
          break;
        case 'STEP_APPROVED':
          state.approvedSteps.push(event.data.stepId);
          break;
        case 'STEP_REJECTED':
          state.status = 'rejected';
          state.rejectedAt = event.data.timestamp;
          break;
        case 'WORKFLOW_COMPLETED':
          state.status = 'completed';
          break;
      }
    }
    
    return state;
  }
}
```

### Challenge 3: Real-Time Scalability

**Problem:**
- WebSocket connections per server
- Broadcasting to thousands of users
- Presence tracking overhead

**Solution:**
```typescript
// Redis-based pub/sub for horizontal scaling
import { createClient } from 'redis';

class ScalableRealTimeService {
  private pub: Redis;
  private sub: Redis;
  
  constructor() {
    this.pub = createClient({ url: process.env.REDIS_URL });
    this.sub = createClient({ url: process.env.REDIS_URL });
    
    this.sub.subscribe('workspace-events');
    this.sub.on('message', (channel, message) => {
      const event = JSON.parse(message);
      this.broadcastToLocalClients(event.workspaceId, event);
    });
  }
  
  broadcastToWorkspace(workspaceId: string, event: string, data: any): void {
    // Publish to Redis (all server instances receive)
    this.pub.publish('workspace-events', JSON.stringify({
      workspaceId,
      event,
      data,
    }));
  }
  
  private broadcastToLocalClients(workspaceId: string, event: any): void {
    // Broadcast only to clients connected to this server instance
    this.io.to(`workspace:${workspaceId}`).emit(event.event, event.data);
  }
}

// Presence tracking with Redis
class PresenceService {
  async updatePresence(userId: string, workspaceId: string, status: string): Promise<void> {
    const key = `presence:${workspaceId}:${userId}`;
    await this.redis.setex(key, 60, status); // 60 second TTL
    
    // Publish presence update
    await this.redis.publish('presence-updates', JSON.stringify({
      workspaceId,
      userId,
      status,
    }));
  }
  
  async getOnlineUsers(workspaceId: string): Promise<string[]> {
    const keys = await this.redis.keys(`presence:${workspaceId}:*`);
    return keys.map(key => key.split(':')[2]);
  }
}
```

### Challenge 4: Activity Feed Performance

**Problem:**
- Generating feed for thousands of activities
- Real-time updates
- Personalization

**Solution:**
```sql
-- Materialized view for activity feeds
CREATE MATERIALIZED VIEW activity_feeds AS
SELECT 
  a.id,
  a.user_id,
  a.workspace_id,
  a.type,
  a.data,
  a.created_at,
  u.name as user_name,
  u.avatar_url as user_avatar,
  ws.name as workspace_name
FROM activities a
JOIN users u ON a.user_id = u.id
JOIN workspaces ws ON a.workspace_id = ws.id
WHERE a.created_at > NOW() - INTERVAL '30 days'
ORDER BY a.created_at DESC;

-- Refresh every 5 minutes
CREATE UNIQUE INDEX ON activity_feeds (id);

-- Query optimized feed
CREATE INDEX idx_activity_feeds_user_workspace 
ON activity_feeds(user_id, workspace_id, created_at DESC);

-- Refresh strategy
REFRESH MATERIALIZED VIEW CONCURRENTLY activity_feeds;
```

### Challenge 5: Audit Log Storage

**Problem:**
- Massive volume of audit logs
- Long retention requirements
- Query performance

**Solution:**
```typescript
// Time-series database for audit logs (TimescaleDB)
// Partition by month
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workspace_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_workspace_time ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_time ON audit_logs(action, created_at DESC);

// Archive old logs to S3/Glacier
class AuditLogArchiver {
  async archiveOldLogs(olderThan: Date): Promise<void> {
    const logs = await this.db.query(`
      SELECT * FROM audit_logs
      WHERE created_at < $1
      ORDER BY created_at
    `, [olderThan]);
    
    // Compress and upload to S3
    const compressed = await this.compress(logs);
    await this.s3.upload({
      Bucket: 'audit-logs-archive',
      Key: `archive/${olderThan.toISOString()}.gz`,
      Body: compressed,
    });
    
    // Delete from database
    await this.db.query(`
      DELETE FROM audit_logs
      WHERE created_at < $1
    `, [olderThan]);
  }
}
```

---

## 📊 Database Schema

```sql
-- Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    parent_workspace_id UUID REFERENCES workspaces(id),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workspace members
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL, -- 'owner', 'admin', 'editor', 'viewer', etc.
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(workspace_id, user_id)
);

-- Roles and permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    permissions JSONB NOT NULL, -- Array of permission strings
    is_system BOOLEAN DEFAULT FALSE, -- System roles vs custom
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Resource permissions (document-level overrides)
CREATE TABLE resource_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL, -- 'document', 'folder'
    resource_id UUID NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    permissions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow definitions
CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL, -- BPMN-like structure
    trigger_conditions JSONB, -- When to start workflow
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow executions
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    initiated_by UUID NOT NULL REFERENCES users(id),
    current_step INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    current_state JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Workflow events (event sourcing)
CREATE TABLE workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id),
    event_type VARCHAR(100) NOT NULL,
    data JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    user_id UUID NOT NULL REFERENCES users(id),
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions UUID[], -- Array of mentioned user IDs
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Activities
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    activity_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'commented'
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Activity aggregates (for performance)
CREATE TABLE activity_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    activity_type VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL,
    first_activity_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP NOT NULL,
    sample_ids UUID[], -- Sample of activity IDs
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    metadata JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    channel VARCHAR(50) NOT NULL, -- 'email', 'push', 'in_app', 'sms'
    notification_type VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, channel, notification_type)
);

-- Audit logs (immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Indexes
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id, is_active);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id, is_active);
CREATE INDEX idx_resource_permissions_resource ON resource_permissions(resource_type, resource_id);
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_comments_workspace ON comments(workspace_id, created_at DESC);
CREATE INDEX idx_activities_user_workspace ON activities(user_id, workspace_id, created_at DESC);
CREATE INDEX idx_activities_workspace ON activities(workspace_id, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_workspace_time ON audit_logs(workspace_id, created_at DESC);
```

---

## 🎯 Success Metrics

### Technical Metrics
- **Permission Check Latency:** < 10ms (p95)
- **Real-Time Update Latency:** < 100ms
- **Activity Feed Generation:** < 200ms (p95)
- **Workflow Execution Time:** < 1 second per step
- **System Uptime:** > 99.9%

### Business Metrics
- **Workspace Creation Rate:** Track adoption
- **Active Collaborators:** Daily/Monthly Active Users
- **Average Team Size:** Workspace member count
- **Workflow Completion Rate:** > 90%
- **Notification Engagement:** Open/click rates
- **User Satisfaction:** CSAT > 4.5/5

---

## 📝 Implementation Checklist

### Phase 1: MVP
- [ ] Workspace CRUD APIs
- [ ] Member management
- [ ] Basic RBAC (4 roles)
- [ ] Permission engine
- [ ] Basic activity tracking
- [ ] Simple comments
- [ ] Email notifications
- [ ] Basic audit logging

### Phase 2: Production
- [ ] Workflow engine
- [ ] Advanced permissions (custom roles)
- [ ] Real-time updates (WebSocket)
- [ ] Threaded comments with @mentions
- [ ] Activity feed optimization
- [ ] Advanced audit logging
- [ ] Push notifications
- [ ] Presence tracking
- [ ] Document annotations
- [ ] Comprehensive testing
- [ ] Documentation

---

This architecture provides a scalable, secure foundation for team collaboration that can support thousands of users while maintaining performance and compliance requirements.

