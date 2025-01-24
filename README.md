# Kokoro TTS Web Application

A modern web application that uses the Kokoro Text-to-Speech API to convert text into natural-sounding speech.

## Features

- Convert text to speech using Kokoro TTS API
- Modern UI with Tailwind CSS
- History of previous conversions
- Local storage for persistence
- Responsive design

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Replicate API token:
   ```
   NEXT_PUBLIC_REPLICATE_API_TOKEN=your_replicate_api_token_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technologies Used

- Next.js 13+ with App Router
- TypeScript
- Tailwind CSS
- Headless UI
- React Hot Toast
- Replicate API

## Environment Variables

- `NEXT_PUBLIC_REPLICATE_API_TOKEN`: Your Replicate API token (required)

## Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t kokoro-tts .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 -e REPLICATE_API_TOKEN=your_token_here kokoro-tts
   ```

## Coolify Deployment

1. Fork this repository to your GitHub account
2. In Coolify:
   - Create a new service
   - Select your forked repository
   - Set the following environment variable:
     ```
     REPLICATE_API_TOKEN=your_replicate_api_token
     ```
   - Deploy the service

## License

MIT
