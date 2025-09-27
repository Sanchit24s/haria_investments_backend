# Haria Investments Contact Management System

This server provides a comprehensive contact management system for handling contact form submissions from the Haria Investments website.

## Features

- **Contact Form Processing**: Handle form submissions with validation
- **Email Notifications**: Automatic confirmation emails to users and admin notifications
- **Contact Management**: Full CRUD operations for contact records
- **Statistics**: Contact analytics and reporting
- **Rate Limiting**: Protection against spam and abuse
- **Data Validation**: Comprehensive input validation and sanitization

## API Endpoints

### Contact Management

- `POST /api/v1/contacts` - Create new contact
- `GET /api/v1/contacts` - Get all contacts (with pagination and filtering)
- `GET /api/v1/contacts/:id` - Get contact by ID
- `PUT /api/v1/contacts/:id` - Update contact
- `DELETE /api/v1/contacts/:id` - Delete contact
- `GET /api/v1/contacts/stats` - Get contact statistics

### Health Check

- `GET /api/v1/health` - Server health check

## Contact Schema

The contact model includes the following fields:

### Required Fields

- `firstName` (String, 2-50 chars)
- `lastName` (String, 2-50 chars)
- `email` (String, valid email format)
- `services` (Array, at least one service required)

### Optional Fields

- `message` (String, max 1000 chars)
- `status` (Enum: 'new', 'contacted', 'in_progress', 'completed', 'closed')

### Virtual Fields

- `fullName` - Concatenated first and last name
- `ageInDays` - Days since contact was created

### Timestamps

- `createdAt` - Auto-generated creation timestamp
- `updatedAt` - Auto-generated update timestamp

## Services

The system supports the following services:

- Insurance
- Mutual Funds
- Equity
- Fixed Income

## Email Templates

### Confirmation Email

Sent to users after form submission with:

- Personalized greeting
- Service information
- Next steps
- Contact information

### Admin Notification

Sent to administrators with:

- Complete contact details
- Form submission timestamp
- Action required notice
- Contact ID for tracking

## Rate Limiting

- 5 requests per 15-minute window per IP address
- Prevents spam and abuse
- Returns 429 status with retry information

## Environment Variables

Required environment variables:

```env
# Server
NODE_ENV=development
PORT=8000
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/haria-investments

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@hariainvestments.com

# Optional
JWT_SECRET=your-jwt-secret
GOOGLE_SCRIPT_URL=your-google-script-url
```

## Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## Usage Examples

### Create Contact

```javascript
POST /api/v1/contacts
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "services": ["Insurance", "Mutual Funds"],
  "message": "Interested in learning more about your services",
  "source": "website"
}
```

### Get Contacts with Filtering

```javascript
GET /api/v1/contacts?status=new&service=Insurance&page=1&limit=10
```

## Error Handling

The API returns consistent error responses:

```javascript
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## Logging

All operations are logged using Winston logger with different levels:

- `info` - Successful operations
- `warn` - Non-critical issues
- `error` - Errors and exceptions

## Security Features

- Input validation and sanitization
- Rate limiting
- CORS configuration
- Helmet security headers
- SQL injection prevention (MongoDB)
- XSS protection through validation
