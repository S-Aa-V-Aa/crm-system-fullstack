# Workspace CRM — Full-Stack B2B Sales & Client Management System

A multi-tenant B2B CRM web application designed for managing client pipelines, tracking deal stages, and monitoring sales performance with strict role-based access control and data isolation.

## Live Deployment

- **Frontend Application (Netlify):** https://workspace-crm.netlify.app
- **Backend REST API & Swagger Docs (Render):** https://crm-system-fullstack.onrender.com/api/docs/

### Demo Credentials (Admin Role)

- **Username:** `admin`
- **Password:** `Admin12345!`

> **Note:** The backend is hosted on a free Render instance and may take 20–30 seconds to wake up on the initial request after inactivity.

---

## Tech Stack

### Backend

- **Framework:** Python 3.12, Django, Django REST Framework (DRF)
- **Authentication:** JWT (`djangorestframework-simplejwt`) with automatic access token refresh
- **Database:** PostgreSQL 17 (`psycopg2-binary`, `dj-database-url`)
- **API Documentation:** OpenAPI 3.0 / Swagger UI (`drf-spectacular`)
- **Production Server & Static Files:** Gunicorn, WhiteNoise

### Frontend

- **Core:** React, TypeScript, Vite
- **Styling:** Tailwind CSS (Slate/Zinc enterprise palette)
- **HTTP & Routing:** Axios (request/response interceptors), React Router (`BrowserRouter`)
- **State & UX:** React Context API (Toast notifications), custom `useDebounce` hook

---

## Key Architecture & Security Features

- **Role-Based Access Control (RBAC):** Clear separation between **Administrators** (full visibility across all workspaces, user management, deal reassignment) and **Managers** (isolated access strictly to their assigned clients and deals).
- **IDOR Protection & ORM Data Isolation:** Querysets are filtered at the database level (`get_queryset`), returning `404 Not Found` when attempting to access unauthorized records by ID.
- **Server-Side Aggregation:** Real-time KPI metrics (`/api/deals/stats/`) and client revenue/deal-count summaries (`/api/clients/`) are computed directly in PostgreSQL via Django ORM `Count`, `Sum`, and `Coalesce` annotations.
- **Automated Security Test Suite:** Unit and integration tests (`APITestCase`) covering authentication boundaries, manager isolation, IDOR prevention, and role permissions.
- **Resilient Token Lifecycle:** Axios interceptors automatically attach `Bearer` tokens and transparently refresh expired access tokens using the stored refresh token.

---

## Project Structure

```text
crm-system-fullstack/
├── backend/                 # Django + DRF REST API
│   ├── core/                # Project settings, URLs, WSGI config
│   ├── crm/                 # Models, serializers, views, permissions, tests
│   ├── .env.example         # Environment variables template
│   └── requirements.txt     # Python dependencies
└── frontend/                # React + TypeScript + Vite SPA
    ├── public/              # Static assets & Netlify _redirects
    ├── src/
    │   ├── api/             # Axios singleton client & typed endpoints
    │   ├── components/      # Reusable UI components, Layout, ProtectedRoute
    │   ├── context/         # Global Toast notification context
    │   ├── hooks/           # Custom hooks (useDebounce)
    │   ├── pages/           # Login, Deals, Clients views
    │   └── types/           # TypeScript interfaces
    ├── .env.example         # Frontend environment variables template
    └── vercel.json          # SPA routing rewrites
```

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone [https://github.com/S-Aa-V-Aa/crm-system-fullstack.git](https://github.com/S-Aa-V-Aa/crm-system-fullstack.git)
cd crm-system-fullstack
```

### 2. Backend Setup (Django + PostgreSQL)

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Update `backend/.env` with your local PostgreSQL credentials (`DB_NAME`, `DB_USER`, `DB_PASSWORD`) and a generated `SECRET_KEY`, then run:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py test crm
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/api/` and Swagger UI at `http://127.0.0.1:8000/api/docs/`.

### 3. Frontend Setup (React + Vite)

Open a new terminal window:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The application will run at `http://localhost:5173`.
