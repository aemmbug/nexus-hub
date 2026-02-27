<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Nexus Hub: The Future of Collaborative Learning

**Nexus Hub** is a futuristic, cross-platform application designed to merge the flexibility of group messaging with the power of AI-facilitated learning and real-time communication. It serves as a centralized workspace for educational cohorts, corporate teams, and online communities, providing tools for both asynchronous chat and live interactive sessions.

## ✨ Key Features

*   **Multi-Threaded Workspaces**: Create "Hubs" that can be either a standard, unified chat (like Telegram) or a structured workspace with multiple modules/topics (like Discord).
*   **AI Facilitator**: Integrated **Gemini AI** acts as a "Nexus AI Tutor" within chats, providing context-aware assistance, answering questions, and facilitating discussions.
*   **Live Voice & Video Sessions**: High-fidelity voice and video meetings powered by the Gemini Live API, complete with a pre-join lobby and adaptive bitrate streaming for network resilience.
*   **Resource Libraries**: Each module within a workspace has its own persistent library where users can upload, view, and manage documents, PDFs, and other resources.
*   **Rich Messaging**: Full support for emoji reactions, message pinning, and interactive polls to enhance engagement.
*   **User Identity Management**: A secure, multi-step registration process with phone/email authentication and customizable user profiles.
*   **Fully Responsive Design**: A high-density, mobile-first interface that scales seamlessly from phone to tablet to a three-column "Command Center" layout on desktops.

## 🚀 Live Demo & Deployment

A live version of this application can be hosted on platforms like Vercel, Netlify, or Firebase Hosting.

**Hosting URL**: `[Your-Hosting-URL-Here]`

## 🛠️ Technical Architecture

Nexus Hub is built with a modern, scalable frontend stack:

*   **Framework**: React with Vite for a fast development experience.
*   **Language**: TypeScript for type safety and scalability.
*   **Styling**: Tailwind CSS for a utility-first, responsive design system.
*   **Backend & Database**: Firebase (Firestore for database, Firebase Auth for authentication).
*   **AI & Real-time API**: Google AI SDK for Gemini 3 Flash and the Gemini Live API.

## Getting Started: Local Setup

**Prerequisites:**
*   Node.js (v18 or higher)
*   A Firebase Project with Firestore and Authentication enabled.
*   A Gemini API Key from Google AI Studio.


1. Install dependencies:
   `npm install`
2. Create a `.env` file in the root of the project and add your API keys:
   ```
   VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

   VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
   VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
   VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
   VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
   VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_SENDER_ID"
   VITE_FIREBASE_APP_ID="YOUR_APP_ID"
   ```
3. Run the app:
   `npm run dev`

## 🔧 Implementation Details

*   **Component-Driven UI**: The application is built with a modular component architecture, with clear separation of concerns (e.g., `Sidebar`, `ChatArea`, `DashboardArea`).
*   **State Management**: Global state (groups, user, active sessions) is managed at the root `App.tsx` component using React Hooks (`useState`, `useEffect`).
*   **Real-time Communication**: The `MeetingSession.tsx` component demonstrates a sophisticated integration with the Gemini Live API, including a pre-join lobby, adaptive streaming logic, and a persistent, minimizable UI.
*   **Authentication**: The `AuthScreen.tsx` component provides a complete, multi-step registration and login flow using Firebase Authentication.

## 🧠 Challenges Faced

*   **Responsive Layout Complexity**: Designing a three-column "Command Center" for desktops that gracefully collapses into a dual-column tablet view and a single-pane mobile view required careful planning of Tailwind CSS breakpoints and flexbox/grid layouts.
*   **Real-time State Synchronization**: Ensuring that user actions (like pinning a message or voting in a poll) are reflected instantly across the UI required a centralized state management approach in `App.tsx`.
*   **API Integration**: Working with the Gemini Live API for audio/video required careful handling of media streams, connection states, and an exponential backoff strategy for network resilience.

## 🗺️ Future Roadmap

*   **Full Backend Integration**: Replace all mock data and local state updates with real-time Firestore listeners and Cloud Functions for a truly multi-user experience.
*   **Enhanced AI Capabilities**:
    *   Implement AI-powered chat summarization.
    *   Use AI for automated content moderation or to suggest relevant resources.
*   **Push Notifications**: Integrate Firebase Cloud Messaging to notify users of new messages or mentions.
*   **Third-Party Integrations**: Allow hubs to connect with tools like Google Drive, Calendar, or other educational platforms.
*   **Advanced User Roles & Permissions**: Implement a more granular permission system for hub administrators and moderators.
