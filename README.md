# Natural Remedies Complaint Management System

Customer complaints belong in a disciplined resolution pipeline, not lost in a sea of WhatsApp chats and sticky notes.

This platform connects directly to WhatsApp bots and internal portals, catches incoming customer issues in real time, logs them into an enterprise Quality Management system, and steers them through a pharmaceutical-grade 8D/SOP lifecycle until closed.

## What It Does

When a retailer, doctor, or distributor reports a defective batch or damaged packaging on WhatsApp:

1. The chatbot listens: It greets the user, gathers essential details (batch number, product name, photos, problem description), and handles the intake conversation gracefully.
2. The platform takes over: It automatically creates a compliant complaint record, maps the responsible Quality Coordinator, and dispatches an instant acknowledgement email to the requester.
3. The team investigates: Quality and production teams step through the investigation without cutting corners:
   - D1: Problem definition, coordinator assignment, and immediate customer acknowledgement.
   - D2: Process mapping, RPN risk scoring (Severity, Probability, Detectability), and FRP assignment.
   - D3: Root Cause Analysis using Why-Why and Fishbone diagrams, CAPA creation, and database-routed manager approvals.
   - D4: Multi-tier implementation sign-offs, Cost of Poor Quality (COPQ in INR) tracking, and effectiveness review by the ERP.
4. Auto-closing with audit proof: When all actions are verified, the system generates the official SOP PDF report (NR/QAD/SOP/001-F01/04) and delivers it directly to quality handlers while confirming resolution with the customer.

## The Tech Stack

Built for reliability, speed, and strict audit compliance.

### Backend
- Node.js and Express: Clean REST API with structured controllers, services, and transactional integrity.
- MongoDB and Mongoose: Document persistence with replica-set transactions to ensure zero state desync.
- Nodemailer: Dedicated outbound queuing engine with exponential backoff retries, CC/BCC routing, and PDF attachment streaming.
- Zod: Strict schema validation across every payload.
- jsPDF: Server-side rendering for formatted regulatory PDF reports.

### Frontend
- React 19 and Vite: Lightning-fast single-page application with instant hot module replacement.
- Tailwind CSS: Clean, responsive UI customized to match corporate EQMS layouts.
- Lucide Icons: Crisp iconography throughout the application.
- Axios: Centralized API client with interceptors and error handling.

### Integrations
- Meta WhatsApp Cloud API / Webhook Engine: Bidirectional chatbot for conversational intake and photo uploads.
- Ngrok / Reverse Proxy: Secure external webhook tunneling for live testing.

## Quick Start

### Prerequisites
- Node.js 20 or newer
- MongoDB 6 or newer running with a replica set (required for multi-document transactions)

To start a single-node replica set locally:

```bash
mongod --dbpath ./data --replSet rs0 --bind_ip 127.0.0.1
# In a second terminal, run once:
mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

### Installation

1. Clone and install dependencies:

```bash
# Server
cd server
npm install
cp .env.example .env

# Client
cd ../client
npm install
```

2. Configure environment:
Update `server/.env` with your MongoDB URI, JWT secrets, and SMTP credentials.

3. Seed the database:

```bash
cd server
npm run seed -- --demo
```
This populates initial roles, demo departments, and seeded users with mapped reporting managers.

4. Run the application:

```bash
# Terminal 1: Backend API (port 4000)
cd server && npm run dev

# Terminal 2: Frontend Client (port 5173)
cd client && npm run dev
```

Sign in at `http://localhost:5173` using your admin credentials.

## Architecture Highlights

- Transactional Integrity: Every stage transition, email queue event, and audit record commits inside a unified MongoDB transaction. If an action fails, nothing dirty remains in the database.
- Database Mapping Strategy: Sensitive routing (such as FRP Reporting Managers and Quality Handlers) is resolved directly from organizational hierarchy in the database rather than trusting manual guesses.
- Complete Audit Trail: Immutable change logs tracking who touched what, when, and why across the entire complaint lifecycle.
