# Common Module - Exception Filter & Response Interceptor

This module contains global middleware for standardizing all API responses across the application.

## Components

### 1. Response DTOs (`dto/response.dto.ts`)

- **ResponseDto**: Wraps successful responses
  - `success`: boolean (true)
  - `data`: The actual response data
  - `message`: Optional message
  - `timestamp`: Response timestamp
  - `path`: Request path

- **ErrorResponseDto**: Wraps error responses
  - `success`: boolean (false)
  - `error`: Error type/name
  - `message`: Error message
  - `statusCode`: HTTP status code
  - `timestamp`: Error timestamp
  - `path`: Request path

### 2. Response Interceptor (`interceptors/response.interceptor.ts`)

Global interceptor that wraps all successful responses in the standardized `ResponseDto` format.

**Features:**
- Automatically wraps response data
- Includes request path in response
- Preserves already wrapped responses

### 3. Global Exception Filter (`filters/global-exception.filter.ts`)

Global exception handler that catches all errors and wraps them in the standardized `ErrorResponseDto` format.

**Features:**
- Catches all exceptions (HttpException, BadRequestException, generic Error)
- Extracts error details and status codes
- Includes request path in error response
- Returns consistent error format

## Usage

Both the exception filter and response interceptor are registered globally in `main.ts`:

```typescript
// Register global exception filter
app.useGlobalFilters(new GlobalExceptionFilter());

// Register global response interceptor
app.useGlobalInterceptors(new ResponseInterceptor());
```

## Response Format

### Success Response (2xx)
```json
{
  "success": true,
  "data": { ... },
  "message": "optional message",
  "timestamp": "2026-04-25T10:00:00.000Z",
  "path": "/api/auth/login"
}
```

### Error Response (4xx, 5xx)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid credentials",
  "statusCode": 401,
  "timestamp": "2026-04-25T10:00:00.000Z",
  "path": "/api/auth/login"
}
```

## Example

All endpoints automatically benefit from this standardization:

```typescript
// Controller
@Post('login')
async login(@Body() credentials: LoginDto) {
  const result = await this.authService.login(credentials);
  return result; // Automatically wrapped in ResponseDto
}

// Response
{
  "success": true,
  "data": { "token": "...", "user": { ... } },
  "timestamp": "...",
  "path": "/api/auth/login"
}
```
