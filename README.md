# IT Service Desk & Asset Management System

## Overview
This project is a full-stack IT service desk platform designed to simulate a real internal support system. It allows employees to create and track support requests, while administrators and agents manage tickets, monitor operations, and maintain system visibility.

The platform combines ticket management, asset tracking, analytics, and operational workflows into a single system.

---

## Features

### Core Functionality
- User authentication (login, register, logout)
- Role-based access control (Admin, Agent, Employee)
- Ticket lifecycle management (create -> assign -> resolve -> close)
- SLA tracking and overdue detection
- Asset management with ticket linking
- Knowledge base for reusable solutions
- In-app notifications
- Dashboard with analytics and charts

---

## Security Features

- Password hashing for secure credential storage
- Rate limiting on authentication endpoints to prevent brute-force attacks
- Account lockout after repeated failed login attempts
- Role-based access control for protected routes
- Input validation and request sanitization
- Secure token-based authentication (JWT)
- Audit logging for sensitive actions and system events
- Security event tracking (login abuse, access denials, rate-limit triggers)

---

## Tech Stack

### Frontend
- React
- Vite
- Recharts (for dashboard analytics)

### Backend
- Node.js
- Express

### Database
- PostgreSQL
- Prisma ORM

## Demo Access

Accounts to test different roles:

- admin@campusdesk.dev  
- agent@campusdesk.dev  
- employee@campusdesk.dev  

**Password:** `DemoPass!123`

## Screenshots

### Login Page
![Login Page](./screenshots/login.png)

---

### Dashboard
![Dashboard](./screenshots/dashboard.png)

---

### Tickets Page
![Tickets Page](./screenshots/tickets.png)

---

### Asset Management
![Asset Management](./screenshots/assets.png)
---

### Knowledge Page
![Knowledge Page](./screenshots/Knowledge.png)
---
## What I Built/Learned

- Built a full-stack IT service desk platform using React, Node.js, Express, PostgreSQL, and Prisma
- Implemented JWT authentication and role-based access control for Admin, Agent, and Employee users
- Designed ticket lifecycle workflows with SLA tracking and asset linking
- Added security features such as rate limiting, account lockout, audit logging, and input validation
- Improved project structure, UI flow, and documentation to make the system easier to run and demonstrate
---
```md
## Getting Started

```bash
# Backend
cd Backend
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
npm run dev

# Open new terminal

# Frontend
cd Frontend
npm install
npm run dev



