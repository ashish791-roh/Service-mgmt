export interface RbacRule {
  pattern: RegExp;
  methods: Record<string, ('admin' | 'reception' | 'engineer' | 'super_admin')[]>;
}

export const RBAC_RULES: RbacRule[] = [
  // Local validation route
  {
    pattern: /^\/api\/auth\/session-check$/,
    methods: {
      POST: ['admin', 'reception', 'engineer', 'super_admin']
    }
  },
  // Users Management
  {
    pattern: /^\/api\/users$/,
    methods: {
      GET: ['admin'],
      POST: ['admin']
    }
  },
  {
    pattern: /^\/api\/users\/[^/]+$/,
    methods: {
      GET: ['admin'],
      PUT: ['admin'],
      DELETE: ['admin']
    }
  },
  // Webhooks
  {
    pattern: /^\/api\/webhooks$/,
    methods: {
      GET: ['admin'],
      POST: ['admin']
    }
  },
  {
    pattern: /^\/api\/webhooks\/[^/]+$/,
    methods: {
      GET: ['admin'],
      PUT: ['admin'],
      DELETE: ['admin']
    }
  },
  {
    pattern: /^\/api\/webhooks\/test$/,
    methods: {
      POST: ['admin']
    }
  },
  // Business Settings
  {
    pattern: /^\/api\/business-settings$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      PUT: ['admin']
    }
  },
  // Branches
  {
    pattern: /^\/api\/branches$/,
    methods: {
      GET: ['admin'],
      POST: ['admin']
    }
  },
  // SLA / Warranty Config
  {
    pattern: /^\/api\/sla-config$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      PUT: ['admin']
    }
  },
  {
    pattern: /^\/api\/warranty-config$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      PUT: ['admin']
    }
  },
  // Devices
  {
    pattern: /^\/api\/devices$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      POST: ['admin', 'reception']
    }
  },
  {
    pattern: /^\/api\/devices\/[^/]+$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      PUT: ['admin', 'reception'],
      DELETE: ['admin']
    }
  },
  // Customers
  {
    pattern: /^\/api\/customers$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      POST: ['admin', 'reception']
    }
  },
  {
    pattern: /^\/api\/customers\/[^/]+$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      PUT: ['admin', 'reception'],
      DELETE: ['admin']
    }
  },
  // Jobs
  {
    pattern: /^\/api\/jobs$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      POST: ['admin', 'reception']
    }
  },
  {
    pattern: /^\/api\/jobs\/[^/]+$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      PUT: ['admin', 'reception'],
      PATCH: ['engineer'],
      DELETE: ['admin', 'reception']
    }
  },
  {
    pattern: /^\/api\/jobs\/[^/]+\/photos$/,
    methods: {
      POST: ['admin', 'reception', 'engineer']
    }
  },
  {
    pattern: /^\/api\/jobs\/[^/]+\/sla-check$/,
    methods: {
      GET: ['admin', 'reception', 'engineer']
    }
  },
  // Parts Request
  {
    pattern: /^\/api\/parts$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      POST: ['admin', 'reception', 'engineer']
    }
  },
  {
    pattern: /^\/api\/parts\/[^/]+$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      PUT: ['admin', 'reception'],
      DELETE: ['admin', 'reception']
    }
  },
  // Payments
  {
    pattern: /^\/api\/payments$/,
    methods: {
      GET: ['admin', 'reception'],
      POST: ['admin', 'reception']
    }
  },
  // Expenses
  {
    pattern: /^\/api\/expenses$/,
    methods: {
      GET: ['admin'],
      POST: ['admin'],
      PUT: ['admin'],
      DELETE: ['admin']
    }
  },
  // Purchases
  {
    pattern: /^\/api\/purchases$/,
    methods: {
      GET: ['admin'],
      POST: ['admin']
    }
  },
  // Sales
  {
    pattern: /^\/api\/sales$/,
    methods: {
      GET: ['admin', 'reception'],
      POST: ['admin', 'reception']
    }
  },
  // Web uploads
  {
    pattern: /^\/api\/uploads\/.*$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      POST: ['admin', 'reception', 'engineer']
    }
  },
  // Notifications
  {
    pattern: /^\/api\/notifications$/,
    methods: {
      GET: ['admin', 'reception', 'engineer'],
      POST: ['admin'],
      PUT: ['admin', 'reception', 'engineer']
    }
  },
  {
    pattern: /^\/api\/notifications\/stream$/,
    methods: {
      GET: ['admin', 'reception', 'engineer']
    }
  },
  // Tally Accounting
  {
    pattern: /^\/api\/tally\/.*$/,
    methods: {
      GET: ['admin'],
      POST: ['admin'],
      PUT: ['admin'],
      DELETE: ['admin']
    }
  }
];

export function checkAccess(pathname: string, method: string, role: string): boolean {
  if (role === 'super_admin') return true;

  const rule = RBAC_RULES.find(r => r.pattern.test(pathname));
  if (!rule) {
    // Fallback to allow any authenticated user for unlisted API paths
    console.warn(`[RBAC] Warning: No explicit rule for path "${pathname}". Allowing all authenticated roles by default.`);
    return true;
  }

  const allowedRoles = rule.methods[method.toUpperCase()];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(role as any);
}
