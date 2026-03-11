let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
API_BASE_URL = API_BASE_URL.replace(/\/$/, '');
if (!API_BASE_URL.endsWith('/api')) {
  API_BASE_URL = `${API_BASE_URL}/api`;
}

export interface UsageAnalytics {
  period_days: number;
  total_cost_usd: number;
  providers: Array<{
    _id: string;
    total_cost: number;
    total_calls: number;
    total_tokens: number;
  }>;
  daily_trend: Array<{
    _id: string;
    cost: number;
    calls: number;
  }>;
}

export interface InfrastructureCost {
  provider: string;
  amount_usd: number;
  billing_period: string;
}

function buildHeaders(token?: string, email?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Session-Id'] = token;
  }
  if (email) {
    headers['x-user-email'] = email;
  }
  return headers;
}

export async function getUsageAnalytics(days = 30, token?: string, email?: string): Promise<UsageAnalytics> {
  const response = await fetch(`${API_BASE_URL}/analytics/usage?days=${days}`, {
    method: 'GET',
    headers: buildHeaders(token, email),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to fetch usage analytics: ${response.status}`);
  }

  return await response.json();
}

export async function getInfrastructureCosts(months = 3, token?: string, email?: string): Promise<InfrastructureCost[]> {
  const response = await fetch(`${API_BASE_URL}/analytics/infrastructure?months=${months}`, {
    method: 'GET',
    headers: buildHeaders(token, email),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to fetch infrastructure costs: ${response.status}`);
  }

  return await response.json();
}

export async function addInfrastructureCost(
  data: InfrastructureCost,
  token?: string,
  email?: string
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/analytics/infrastructure`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(token, email),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Failed to add infrastructure cost: ${response.status}`);
  }

  return await response.json();
}
