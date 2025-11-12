# Ziggler Backend API

A REST API built with Go and Gin featuring JWT authentication.

## Getting Started

### Prerequisites

- Go 1.20 or higher

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

   ```bash
   go mod tidy
   ```

### Running the Server

```bash
go run main.go
```

The server will start on port 8080 (or the port specified in the PORT environment variable).

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. Most endpoints require authentication.

### Sample Users

The API comes with sample users for testing:

- Email: `john@example.com`, Password: `password123`
- Email: `jane@example.com`, Password: `password123`

## API Endpoints

### Public Endpoints

- `GET /api/v1/health` - Check if the API is running
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user

### Protected Endpoints (require JWT token)

- `GET /api/v1/profile` - Get current user profile
- `GET /api/v1/ws` - WebSocket connection for real-time updates

#### Task Management
- `GET /api/v1/tasks` - Get all tasks with relationships
- `POST /api/v1/tasks` - Create a new task
- `GET /api/v1/tasks/{id}` - Get a specific task
- `PUT /api/v1/tasks/{id}` - Update a task
- `DELETE /api/v1/tasks/{id}` - Delete a task
- `GET /api/v1/tasks/{id}/subtasks` - Get all subtasks of a parent task

#### User Management
- `GET /api/v1/users` - Get all users
- `POST /api/v1/users` - Create a new user
- `GET /api/v1/users/{id}` - Get a specific user
- `PUT /api/v1/users/{id}` - Update a user
- `DELETE /api/v1/users/{id}` - Delete a user
- `GET /api/v1/items` - Get all items
- `POST /api/v1/items` - Create a new item
- `GET /api/v1/items/{id}` - Get a specific item
- `PUT /api/v1/items/{id}` - Update an item
- `DELETE /api/v1/items/{id}` - Delete an item

## Authentication Examples

### Register a New User

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "securepassword"
  }'
```

### Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

This will return a response like:

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Using the JWT Token

For protected endpoints, include the JWT token in the Authorization header:

```bash
# Get user profile
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/v1/profile

# Get all users
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/v1/users

# Create an item
curl -X POST http://localhost:8080/api/v1/items \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Item", "description": "A new item", "price": 19.99}'
```

### Task Management Examples

#### Create a Task

```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement User Authentication",
    "description": "Add JWT-based authentication to the API",
    "assignee_id": 2,
    "status": "todo"
  }'
```

#### Create a Subtask

```bash
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": 1,
    "title": "Set up JWT middleware",
    "description": "Create middleware to validate JWT tokens",
    "assignee_id": 1,
    "status": "in_progress"
  }'
```

#### Update Task Status

```bash
curl -X PUT http://localhost:8080/api/v1/tasks/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement User Authentication",
    "description": "Add JWT-based authentication to the API",
    "status": "done"
  }'
```

### WebSocket Connection

The API supports real-time updates via WebSocket. Connect to `/api/v1/ws` with a valid JWT token:

```javascript
// JavaScript WebSocket example
const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket(`ws://localhost:8080/api/v1/ws?token=${token}`);

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
    
    // Handle different message types
    switch(message.type) {
        case 'task_created':
            console.log('New task created:', message.payload);
            break;
        case 'task_updated':
            console.log('Task updated:', message.payload);
            break;
        case 'task_deleted':
            console.log('Task deleted:', message.payload);
            break;
    }
};
```

### Task Status Values

- `todo` - Task is pending
- `in_progress` - Task is being worked on
- `done` - Task is completed
- `cancelled` - Task was cancelled

### User Roles

- `admin` - Full access to all resources
- `user` - Standard user access

## Project Structure

```text
backend/
├── main.go              # Main application file
├── go.mod               # Go module file
├── auth/
│   └── auth.go          # JWT and password utilities
├── handlers/
│   └── handlers.go      # HTTP handlers
└── middleware/
    └── middleware.go    # HTTP middleware (CORS, JWT)
```

## Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected and public routes
- RESTful API design
- CORS support
- Request logging
- JSON response format
- Error handling
- In-memory data storage (replace with database in production)

## Environment Variables

- `PORT` - Server port (default: 8080)
- `JWT_SECRET` - JWT signing secret (set in production)

## Security Notes

⚠️ **Important for Production:**

1. Change the JWT secret in `auth/auth.go`
2. Use environment variables for sensitive configuration
3. Replace in-memory storage with a proper database
4. Add rate limiting
5. Use HTTPS
6. Add input validation and sanitization

## Development

### Quick Testing

You can quickly test the API endpoints using the following commands:

```bash
# 1. Start the server
go run main.go

# 2. Test health endpoint (public)
curl http://localhost:8080/api/v1/health

# 3. Login with sample user
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "password123"}'

# 4. Copy the token from the response and test a protected endpoint
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8080/api/v1/profile
```

To add new protected routes:

1. Add the route definition in the `protected` group in `main.go`
2. Implement the handler function in `handlers/handlers.go`
3. Access user information via `c.Get("user_id")` and `c.Get("user_email")`
