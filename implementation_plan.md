# Implement Persistent Backend Architecture (Node.js & Prisma)

The goal of this phase is to migrate the application from its current in-memory prototype (`AppContext.tsx` with mock arrays) to a fully persistent, production-ready full-stack application using a relational database, fulfilling the final tech suggestions of the SRS.

## User Review Required

> [!WARNING]
> This upgrade will introduce a real SQLite database. Any mock data you previously added in the browser memory will be lost upon refreshing, as we will now be saving and loading from a permanent database file on your hard drive. 
> 
> Are you comfortable proceeding with the backend integration?

## Open Questions

> [!IMPORTANT]
> 1. **Database Choice:** For rapid development and portability, I plan to use **SQLite** (a lightweight SQL database stored in a local file). It uses the exact same Prisma ORM syntax as PostgreSQL/MySQL, making it trivial to swap to a cloud PostgreSQL database later. Does this sound good?
> 2. **Authentication:** Currently, authentication is a simple client-side check. We will keep this mechanism for now to maintain simplicity, but persist the user records in the DB. We can implement real JWT/session cookies later if needed.

## Proposed Changes

We will use **Next.js API Routes (Node.js)** and **Prisma ORM** to handle our backend. To ensure we do not break any of our incredibly polished UI, we will keep `AppContext.tsx` as the global state manager, but rewire its internal logic to synchronize with the new backend.

### 1. Database Initialization
- Install `prisma` and `@prisma/client`.
- Initialize Prisma with the SQLite provider.
- Run database migrations.

#### [NEW] prisma/schema.prisma
We will map your `src/types/index.ts` directly into relational tables:
- `User` table
- `Customer` table
- `Device` table
- `Job` table (with relations to Customer, Device, and User/Engineer)
- `PartRequest` table
- `InventoryItem` table
- `Notification` table

### 2. Backend API Layer
We will create a centralized API handler to synchronize data between the database and the frontend context.

#### [NEW] src/app/api/sync/route.ts
- **GET**: Fetches the entire state tree (all jobs, users, customers, etc.) from the SQLite database to load into the frontend on startup.
- **POST**: Acts as a mutation endpoint. It will receive actions (e.g., `action: 'ADD_JOB'`, `payload: {...}`) and safely execute the corresponding Prisma database transaction.

### 3. Rewiring the Global Context
We will gut the mock arrays and `useState` initializations inside the existing context, replacing them with HTTP calls to our new API.

#### [MODIFY] src/context/AppContext.tsx
- Remove `mockData.ts` imports.
- Add a `useEffect` hook to fetch data from `/api/sync` when the app loads.
- Rewrite all mutator functions (e.g., `updateJobStatus`, `addPartRequest`, `addUser`) to send a `POST` request to `/api/sync` and immediately update the local state for a snappy, instantaneous UI feel (optimistic updates).

## Verification Plan

### Automated Tests
- Run `npx prisma generate` and `npx prisma migrate dev` to ensure schema integrity.
- Execute `npm run build` to verify no type conflicts were introduced between Prisma generated types and our frontend types.

### Manual Verification
- Log in as Reception, create a new Customer, Device, and Job.
- Hard refresh the browser (`F5`).
- Verify that the newly created data persists and loads correctly from the database!
