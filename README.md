# AI-Powered Google Suite Assistant

A modular AI agent built with Next.js and Google's Gemini API that integrates with Google services to provide seamless Gmail and Calendar management.

## Features

- **Email Management**: Fetch, summarize, and draft replies to Gmail messages
- **Calendar Scheduling**: Schedule events from text or voice input
- **Voice Typing**: Convert speech to text for emails, calendar events, and more
- **Content Summarization**: Generate concise summaries of emails and documents

## Tech Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: Google's Gemini API (gemini-1.5-flash model)
- **APIs**: Gmail API, Google Calendar API, Web Speech API

## Setup Instructions

### Prerequisites

- Node.js 16+
- Google Cloud Platform account
- Gemini API key

### Environment Variables

Create a `.env.local` file with the following variables:

```
# Next Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-next-auth-secret

# Google Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gemini API
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
```

### Google API Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Gmail API, Google Calendar API, and People API
3. Set up OAuth consent screen (include scopes for Gmail and Calendar)
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Get a Gemini API key from the [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Sign in with your Google account using the button in the top right
2. Navigate between features using the main navigation
3. **Email**: View and manage your Gmail messages with AI assistance
4. **Calendar**: Create events using natural language or voice input
5. **Voice**: Use speech recognition to generate text
6. **Summary**: Summarize any text content using the Gemini API

## Project Structure

```
├── app/                  # Next.js app router
│   ├── api/              # API routes
│   │   └── auth/         # NextAuth.js authentication
│   ├── calendar/         # Calendar page
│   ├── email/            # Email management page
│   ├── summary/          # Content summarization page
│   ├── voice/            # Voice typing page
│   ├── layout.tsx        # Root layout with navigation
│   └── page.tsx          # Home page
├── components/           # Reusable components
├── utils/                # Utility functions
│   ├── gemini.ts         # Gemini API integration
│   ├── google-api.ts     # Google API utilities
│   └── voice-recognition.ts # Voice recognition utility
└── types/                # TypeScript type definitions
```

## License

MIT
