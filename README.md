<p align="center">
    <img width="180" src="/client/public/goji-websafe.png" alt="Goji logo">
</p>
<br/>
<p align="center">
    <img width="600" src="/client/public/screenshot.png" alt="Goji screenshot">
</p>
# Goji 

A Project Management Tool that can be deployed with either Postgres or SQLite databases

## Features

- User authentication (register/login)
- Multi-database support (SQLite for development, PostgreSQL for production)
- Fast development with Vite and hot reload
- Clean and responsive UI
- JWT-based authentication
- Client-server architecture

## Project Structure

```
goji/
├── client/              # Vite React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   └── ...
│   └── package.json
├── server/              # Express.js backend
│   ├── prisma/          # Database schema and migrations
│   ├── index.js         # Server entry point
│   └── package.json
└── package.json         # Root package.json with scripts
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
```bash
npm run install:all
```

2. Set up the database:
```bash
cd server
npm run db:push
```

3. Start the development servers:
```bash
# From the root directory
npm run dev
```

This will start:
- Client on http://localhost:5173
- Server on http://localhost:3001

## Database Configuration

The project supports both SQLite and PostgreSQL databases. Choose based on your deployment needs:

### SQLite (Local Machine Deployments)
Best for: Local development, single-user applications, embedded deployments

```bash
cd server
npm run db:init-sqlite
```

### PostgreSQL (Server Deployments)
Best for: Multi-user applications, cloud deployments, production workloads

1. Set up your PostgreSQL database (local server or cloud provider)
2. Update `server/.env` with your database URL:
```env
DATABASE_URL="postgresql://username:password@your-host:5432/database_name?schema=public"
```
3. Initialize the database:
```bash
cd server
npm run db:init-postgres
```

### Switching Between Database Types
- Switch to SQLite: `npm run db:use-sqlite`
- Switch to PostgreSQL: `npm run db:use-postgres`

### Database URL Examples
- **SQLite**: `file:./myapp.db`
- **Local PostgreSQL**: `postgresql://user:pass@localhost:5432/mydb?schema=public`

## Available Scripts

### Root Directory
- `npm run dev` - Start both client and server in development mode
- `npm run install:all` - Install dependencies for all packages

### Server (`cd server`)
- `npm run dev` - Start server with nodemon
- `npm start` - Start server in production mode
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:init-sqlite` - Set up SQLite database
- `npm run db:init-postgres` - Set up PostgreSQL database
- `npm run db:use-sqlite` - Switch to SQLite schema
- `npm run db:use-postgres` - Switch to PostgreSQL schema

### Client (`cd client`)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Users
- `GET /api/users` - Get all users (protected)

## Environment Variables

### Server (.env)
```env
DATABASE_URL="file:./dev.db"              # SQLite for local deployment
# DATABASE_URL="postgresql://..."         # PostgreSQL for server deployment
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

### Client (.env)
```env
VITE_API_URL=http://localhost:3001
```

## Technologies Used

### Frontend
- **Vite** - Build tool and development server
- **React** - UI library
- **Axios** - HTTP client

### Backend
- **Express.js** - Web framework
- **Prisma** - Database ORM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

### Database
- **SQLite** - Development database
- **PostgreSQL** - Production database

## Deployment

1. Set up your production database (Postgres or SQLite)
2. Update environment variables for production
3. Build the client: `cd client && npm run build`
4. Deploy both client and server to your hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

GNU GPLv3

View LICENSE.md
