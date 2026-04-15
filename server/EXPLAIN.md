# Goji Server - Complete Architecture Guide

## Overview

Goji is a ticket project management application built with Node.js, Express.js, and Prisma ORM. The server follows a modular architecture pattern with clear separation of concerns between routes, controllers, middleware, and utilities.

## Architecture Overview

```
server/
├── index.js                 # Main application entry point
├── package.json             # Dependencies and scripts
├── .env / .env.example      # Environment configuration
├── controllers/             # Business logic layer
├── routes/                  # API route definitions
├── middleware/              # Request processing middleware
├── utils/                   # Utility functions and database connection
└── prisma/                  # Database schema and migrations
```

## File Structure Deep Dive

### `index.js` - Application Entry Point

The main server file that:
- Sets up Express application with CORS and JSON parsing
- Configures route handlers for different API endpoints
- Implements invitation system endpoints (teams and projects)
- Handles error middleware and graceful shutdown
- Starts the server on configured port

**Key Features:**
- CORS configuration for client communication
- Route mounting for modular API structure
- Direct invitation handling for teams and projects
- Database connection management
- Error handling middleware

### `controllers/` - Business Logic Layer

Each controller handles the core business logic for its domain:

#### `authController.js`
**Purpose:** User authentication and account management
**Key Methods:**
- `register()` - User registration with password hashing (bcrypt)
- `login()` - User authentication with JWT token generation
- `getProfile()` - Retrieve user profile information

**Security Features:**
- Password hashing with bcrypt (12 rounds)
- JWT token generation and validation
- Input validation and sanitization

#### `teamsController.js`
**Purpose:** Team management and member operations
**Key Methods:**
- `createTeam()` - Create new team (creator becomes OWNER)
- `getUserTeams()` - Get teams where user is a member
- `getTeam()` - Get team details with membership validation
- `getTeamMembers()` - Retrieve team member list
- `inviteToTeam()` - Send team invitations (username or email)
- `removeTeamMember()` - Remove team members with permission checks
- `cancelTeamInvitation()` - Cancel pending team invitations

**Permission Hierarchy:**
- `OWNER` > `ADMIN` > `MEMBER`
- Only OWNER/ADMIN can invite and remove members
- Cannot remove last owner
- Cascade removal from projects when removed from team

#### `projectsController.js`
**Purpose:** Project management and member operations
**Key Methods:**
- `createProject()` - Create project with auto-generated key
- `getTeamProjects()` - Get projects for a team
- `getProject()` - Get project details
- `updateProject()` - Update project information
- `getProjectStats()` - Get project statistics (stories, tickets, sprints)
- `getProjectMembers()` - Get project member list
- `addProjectMember()` - Add team members to project
- `removeProjectMember()` - Remove project members with permission checks

**Permission System:**
- Team OWNER/ADMIN can manage any project member
- Project ADMIN can manage DEVELOPER/VIEWER roles
- Auto-membership: Project creator becomes ADMIN
- Project key validation and uniqueness enforcement

#### `storiesController.js`
**Purpose:** User story management
**Key Methods:**
- `createStory()` - Create new user story
- `getProjectStories()` - Get stories for a project
- `getStory()` - Get story details
- `updateStory()` - Update story information
- `deleteStory()` - Remove story (with cascade ticket removal)

**Features:**
- Sprint assignment capabilities
- Assignee and reporter tracking
- Status and priority management
- Story points estimation

#### `ticketsController.js`
**Purpose:** Ticket/task management
**Key Methods:**
- `createTicket()` - Create new ticket
- `getProjectTickets()` - Get tickets for a project
- `getTicket()` - Get ticket details
- `updateTicket()` - Update ticket information
- `deleteTicket()` - Remove ticket

**Features:**
- Story association (tickets can belong to stories)
- Sprint assignment
- Type classification (TASK, BUG, FEATURE, IMPROVEMENT)
- Priority and status tracking

#### `sprintsController.js`
**Purpose:** Sprint/iteration management
**Key Methods:**
- `createSprint()` - Create new sprint
- `getProjectSprints()` - Get sprints for a project
- `getSprint()` - Get sprint details
- `updateSprint()` - Update sprint information
- `deleteSprint()` - Remove sprint

