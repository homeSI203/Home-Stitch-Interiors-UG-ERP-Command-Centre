# Home Stitch Interiors UG — ERP System

Enterprise Resource Planning system for **Home Stitch Interiors UG** — *Where Comfort Is Tailored*.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn/UI |
| State | Zustand, TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animation | Framer Motion |
| Backend | Firebase (Auth, Firestore, Storage, Functions, FCM) |
| Deployment | Vercel (Frontend), Firebase (Backend) |

## Getting Started

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Cloud Firestore** database
4. Copy `.env.example` to `.env.local` and fill in your Firebase config values

```bash
cp .env.example .env.local
```

### 3. Deploy Firestore rules

```bash
firebase deploy --only firestore:rules,storage
```

### 4. Run the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Create your admin account

Visit `/register` — the **first registered user** automatically receives **Super Admin** privileges and system roles are initialized in Firestore.

## Phase 1 — Complete

- Firebase Authentication (login, register, password reset)
- Role-based access control (7 system roles with granular permissions)
- Premium dashboard layout with collapsible sidebar
- Mobile-responsive navigation
- Dashboard with KPI cards, charts, and roadmap
- Firestore security rules for all collections

## Development Phases

| Phase | Modules | Status |
|-------|---------|--------|
| 1 | Auth, Roles, Dashboard, Layout | ✅ Complete |
| 2 | Products, Inventory, Suppliers | Pending |
| 3 | Sales, POS, Receipts | Pending |
| 4 | Customers, Quotations, Proforma | Pending |
| 5 | Purchases, Expenses | Pending |
| 6 | Accounting Engine | Pending |
| 7 | Reports & Analytics | Pending |
| 8 | Notifications & AI | Pending |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register, forgot password
│   ├── dashboard/       # Main dashboard
│   ├── inventory/       # Phase 2
│   ├── sales/           # Phase 3
│   └── ...              # Other modules
├── components/
│   ├── ui/              # Shadcn/UI components
│   ├── layout/          # Sidebar, header, dashboard layout
│   ├── features/        # Feature-specific components
│   └── providers/       # Auth & query providers
├── hooks/
├── lib/                 # Firebase, roles, navigation, utils
├── services/            # Firebase service layer
├── store/               # Zustand stores
└── types/               # TypeScript types
```

## Roles

| Role | Description |
|------|-------------|
| Super Admin | Full system access including user management |
| Administrator | Full business access except user management |
| Manager | Operations access, no accounting/settings |
| Sales | Sales, customers, quotations, receipts |
| Accountant | Accounting, purchases, reports |
| Inventory Clerk | Inventory, suppliers, purchases |
| Viewer | Read-only access to most modules |

## Brand Colors

- Deep Green: `#1F3D2B`
- Chocolate Brown: `#5A3E2B`
- Beige: `#F5E9DA`
- Gold Accent: `#C9A24A`
