# User Approval System Documentation

## Overview

The Goji project management application now includes a comprehensive user approval system that allows administrators to control who can register and access the system. This system supports multiple deployment scenarios from completely open registration to fully restricted access.

## Features

### User Roles
- **USER**: Standard user with basic project access
- **ADMIN**: Administrator with user management capabilities
- **SUPERUSER**: Super administrator with full system access, bypasses all approval requirements

### Registration Control
- **Open Registration**: Anyone can register and gain immediate access
- **Approval Required**: New registrations require administrator approval
- **Restricted Registration**: Only pre-approved email addresses can register
- **Closed Registration**: Combination of restricted emails and approval required

### Pre-approved Email Management
- Administrators can maintain a list of pre-approved email addresses
- Pre-approved users can register with automatic approval
- Each pre-approved email can have a default role assigned

## Environment Configuration

Add these variables to your `.env` file:

```env
# User approval settings
REQUIRE_USER_APPROVAL=true         # Require admin approval for new users
ALLOW_OPEN_REGISTRATION=false      # Allow anyone to register
DEFAULT_USER_ROLE=USER             # Default role for new users

# Example configurations:

# Completely open (anyone can register and access immediately)
# REQUIRE_USER_APPROVAL=false
# ALLOW_OPEN_REGISTRATION=true

# Open with approval (anyone can register, but needs approval)
# REQUIRE_USER_APPROVAL=true
# ALLOW_OPEN_REGISTRATION=true

# Restricted access (only pre-approved emails can register)
# REQUIRE_USER_APPROVAL=true
# ALLOW_OPEN_REGISTRATION=false
```

## Configuration Scenarios

### 1. Open Registration (Default for development)
```env
REQUIRE_USER_APPROVAL=false
ALLOW_OPEN_REGISTRATION=true
DEFAULT_USER_ROLE=USER
```
- Anyone can register and gain immediate access
- Best for development and open communities

### 2. Approval Required
```env
REQUIRE_USER_APPROVAL=true
ALLOW_OPEN_REGISTRATION=true
DEFAULT_USER_ROLE=USER
```
- Anyone can register, but accounts require approval
- Good for communities with moderated access

### 3. Restricted Registration (Recommended for production)
```env
REQUIRE_USER_APPROVAL=true
ALLOW_OPEN_REGISTRATION=false
DEFAULT_USER_ROLE=USER
```
- Only pre-approved email addresses can register
- Pre-approved users get automatic approval
- Best for organizations and controlled access

### 4. Maximum Security
```env
REQUIRE_USER_APPROVAL=true
ALLOW_OPEN_REGISTRATION=false
DEFAULT_USER_ROLE=USER
```
With empty approved users list
- No one can register without being pre-approved
- All registrations require manual approval
- Best for highly secure environments

## Database Schema

### User Model Extensions
```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  username    String   @unique
  password    String
  firstName   String?
  lastName    String?
  role        Role     @default(USER)
  isApproved  Boolean  @default(false)
  approvedAt  DateTime?
  approvedById String?
  approvedBy  User?    @relation("UserApproval", fields: [approvedById], references: [id])
  approvals   User[]   @relation("UserApproval")
  // ... other fields
}

model ApprovedUser {
  id          String   @id @default(uuid())
  email       String   @unique
  defaultRole Role     @default(USER)
  createdAt   DateTime @default(now())
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
}

enum Role {
  USER
  ADMIN
  SUPERUSER
}
```

## API Endpoints

### User Management (Admin/Superuser only)

