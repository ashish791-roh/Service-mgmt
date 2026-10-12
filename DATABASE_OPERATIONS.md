# Database Operations Guide — Fixhub

This guide covers schema migrations, database backups, and restore operations for the Fixhub Postgres database.

---

## 1. Prisma Migrations

Fixhub uses **Prisma** to manage database schema updates.

### Development Schema Updates
When you modify `prisma/schema.prisma` in development, perform the following steps to apply modifications locally:

1. **Apply changes & generate a migration file**:
   ```bash
   node node_modules/prisma/build/index.js migrate dev --name <migration-name>
   ```
   This generates a SQL migration script under `prisma/migrations/` and updates the local database.

2. **Manual Schema Push (Drift Resolution)**:
   If your database schema drifts from the migration history (a common occurrence with serverless providers like Neon), use `db push` to sync the schema directly without resetting the database:
   ```bash
   node node_modules/prisma/build/index.js db push
   ```

3. **Explicit Client Generation**:
   Whenever the schema is updated, ensure the typescript Prisma client is regenerated:
   ```bash
   node node_modules/prisma/build/index.js generate
   ```

### Production Deployments
In staging and production environments, migrations should be applied non-interactively using:
```bash
node node_modules/prisma/build/index.js migrate deploy
```
*Note: Never run `migrate dev` in production.*

---

## 2. Backup Strategy

Regular backups should be automated. We recommend taking daily snapshots using PostgreSQL's standard `pg_dump` utility.

### Plain-Text SQL Backup
Generates a SQL script containing all commands to recreate the database:
```bash
pg_dump "postgresql://username:password@host:5432/dbname?sslmode=require" -f backup.sql
```

### Compressed Archive Backup (Recommended)
Generates a custom-format compressed binary archive, which is faster to dump/restore and allows selective restores:
```bash
pg_dump -Fc "postgresql://username:password@host:5432/dbname?sslmode=require" -f backup.dump
```

---

## 3. Restore Strategy

Before executing a restore, make sure to terminate active connections or create a clean target database.

### Restoring from Compressed Archive (`.dump`)
Use `pg_restore` to restore the custom format backup into a database:
```bash
pg_restore -d "postgresql://username:password@host:5432/dbname?sslmode=require" -v backup.dump
```
If you are restoring into an existing database and want to overwrite tables, use the `--clean` flag:
```bash
pg_restore --clean -d "postgresql://username:password@host:5432/dbname?sslmode=require" -v backup.dump
```

### Restoring from Plain-Text SQL (`.sql`)
Run the SQL script directly using the `psql` command-line utility:
```bash
psql "postgresql://username:password@host:5432/dbname?sslmode=require" -f backup.sql
```
