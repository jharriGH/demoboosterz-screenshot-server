# DemoEnginez Screenshot Server

Free, self-hosted screenshot microservice using Playwright.

## Quick Start
```bash
npm install
npm start
```

## API

### POST /screenshot
Single screenshot capture.

**Request:**
```json
{
  "url": "https://example.com",
  "waitTime": 3000,
  "fullPage": false
}
```

**Response:**
```json
{
  "success": true,
  "screenshot": "base64-jpeg-data",
  "format": "jpeg",
  "size": 123456,
  "duration": 2340
}
```

### POST /screenshot/batch
Batch capture (max 5 URLs).

**Request:**
```json
{
  "urls": ["https://old.com", "https://new.com"],
  "waitTime": 3000
}
```

## Deploy to Railway

1. Push to GitHub
2. Connect Railway to repo
3. Deploy automatically
4. Get public URL

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)