#### Get All Users
```http
GET /api/users?page=1&limit=10&search=john&status=pending
Authorization: Bearer <token>
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10)
- `search`: Search users by email, username, or name
- `status`: Filter by approval status (`pending`, `approved`)

#### Approve User
```http
PUT /api/users/:userId/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "USER"
}
```

#### Reject/Revoke User Approval
```http
PUT /api/users/:userId/reject
Authorization: Bearer <token>
```

#### Update User Role
```http
PUT /api/users/:userId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "ADMIN"
}
```

### Approved Users Management (Admin/Superuser only)

#### Get Approved Users List
```http
GET /api/users/approved?page=1&limit=10&search=example.com
Authorization: Bearer <token>
```

#### Add Approved Email
```http
POST /api/users/approved
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@company.com",
  "defaultRole": "USER"
}
```

#### Remove Approved Email
```http
DELETE /api/users/approved/:approvedUserId
Authorization: Bearer <token>
```

## Superuser Creation

### Using the Script
```bash
cd server
npm run create-superuser
```

The script will prompt for:
- Email address
- Username
- First name (optional)
- Last name (optional)
- Password (hidden input)
- Password confirmation

### Manual Creation
You can also create superusers directly in the database or through Prisma Studio with these requirements:
- `role`: `SUPERUSER`
- `isApproved`: `true`
- `approvedAt`: Current timestamp
- Hashed password

## Registration Flow

### 1. Open Registration Flow
```
User submits registration → Account created → User logged in immediately
```

### 2. Approval Required Flow
```
User submits registration → Account created (not approved) → 
User receives "pending approval" message → 
Admin approves → User can log in
```

### 3. Restricted Registration Flow
```
User submits registration → Check if email is pre-approved → 
If approved: Account created and approved → User logged in → 
If not approved: Registration rejected with error message
```

### 4. Pre-approved User Flow
```
Pre-approved user submits registration → Account created and auto-approved → 
User logged in immediately with default role from approval list
```

## Login Flow

1. User submits login credentials
2. System validates credentials
3. If user is not approved, login is rejected with approval message
4. If user is approved, JWT token is issued with role information
5. User gains access based on their role

## Permission System

### Authentication Middleware
- `authenticateToken`: Validates JWT token
- `requireRole(['ADMIN', 'SUPERUSER'])`: Restricts access to specific roles
- `requireApproval`: Ensures user is approved (superusers bypass)

### Role Hierarchy
- **SUPERUSER**: Can do anything, bypasses all restrictions
- **ADMIN**: Can manage users and approved email list
- **USER**: Standard access to projects and teams they're members of

### Protected Actions
- User approval/rejection: ADMIN or SUPERUSER
- Role changes: ADMIN or SUPERUSER (only SUPERUSER can create other SUPERUSER)
- Approved email management: ADMIN or SUPERUSER
- Last superuser protection: Cannot remove the last SUPERUSER role

## Frontend Integration

### Registration Component Updates
The registration component should handle different response scenarios:

```javascript
// Registration success with immediate access
{
  "message": "User created successfully",
  "token": "jwt_token",
  "user": { ... }
}

// Registration pending approval
{
  "message": "Registration successful. Your account is pending approval by an administrator.",
  "user": { ... },
  "requiresApproval": true
}

// Registration rejected (restricted mode)
{
  "error": "Registration is restricted. Your email address must be pre-approved by an administrator."
}
```

### Login Component Updates
Handle approval-related login errors:

```javascript
// User not approved
{
  "error": "Your account is pending approval by an administrator. Please wait for approval before logging in."
}
```

### Admin Interface Components
Create components for:
- User management dashboard
- User approval/rejection actions
- Approved email list management
- Role assignment interface

## Security Considerations

### Password Security
- Passwords are hashed using bcrypt with salt rounds of 12
- Minimum password length enforcement (6 characters)
- Password confirmation required

### Token Security
- JWT tokens include user role for authorization
- Tokens expire after 24 hours
- Include user ID, email, username, and role in token payload

### Role Protection
- Superuser role cannot be removed from the last superuser
- Only superusers can grant superuser privileges
- Role changes are logged with approver information

### Email Validation
- Email addresses are stored in lowercase
- Duplicate email checking during registration
- Pre-approved email list prevents unauthorized access

## Deployment Guide

### 1. Initial Setup
1. Set environment variables according to your security requirements
2. Run database migrations: `npm run db:migrate`
3. Create initial superuser: `npm run create-superuser`

### 2. Production Deployment
1. Use restricted registration mode: `REQUIRE_USER_APPROVAL=true`, `ALLOW_OPEN_REGISTRATION=false`
2. Pre-populate approved email list for initial users
3. Monitor user registrations and approvals
4. Regularly review user roles and access

### 3. Monitoring
- Track failed login attempts due to approval status
- Monitor registration patterns
- Review user role assignments
- Audit approved email list changes

## Troubleshooting

### Common Issues

#### Users Can't Register
- Check `ALLOW_OPEN_REGISTRATION` setting
- Verify email is in approved list if using restricted mode
- Check for existing users with same email/username

#### Users Can't Login After Registration
- Verify `isApproved` status in database
- Check if approval is required but not granted
- Ensure JWT token includes role information

#### Permission Denied Errors
- Verify user role in JWT token
- Check role-based middleware configuration
- Confirm user has necessary permissions for the action

#### Superuser Creation Issues
- Ensure bcrypt dependency is installed
- Check database connection
- Verify schema has been migrated with role fields

### Database Queries for Debugging

```sql
-- Check user approval status
SELECT id, email, username, role, isApproved, approvedAt FROM User WHERE email = 'user@example.com';

-- List all pending approvals
SELECT id, email, username, createdAt FROM User WHERE isApproved = false;

-- Check approved email list
SELECT email, defaultRole, createdAt FROM ApprovedUser;

-- Count users by role
SELECT role, COUNT(*) as count FROM User GROUP BY role;
```

## Migration Guide

If upgrading from a version without user approval:

1. **Backup your database**
2. **Run the migration** to add approval fields
3. **Set existing users as approved**:
   ```sql
   UPDATE User SET isApproved = true, approvedAt = datetime('now') WHERE isApproved IS NULL;
   ```
4. **Update environment variables** according to your desired security level
5. **Create a superuser** using the provided script
6. **Test the system** with new registrations
7. **Update frontend components** to handle approval flow

This comprehensive system provides flexible user management suitable for various deployment scenarios while maintaining security and administrative control.