**Features:**
- Date range management (start/end dates)
- Sprint goals and status tracking
- Work item association (stories and tickets)

### `routes/` - API Route Definitions

Each route file defines the HTTP endpoints and maps them to controller methods:

#### `authRoutes.js`
```
POST /auth/register    # User registration
POST /auth/login       # User authentication
GET  /auth/profile     # Get user profile
```

#### `teamsRoutes.js`
```
POST   /teams                              # Create team
GET    /teams                              # Get user teams
GET    /teams/:teamId                      # Get team details
GET    /teams/:teamId/members              # Get team members
POST   /teams/:teamId/invite               # Invite to team
DELETE /teams/:teamId/members/:userId      # Remove team member
DELETE /teams/:teamId/invitations/:inviteId # Cancel team invitation
POST   /teams/:teamId/projects             # Create project
GET    /teams/:teamId/projects             # Get team projects
```

#### `projectsRoutes.js`
```
GET    /projects/:projectId                      # Get project
PUT    /projects/:projectId                      # Update project
GET    /projects/:projectId/stats                # Get statistics
GET    /projects/:projectId/members              # Get members
POST   /projects/:projectId/members              # Add member
DELETE /projects/:projectId/members/:userId      # Remove member
POST   /projects/:projectId/stories              # Create story
GET    /projects/:projectId/stories              # Get stories
POST   /projects/:projectId/tickets              # Create ticket
GET    /projects/:projectId/tickets              # Get tickets
POST   /projects/:projectId/sprints              # Create sprint
GET    /projects/:projectId/sprints              # Get sprints
```

#### `storiesRoutes.js`
```
GET    /stories/:storyId        # Get story
PUT    /stories/:storyId        # Update story
DELETE /stories/:storyId        # Delete story
```

#### `ticketsRoutes.js`
```
GET    /tickets/:ticketId       # Get ticket
PUT    /tickets/:ticketId       # Update ticket
DELETE /tickets/:ticketId       # Delete ticket
```

#### `sprintsRoutes.js`
```
GET    /sprints/:sprintId       # Get sprint
PUT    /sprints/:sprintId       # Update sprint
DELETE /sprints/:sprintId       # Delete sprint
```

### `middleware/` - Request Processing

#### `auth.js`
**Purpose:** JWT authentication middleware
**Functions:**
- `authenticateToken()` - Validates JWT tokens and extracts user information
- Adds `req.user` object with `userId` for authenticated requests
- Returns 401 for invalid/missing tokens
- Used by all protected routes

### `utils/` - Utility Functions

#### `database.js`
**Purpose:** Centralized database connection management
**Functions:**
- Exports configured Prisma client instance
- Handles database connection lifecycle
- Provides graceful shutdown functionality

### `prisma/` - Database Layer

#### Schema Files
- `schema.prisma` - Main SQLite schema (default)
- `schema.postgresql.prisma` - PostgreSQL variant
- `schema.sqlite.prisma` - SQLite variant

#### Database Models

**User Model:**
- Authentication credentials (email, username, password)
- Profile information (firstName, lastName, avatarUrl)
- Relationships to teams, projects, and work items

**Team Model:**
- Team information (name, description)
- Owner relationship
- Member and invitation management

**TeamMember Model:**
- Links users to teams with roles (OWNER, ADMIN, MEMBER)
- Tracks join dates and permissions

**Project Model:**
- Project details (name, description, unique key)
- Team association
- Member and work item relationships

**ProjectMember Model:**
- Links users to projects with roles (ADMIN, DEVELOPER, VIEWER)
- Project-level permissions

**Work Item Models:**
- `Story` - User stories with points and sprint assignment
- `Ticket` - Tasks with type classification and story association
- `Sprint` - Time-boxed iterations with goals and date ranges

**Invitation Models:**
- `TeamInvite` - Pending team invitations
- `ProjectInvite` - Pending project invitations

## 🔐 Security Features

### Authentication & Authorization
- **JWT Tokens:** Stateless authentication with user context
- **Password Hashing:** bcrypt with 12 rounds for secure storage
- **Role-Based Access Control:** Hierarchical permissions for teams and projects
- **Permission Validation:** Server-side checks for all operations

