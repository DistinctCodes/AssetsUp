# AssetsUp

AssetsUp is an open-source inventory and asset management system built to help organizations register, track, monitor, and manage physical and digital assets across teams, locations, and regions.

The platform is designed for businesses that need visibility and accountability over their assets without relying on fragmented spreadsheets or rigid legacy software. AssetsUp provides a centralized system for asset lifecycle management while remaining flexible enough to adapt to different organizational structures.

---

## Motivation

As organizations grow, asset tracking often becomes inconsistent. Equipment is moved between departments, licenses are shared across teams, and assets are duplicated or lost due to poor visibility.

Common challenges include:

- No single source of truth for asset ownership
- Limited tracking across branches or countries
- Manual updates and inconsistent records
- Difficulty auditing asset usage and history

AssetsUp addresses these issues by offering a structured, auditable system that tracks assets from registration through retirement.

---

## What AssetsUp Provides

AssetsUp enables organizations to:

- Register physical and digital assets
- Assign assets to departments, users, or locations
- Track asset status, condition, and movement
- Maintain asset history and lifecycle events
- Generate reports for audits and decision-making

The system is designed to scale from small teams to multi-branch organizations.

---

## Key Capabilities

- Asset registration and categorization
- Department and location-based ownership
- Asset lifecycle tracking (active, assigned, retired)
- History and change logs
- Search and filtering across asset records
- Role-based access control

---

## System Design

AssetsUp follows a modular architecture:

- A backend API manages asset records and business logic
- A web interface provides dashboards and management tools
- A relational database ensures consistency and traceability

This structure allows new asset types and workflows to be introduced without redesigning the core system.

---

## Technology Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- react query
- zustand
- react hook form
- zod
- api client

### Backend

- NestJS
- PostgreSQL
- TypeORM

### Contract

- Stellar (rust)

---

## Installation

### Prerequisites

- Node.js (v18 or newer)
- PostgreSQL (v14 or newer)
- npm or yarn
- Git

---

### Clone the Repository

```bash
git clone https://github.com/your-org/assetsup.git
cd assetsup
```

---

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=assetsup
```

Run database migrations:

```bash
npm run migration:run
```

Start the backend server:

```bash
npm run start:dev
```

The backend will be available at `http://localhost:3001`.

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Usage

1. Create an account or sign in
2. Set up departments, locations, and asset categories
3. Register assets with relevant details
4. Assign assets to users or departments
5. Track asset status and history over time

Assets can be updated, transferred, or retired as organizational needs change.

---

## Development

### Running Tests

```bash
npm run test
```

### Linting

```bash
npm run lint
```

---

## Contributing

Contributions are welcome from developers and product engineers.

To contribute:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with a clear description of your changes

- Include a **deployment section (Docker / CI)**
- Write a **more enterprise-focused version** for internal tools
