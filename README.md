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
> This step also seeds demo data for testing.

---
## Getting Started
```bash
# Backend
cd backend
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
npm run dev

# Frontend
cd frontend
npm install
npm run dev