### Data Protection
- **Input Validation:** Required field validation and type checking
- **SQL Injection Prevention:** Prisma ORM with parameterized queries
- **CORS Configuration:** Controlled cross-origin resource sharing
- **Error Handling:** Sanitized error messages without sensitive data

### Permission Hierarchies

**Team Permissions:**
```
OWNER (Level 3)
├── Can remove ADMIN and MEMBER
├── Can cancel invitations
├── Full team management
└── Cannot be removed (must maintain at least one)

ADMIN (Level 2)
├── Can remove MEMBER
├── Can cancel invitations
├── Can invite new members
└── Can be removed by OWNER

MEMBER (Level 1)
├── Basic team access
├── Can remove themselves
└── Can be removed by ADMIN/OWNER
```

**Project Permissions:**
```
Team OWNER/ADMIN
├── Full project control
├── Can manage any project member
└── Overrides project permissions

Project ADMIN
├── Can manage DEVELOPER/VIEWER
├── Can cancel project invitations
└── Cannot remove other ADMINs (unless team admin)

Project DEVELOPER
├── Standard project access
├── Can remove themselves
└── Can be managed by higher roles

Project VIEWER
├── Read-only access
└── Can be managed by ADMIN+ roles
```

## 🚀 API Features

### Invitation System
- **Flexible Invitations:** Accept username or email for team invites
- **Status Tracking:** PENDING, ACCEPTED, DECLINED invitation states
- **Cancellation:** Admins can cancel pending invitations
- **Auto-cleanup:** Duplicate and invalid invitation prevention

### Project Management
- **Auto-generated Keys:** Unique project identifiers from names
- **Member Management:** Add team members to projects with roles
- **Statistics:** Real-time counts of stories, tickets, and sprints
- **Cascade Operations:** Team removal triggers project cleanup

### Work Item Tracking
- **Hierarchical Structure:** Projects > Stories > Tickets
- **Sprint Management:** Time-boxed iterations with work assignment
- **Status Tracking:** Customizable status workflows
- **Assignment System:** Reporter, assignee, and creator tracking

## 🔧 Configuration

### Environment Variables
```bash
DATABASE_URL=file:./dev.db               # SQLite database location
JWT_SECRET=your_jwt_secret_here          # JWT signing secret
PORT=3001                                # Server port
NODE_ENV=development                     # Environment mode
```

### Package Scripts
```json
{
  "dev": "nodemon index.js",                    # Development server
  "start": "node index.js",                     # Production server
  "db:generate": "prisma generate",             # Generate Prisma client
  "db:push": "prisma db push",                  # Push schema changes
  "db:reset": "prisma migrate reset --force",  # Reset database
  "db:use-sqlite": "cp prisma/schema.sqlite.prisma prisma/schema.prisma && npm run db:generate"
}
```

## 🌟 Key Design Patterns

### Modular Architecture
- **Separation of Concerns:** Routes, controllers, middleware, and utilities
- **Single Responsibility:** Each module handles one domain
- **Dependency Injection:** Database and services passed as needed

### Error Handling
- **Consistent Responses:** Standardized error format across all endpoints
- **Graceful Degradation:** Proper fallbacks for missing data
- **Logging:** Comprehensive error logging for debugging

### Database Design
- **Referential Integrity:** Foreign key constraints and cascade operations
- **Unique Constraints:** Prevent duplicate data (emails, usernames, project keys)
- **Soft Relationships:** Optional associations for flexibility

### API Design
- **RESTful Conventions:** Standard HTTP methods and status codes
- **Nested Resources:** Logical URL structure (`/teams/:id/projects`)
- **Consistent Payload:** Uniform request/response formats

## 🔄 Request Flow

1. **Client Request** → Express Router
2. **Authentication** → JWT Middleware validates token
3. **Route Handler** → Maps to appropriate controller method
4. **Business Logic** → Controller processes request with validation
5. **Database Operation** → Prisma ORM executes query
6. **Response** → JSON response sent back to client

## 📊 Performance Considerations

- **Database Indexing:** Unique constraints and foreign keys
- **Query Optimization:** Selective field inclusion with Prisma
- **Eager Loading:** Related data fetched in single queries
- **Connection Pooling:** Efficient database connection management

This architecture provides a robust, scalable foundation for project management functionality with comprehensive security, clear separation of concerns, and maintainable code structure.
