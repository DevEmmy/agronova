const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── Token management ────────────────────────────────────────────────────────
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('agriflow_token');
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('agriflow_token', accessToken);
  localStorage.setItem('agriflow_refresh', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('agriflow_token');
  localStorage.removeItem('agriflow_refresh');
  localStorage.removeItem('agriflow_farm');
};

export const getActiveFarmId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('agriflow_farm');
};

export const setActiveFarmId = (farmId: string) => {
  localStorage.setItem('agriflow_farm', farmId);
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.body && !(fetchOptions.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const refreshToken = localStorage.getItem('agriflow_refresh');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const { data } = await refreshRes.json();
          setTokens(data.accessToken, data.refreshToken);
          headers['Authorization'] = `Bearer ${data.accessToken}`;
          const retryRes = await fetch(`${BASE_URL}${endpoint}`, { ...fetchOptions, headers });
          if (!retryRes.ok) {
            const err = await retryRes.json();
            throw new Error(err.message || 'Request failed');
          }
          return retryRes.json();
        }
      } catch {
        clearTokens();
        window.location.href = '/auth';
      }
    } else {
      clearTokens();
      window.location.href = '/auth';
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  requestMagicLink: (email: string, name?: string) =>
    apiFetch('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email, name }), skipAuth: true }),

  verifyMagicLink: (token: string, email: string) =>
    apiFetch<{ data: { accessToken: string; refreshToken: string; user: User; farms: FarmMembership[]; hasCompletedOnboarding: boolean } }>(
      '/auth/verify-magic-link',
      { method: 'POST', body: JSON.stringify({ token, email }), skipAuth: true }
    ),

  acceptInvite: (token: string, email: string, name?: string) =>
    apiFetch<{ data: { accessToken: string; refreshToken: string; user: User; farm: Farm; role: string } }>(
      '/auth/accept-invite',
      { method: 'POST', body: JSON.stringify({ token, email, name }), skipAuth: true }
    ),

  getMe: () => apiFetch<{ data: { user: User; farms: FarmMembership[] } }>('/auth/me'),

  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  updateProfile: (data: { name?: string; avatar?: string }) =>
    apiFetch('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Farm API ─────────────────────────────────────────────────────────────────
export const farmApi = {
  create: (data: { name: string; description?: string; location?: string; livestockTypes?: string[] }) =>
    apiFetch<{ data: Farm }>('/farms', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => apiFetch<{ data: Farm[] }>('/farms'),

  get: (farmId: string) => apiFetch<{ data: Farm }>(`/farms/${farmId}`),

  update: (farmId: string, data: Partial<Farm>) =>
    apiFetch<{ data: Farm }>(`/farms/${farmId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  updateSettings: (farmId: string, settings: Partial<FarmSettings>) =>
    apiFetch<{ data: FarmSettings }>(`/farms/${farmId}/settings`, { method: 'PATCH', body: JSON.stringify(settings) }),

  joinByCode: (inviteCode: string) =>
    apiFetch<{ data: Farm }>('/farms/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),

  regenerateCode: (farmId: string) =>
    apiFetch<{ data: { inviteCode: string } }>(`/farms/${farmId}/regenerate-code`, { method: 'POST' }),
};

// ─── Batch API ────────────────────────────────────────────────────────────────
export const batchApi = {
  getAll: (farmId: string, params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ data: Batch[]; meta: PaginationMeta }>(`/farms/${farmId}/batches${q}`);
  },

  create: (farmId: string, data: CreateBatchData) =>
    apiFetch<{ data: Batch }>(`/farms/${farmId}/batches`, { method: 'POST', body: JSON.stringify(data) }),

  get: (farmId: string, batchId: string) =>
    apiFetch<{ data: Batch }>(`/farms/${farmId}/batches/${batchId}`),

  update: (farmId: string, batchId: string, data: Partial<Batch>) =>
    apiFetch<{ data: Batch }>(`/farms/${farmId}/batches/${batchId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  addWeight: (farmId: string, batchId: string, data: { recordedWeight: number; recordedCount: number; notes?: string }) =>
    apiFetch<{ data: Batch }>(`/farms/${farmId}/batches/${batchId}/weight`, { method: 'POST', body: JSON.stringify(data) }),

  delete: (farmId: string, batchId: string) =>
    apiFetch(`/farms/${farmId}/batches/${batchId}`, { method: 'DELETE' }),

  getStats: (farmId: string) =>
    apiFetch<{ data: BatchStats }>(`/farms/${farmId}/batches/stats`),
};

// ─── Feed API ─────────────────────────────────────────────────────────────────
export const feedApi = {
  getAll: (farmId: string, params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ data: FeedItem[]; meta: { summary: FeedSummary } }>(`/farms/${farmId}/feed${q}`);
  },

  create: (farmId: string, data: CreateFeedItemData) =>
    apiFetch<{ data: FeedItem }>(`/farms/${farmId}/feed`, { method: 'POST', body: JSON.stringify(data) }),

  get: (farmId: string, itemId: string) =>
    apiFetch<{ data: FeedItem }>(`/farms/${farmId}/feed/${itemId}`),

  update: (farmId: string, itemId: string, data: Partial<FeedItem>) =>
    apiFetch<{ data: FeedItem }>(`/farms/${farmId}/feed/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  log: (farmId: string, itemId: string, data: FeedLogData) =>
    apiFetch<{ data: FeedItem }>(`/farms/${farmId}/feed/${itemId}/log`, { method: 'POST', body: JSON.stringify(data) }),

  getHistory: (farmId: string, itemId: string) =>
    apiFetch(`/farms/${farmId}/feed/${itemId}/history`),

  delete: (farmId: string, itemId: string) =>
    apiFetch(`/farms/${farmId}/feed/${itemId}`, { method: 'DELETE' }),
};

// ─── Finance API ──────────────────────────────────────────────────────────────
export const financeApi = {
  getAll: (farmId: string, params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ data: Transaction[]; meta: { pagination: PaginationMeta; summary: FinanceSummary } }>(`/farms/${farmId}/finances${q}`);
  },

  create: (farmId: string, data: CreateTransactionData) =>
    apiFetch<{ data: Transaction }>(`/farms/${farmId}/finances`, { method: 'POST', body: JSON.stringify(data) }),

  update: (farmId: string, txId: string, data: Partial<Transaction>) =>
    apiFetch<{ data: Transaction }>(`/farms/${farmId}/finances/${txId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (farmId: string, txId: string) =>
    apiFetch(`/farms/${farmId}/finances/${txId}`, { method: 'DELETE' }),

  export: (farmId: string, format: 'xlsx' | 'csv' = 'xlsx') =>
    `${BASE_URL}/farms/${farmId}/finances/export?format=${format}&token=${getToken()}`,

  getAnalytics: (farmId: string, months = 6) =>
    apiFetch<{ data: FinancialAnalytics }>(`/farms/${farmId}/finances/analytics?months=${months}`),
};

// ─── Team API ─────────────────────────────────────────────────────────────────
export const teamApi = {
  getAll: (farmId: string) =>
    apiFetch<{ data: TeamMember[] }>(`/farms/${farmId}/team`),

  invite: (farmId: string, email: string, role: string) =>
    apiFetch(`/farms/${farmId}/team/invite`, { method: 'POST', body: JSON.stringify({ email, role }) }),

  acceptInvite: (token: string, email: string) =>
    apiFetch(`/farms/${teamMemberPlaceholder}/team/accept-invite`, { method: 'POST', body: JSON.stringify({ token, email }) }),

  updateRole: (farmId: string, memberId: string, data: { role?: string; status?: string }) =>
    apiFetch(`/farms/${farmId}/team/${memberId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  remove: (farmId: string, memberId: string) =>
    apiFetch(`/farms/${farmId}/team/${memberId}`, { method: 'DELETE' }),
};
// Accept invite doesn't need farmId
const teamMemberPlaceholder = 'placeholder'; // handled by server routing

// ─── AI API ───────────────────────────────────────────────────────────────────
export const aiApi = {
  agriSnap: async (farmId: string, imageFile: File): Promise<AgriSnapResult> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const res = await apiFetch<{ data: AgriSnapResult }>(`/farms/${farmId}/ai/agrisnap`, {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },

  agriTalk: async (farmId: string, audioFile?: File, transcript?: string): Promise<AgriTalkResult> => {
    if (audioFile) {
      const formData = new FormData();
      formData.append('audio', audioFile);
      const res = await apiFetch<{ data: AgriTalkResult }>(`/farms/${farmId}/ai/agritalk`, {
        method: 'POST',
        body: formData,
      });
      return res.data;
    } else if (transcript) {
      const res = await apiFetch<{ data: AgriTalkResult }>(`/farms/${farmId}/ai/agritalk`, {
        method: 'POST',
        body: JSON.stringify({ transcript }),
      });
      return res.data;
    }
    throw new Error('Audio file or transcript is required');
  },

  applyRecords: (farmId: string, records: ExtractedRecord[]) =>
    apiFetch(`/farms/${farmId}/ai/agrisnap/apply`, { method: 'POST', body: JSON.stringify({ records }) }),

  chat: (farmId: string, question: string) =>
    apiFetch<{ data: { question: string; answer: string } }>(`/farms/${farmId}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
};

// ─── Analytics API ────────────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboard: (farmId: string) =>
    apiFetch<{ data: DashboardStats }>(`/farms/${farmId}/analytics/dashboard`),

  getInsights: (farmId: string) =>
    apiFetch<{ data: InsightResult }>(`/farms/${farmId}/analytics/insights`),

  getProduction: (farmId: string, days = 30) =>
    apiFetch(`/farms/${farmId}/analytics/production?days=${days}`),

  getNotifications: (farmId: string, unreadOnly = false) =>
    apiFetch<{ data: Notification[] }>(`/farms/${farmId}/analytics/notifications?unreadOnly=${unreadOnly}`),

  markRead: (farmId: string, notifId: string) =>
    apiFetch(`/farms/${farmId}/analytics/notifications/${notifId}/read`, { method: 'PATCH' }),

  markAllRead: (farmId: string) =>
    apiFetch(`/farms/${farmId}/analytics/notifications/read-all`, { method: 'PATCH' }),
};

// ─── Type Definitions ─────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  isVerified: boolean;
  lastLoginAt?: string;
}

export interface FarmSettings {
  feedVarianceTolerance: number;
  predictiveHorizonDays: number;
  agriSnapEnabled: boolean;
  agriTalkEnabled: boolean;
  insightEngineEnabled: boolean;
  timezone: string;
  currency: string;
}

export interface Farm {
  _id: string;
  name: string;
  owner: User | string;
  description?: string;
  location?: string;
  livestockTypes: string[];
  inviteCode: string;
  settings: FarmSettings;
  isActive: boolean;
  memberRole?: string;
  createdAt: string;
}

export interface FarmMembership {
  farm: Farm;
  role: string;
  joinedAt?: string;
}

export interface Batch {
  _id: string;
  farm: string;
  batchCode: string;
  species: string;
  breed: string;
  initialCount: number;
  currentCount: number;
  ageWeeks: number;
  avgWeightKg: number;
  status: 'healthy' | 'warning' | 'critical' | 'harvested' | 'sold';
  expectedHarvestDate?: string;
  notes?: string;
  createdBy: User | string;
  createdAt: string;
}

export interface CreateBatchData {
  species: string;
  breed: string;
  initialCount: number;
  ageWeeks?: number;
  expectedHarvestDate?: string;
  notes?: string;
  source?: string;
}

export interface BatchStats {
  summary: {
    totalBatches: number;
    totalAnimals: number;
    healthyBatches: number;
    warningBatches: number;
    criticalBatches: number;
    avgWeight: number;
  };
  bySpecies: Array<{ _id: string; count: number; totalAnimals: number }>;
}

export interface FeedItem {
  _id: string;
  farm: string;
  name: string;
  category: string;
  stockLevel: number;
  capacityLevel: number;
  unit: string;
  reorderPoint: number;
  status: 'optimal' | 'warning' | 'critical' | 'out_of_stock';
  costPerUnit?: number;
  supplier?: string;
  createdAt: string;
}

export interface CreateFeedItemData {
  name: string;
  category: string;
  stockLevel?: number;
  capacityLevel?: number;
  unit?: string;
  reorderPoint?: number;
  costPerUnit?: number;
  supplier?: string;
}

export interface FeedLogData {
  type: 'delivery' | 'consumption' | 'adjustment' | 'waste';
  quantity: number;
  supplierInvoice?: string;
  notes?: string;
}

export interface FeedSummary {
  total: number;
  optimal: number;
  warning: number;
  critical: number;
  outOfStock: number;
}

export interface Transaction {
  _id: string;
  farm: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  description: string;
  status: 'completed' | 'pending' | 'cancelled';
  date: string;
  reference?: string;
  createdBy: User | string;
  createdAt: string;
}

export interface CreateTransactionData {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  status?: string;
  date?: string;
  reference?: string;
  tags?: string[];
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  profitMargin: string;
}

export interface FinancialAnalytics {
  monthlyTrend: Array<{ _id: { year: number; month: number; type: string }; total: number }>;
  byCategory: Array<{ _id: { category: string; type: string }; total: number; count: number }>;
}

export interface TeamMember {
  _id: string;
  farm: string;
  user?: User;
  inviteEmail: string;
  role: 'owner' | 'manager' | 'worker' | 'consultant';
  status: 'active' | 'pending' | 'suspended';
  joinedAt?: string;
  createdAt: string;
}

export interface ExtractedRecord {
  type: 'batch' | 'feed' | 'health' | 'finance' | 'reproduction' | 'general';
  rawLine: string;
  data: Record<string, unknown>;
}

export interface AgriSnapResult {
  extractedRecords: ExtractedRecord[];
  rawText: string;
  confidence: number;
  suggestions: string[];
  documentType: string;
}

export interface AgriTalkResult {
  transcript: string;
  parsedRecords: ExtractedRecord[];
  intent: string;
  confidence: number;
  suggestedActions: string[];
}

export interface DashboardStats {
  healthScore: number;
  batches: {
    totalBatches: number;
    totalAnimals: number;
    healthy: number;
    warning: number;
    critical: number;
  };
  feed: {
    total: number;
    critical: number;
    outOfStock: number;
  };
  finances: {
    income: number;
    expenses: number;
    profit: number;
    profitMargin: string;
  };
  recentActivity: ActivityLog[];
  unreadNotifications: number;
}

export interface ActivityLog {
  _id: string;
  farm: string;
  user: User | { name: string; avatar?: string };
  action: string;
  details: string;
  createdAt: string;
}

export interface InsightResult {
  insights: FarmInsight[];
  summary: string;
  healthScore: number;
  generatedAt: string;
}

export interface FarmInsight {
  type: 'warning' | 'info' | 'critical' | 'success';
  category: string;
  title: string;
  message: string;
  actionLabel?: string;
  daysUntilIssue?: number;
  confidence: number;
}

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

export interface PaginationMeta {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
