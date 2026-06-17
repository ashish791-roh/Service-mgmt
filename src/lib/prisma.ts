import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import crypto from 'crypto';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

const rawPrisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = rawPrisma;

// SQL compiler helpers
function compileWhere(where: any, tableName: string, params: any[]): string {
  if (!where) return '';
  const clauses: string[] = [];

  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR') {
      if (Array.isArray(val)) {
        const subClauses = val.map(sub => compileWhere(sub, tableName, params)).filter(Boolean);
        if (subClauses.length > 0) {
          clauses.push(`(${subClauses.join(' OR ')})`);
        }
      }
      continue;
    }
    if (key === 'AND') {
      if (Array.isArray(val)) {
        const subClauses = val.map(sub => compileWhere(sub, tableName, params)).filter(Boolean);
        if (subClauses.length > 0) {
          clauses.push(`(${subClauses.join(' AND ')})`);
        }
      }
      continue;
    }

    if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      for (const [op, opVal] of Object.entries(val)) {
        if (op === 'in') {
          if (Array.isArray(opVal)) {
            if (opVal.length === 0) {
              clauses.push('FALSE');
            } else {
              const placeHolders = opVal.map(item => {
                params.push(item);
                return `$${params.length}`;
              }).join(', ');
              clauses.push(`"${key}" IN (${placeHolders})`);
            }
          }
        } else if (op === 'notIn') {
          if (Array.isArray(opVal)) {
            if (opVal.length === 0) {
              clauses.push('TRUE');
            } else {
              const placeHolders = opVal.map(item => {
                params.push(item);
                return `$${params.length}`;
              }).join(', ');
              clauses.push(`"${key}" NOT IN (${placeHolders})`);
            }
          }
        } else if (op === 'lte') {
          params.push(opVal);
          clauses.push(`"${key}" <= $${params.length}`);
        } else if (op === 'gte') {
          params.push(opVal);
          clauses.push(`"${key}" >= $${params.length}`);
        } else if (op === 'lt') {
          params.push(opVal);
          clauses.push(`"${key}" < $${params.length}`);
        } else if (op === 'gt') {
          params.push(opVal);
          clauses.push(`"${key}" > $${params.length}`);
        } else if (op === 'equals') {
          if (opVal === null) {
            clauses.push(`"${key}" IS NULL`);
          } else {
            params.push(opVal);
            clauses.push(`"${key}" = $${params.length}`);
          }
        } else if (op === 'not') {
          if (opVal === null) {
            clauses.push(`"${key}" IS NOT NULL`);
          } else {
            params.push(opVal);
            clauses.push(`"${key}" != $${params.length}`);
          }
        }
      }
    } else {
      if (val === null) {
        clauses.push(`"${key}" IS NULL`);
      } else {
        params.push(val);
        clauses.push(`"${key}" = $${params.length}`);
      }
    }
  }

  return clauses.length > 0 ? clauses.join(' AND ') : '';
}

function compileSelect(select: any): string {
  if (!select) return '*';
  const columns = Object.keys(select).filter(k => select[k]);
  if (columns.length === 0) return '*';
  return columns.map(c => `"${c}"`).join(', ');
}

function compileOrderBy(orderBy: any): string {
  if (!orderBy) return '';
  const orders: string[] = [];
  const items = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const item of items) {
    for (const [key, val] of Object.entries(item)) {
      orders.push(`"${key}" ${String(val).toUpperCase()}`);
    }
  }
  return orders.length > 0 ? `ORDER BY ${orders.join(', ')}` : '';
}

function compileLimitOffset(take: any, skip: any): string {
  let res = '';
  if (take !== undefined && take !== null) {
    res += ` LIMIT ${Number(take)}`;
  }
  if (skip !== undefined && skip !== null) {
    res += ` OFFSET ${Number(skip)}`;
  }
  return res;
}

