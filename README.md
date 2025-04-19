# 🔄 Assignment B2 – Realtime Web Application (GitLab Issues Monitor)

This project is a real-time web application built with **Node.js**, **Express**, and **WebSocket**, designed to monitor and interact with GitLab issues. It integrates both **RESTful API consumption** and **webhook event handling** from GitLab to display and update issue data live in the browser.

The application was developed as part of a backend development course and is deployed on CSCloud. It demonstrates how modern web applications can synchronize server-side and client-side data using WebSocket-based communication and third-party webhook integrations.

---

## 🧩 Core Features

- 📥 Fetches issues from a GitLab project using the **GitLab Issues API**
- 🔔 Listens for real-time updates via **GitLab Webhooks**
- 🔄 Broadcasts issue changes to all connected clients via **WebSockets**
- ❌ Allows clients to close issues directly from the frontend
- ➕ Includes one additional user-defined feature (e.g., reopen issues, assign tags, or add comments)
- 🌍 Runs in production on CSCloud (public access)
- 🧼 Handles errors with proper HTTP status codes (404, 500)
- 🔐 Protects against common vulnerabilities and secures API secrets via environment variables

---

## ⚙️ Technologies Used

- Node.js
- Express.js
- WebSocket (ws)
- GitLab REST API
- GitLab Webhooks
- dotenv (for environment variables)
- Custom modular architecture (no scaffolding tools)

---

## 🏗️ Application Architecture

```plaintext
Client <—— WebSocket ——> Server <—— Webhook —— GitLab
         ↑               ↑
         |               └── Fetches initial issue data via REST API
         └—————— Renders dynamic issue list and listens for real-time updates