async function executeCreate(tableName: string, data: any, txOrPrisma: any) {
  const table = tableName;
  let nestedItems: any[] = [];
  const dataCopy = { ...data };
  if (tableName === 'Purchase' && dataCopy.items && dataCopy.items.create) {
    nestedItems = Array.isArray(dataCopy.items.create) ? dataCopy.items.create : [dataCopy.items.create];
    delete dataCopy.items;
  }

  if (!dataCopy.id) {
    dataCopy.id = crypto.randomUUID();
  }
  if (!dataCopy.createdAt) dataCopy.createdAt = new Date();
  if (!dataCopy.updatedAt) dataCopy.updatedAt = new Date();

  if (tableName === 'TallyQueueItem') {
    if (dataCopy.status === undefined) dataCopy.status = 'pending';
    if (dataCopy.priority === undefined) dataCopy.priority = 0;
    if (dataCopy.retryCount === undefined) dataCopy.retryCount = 0;
    if (dataCopy.maxRetries === undefined) dataCopy.maxRetries = 5;
  }

  const columns = Object.keys(dataCopy);
  const params: any[] = [];
  const placeholders = columns.map((col, idx) => {
    let val = dataCopy[col];
    if (col === 'metadata' && val !== null && val !== undefined) {
      params.push(typeof val === 'string' ? val : JSON.stringify(val));
      return `CAST($${idx + 1} AS jsonb)`;
    }
    params.push(val);
    return `$${idx + 1}`;
  });

  const query = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  const result = await txOrPrisma.$queryRawUnsafe(query, ...params);
  const record = result[0];

  if (nestedItems.length > 0 && record) {
    const createdItems = [];
    for (const item of nestedItems) {
      const itemData = {
        ...item,
        purchaseId: record.id,
      };
      const createdItem = await executeCreate('PurchaseItem', itemData, txOrPrisma);
      createdItems.push(createdItem);
    }
    record.items = createdItems;
  }

  return record;
}

async function executeUpdate(tableName: string, where: any, data: any, txOrPrisma: any) {
  const table = tableName;
  const dataCopy = { ...data, updatedAt: new Date() };

  const setClauses: string[] = [];
  const params: any[] = [];

  for (const [col, val] of Object.entries(dataCopy)) {
    let processedVal = val;
    if (val && typeof val === 'object' && !(val instanceof Date)) {
      if ('increment' in val) {
        setClauses.push(`"${col}" = "${col}" + $${params.length + 1}`);
        params.push(val.increment);
        continue;
      } else if ('decrement' in val) {
        setClauses.push(`"${col}" = "${col}" - $${params.length + 1}`);
        params.push(val.decrement);
        continue;
      } else {
        processedVal = JSON.stringify(val);
      }
    }

    if (col === 'metadata' && val !== null && val !== undefined) {
      params.push(typeof val === 'string' ? val : JSON.stringify(val));
      setClauses.push(`"${col}" = CAST($${params.length} AS jsonb)`);
      continue;
    }

    params.push(processedVal);
    setClauses.push(`"${col}" = $${params.length}`);
  }

  const whereParams: any[] = [];
  const whereSql = compileWhere(where, tableName, whereParams);
  
  const offset = params.length;
  const shiftedWhereSql = whereSql.replace(/\$(\d+)/g, (_, num) => {
    return `$${parseInt(num, 10) + offset}`;
  });

  params.push(...whereParams);

  const query = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE ${shiftedWhereSql || 'TRUE'} RETURNING *`;
  const result = await txOrPrisma.$queryRawUnsafe(query, ...params);
  return result[0];
}

async function executeFindFirst(tableName: string, args: any, txOrPrisma: any) {
  const table = tableName;
  const params: any[] = [];
  const whereSql = compileWhere(args?.where, tableName, params);
  const orderSql = compileOrderBy(args?.orderBy);
  const limitOffsetSql = compileLimitOffset(1, args?.skip);
  const selectClause = compileSelect(args?.select);

  const query = `SELECT ${selectClause} FROM "${table}" WHERE ${whereSql || 'TRUE'} ${orderSql} ${limitOffsetSql}`;
  const result = await txOrPrisma.$queryRawUnsafe(query, ...params);
  const record = result[0] || null;

  if (record && args?.include?.items) {
    record.items = await executeFindMany('PurchaseItem', { where: { purchaseId: record.id } }, txOrPrisma);
  }
  return record;
}

async function executeFindMany(tableName: string, args: any, txOrPrisma: any) {
  const table = tableName;
  const params: any[] = [];
  const whereSql = compileWhere(args?.where, tableName, params);
  const orderSql = compileOrderBy(args?.orderBy);
  const limitOffsetSql = compileLimitOffset(args?.take, args?.skip);
  const selectClause = compileSelect(args?.select);

  const query = `SELECT ${selectClause} FROM "${table}" WHERE ${whereSql || 'TRUE'} ${orderSql} ${limitOffsetSql}`;
  const result = await txOrPrisma.$queryRawUnsafe(query, ...params);

  if (args?.include?.items && Array.isArray(result)) {
    for (const record of result) {
      record.items = await executeFindMany('PurchaseItem', { where: { purchaseId: record.id } }, txOrPrisma);
    }
  }
  return result;
}

async function executeCount(tableName: string, args: any, txOrPrisma: any) {
  const table = tableName;
  const params: any[] = [];
  const whereSql = compileWhere(args?.where, tableName, params);

  const query = `SELECT COUNT(*)::int as count FROM "${table}" WHERE ${whereSql || 'TRUE'}`;
  const result = await txOrPrisma.$queryRawUnsafe(query, ...params);
  return result[0]?.count ?? 0;
}

async function executeUpdateMany(tableName: string, args: any, txOrPrisma: any) {
  const table = tableName;
  const dataCopy = { ...args?.data, updatedAt: new Date() };

  const setClauses: string[] = [];
  const params: any[] = [];

  for (const [col, val] of Object.entries(dataCopy)) {
    let processedVal = val;
    if (val && typeof val === 'object' && !(val instanceof Date)) {
      processedVal = JSON.stringify(val);
    }
    params.push(processedVal);
    setClauses.push(`"${col}" = $${params.length}`);
  }

  const whereParams: any[] = [];
  const whereSql = compileWhere(args?.where, tableName, whereParams);
  
  const offset = params.length;
  const shiftedWhereSql = whereSql.replace(/\$(\d+)/g, (_, num) => {
    return `$${parseInt(num, 10) + offset}`;
  });

  params.push(...whereParams);

  const query = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE ${shiftedWhereSql || 'TRUE'}`;
  const result = await txOrPrisma.$executeRawUnsafe(query, ...params);
  return { count: result };
}

async function executeDeleteMany(tableName: string, args: any, txOrPrisma: any) {
  const table = tableName;
  const params: any[] = [];
  const whereSql = compileWhere(args?.where, tableName, params);

  const query = `DELETE FROM "${table}" WHERE ${whereSql || 'TRUE'}`;
  const result = await txOrPrisma.$executeRawUnsafe(query, ...params);
  return { count: result };
}

function createModelProxy(tableName: string, txOrPrisma: any) {
  return {
    findUnique: (args: any) => executeFindFirst(tableName, args, txOrPrisma),
    findFirst: (args: any) => executeFindFirst(tableName, args, txOrPrisma),
    findMany: (args: any) => executeFindMany(tableName, args, txOrPrisma),
    create: (args: any) => executeCreate(tableName, args?.data, txOrPrisma),
    update: (args: any) => executeUpdate(tableName, args?.where, args?.data, txOrPrisma),
    updateMany: (args: any) => executeUpdateMany(tableName, args, txOrPrisma),
    deleteMany: (args: any) => executeDeleteMany(tableName, args, txOrPrisma),
    count: (args: any) => executeCount(tableName, args, txOrPrisma),
  };
}

const MISSING_MODELS = new Set([
  'tallyQueueItem',
  'supplier',
  'expense',
  'purchase',
  'purchaseItem',
  'businessSettings',
  'branch',
  'syncOutbox',
  'syncOutboxLedger',
  'configDirective',
  'configSyncState',
]);

const MODEL_NAME_MAPPING: Record<string, string> = {
  tallyQueueItem: 'TallyQueueItem',
  supplier: 'Supplier',
  expense: 'Expense',
  purchase: 'Purchase',
  purchaseItem: 'PurchaseItem',
  businessSettings: 'BusinessSettings',
  branch: 'Branch',
  syncOutbox: 'SyncOutbox',
  syncOutboxLedger: 'SyncOutboxLedger',
  configDirective: 'ConfigDirective',
  configSyncState: 'ConfigSyncState',
};

function createPrismaProxy(client: any): any {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const propStr = String(prop);
      if (MISSING_MODELS.has(propStr)) {
        const dbTableName = MODEL_NAME_MAPPING[propStr] || propStr;
        return createModelProxy(dbTableName, target);
      }
      if (propStr === '$transaction') {
        return (arg: any, options: any) => {
          if (typeof arg === 'function') {
            const wrappedCallback = async (tx: any) => {
              const proxiedTx = createPrismaProxy(tx);
              return arg(proxiedTx);
            };
            return target.$transaction(wrappedCallback, options);
          }
          return target.$transaction(arg, options);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export const prisma = createPrismaProxy(rawPrisma);