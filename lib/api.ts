export async function fetchBotStats(params: { offset: number; limit: number; start_date?: string; end_date?: string }) {
  const queryParams = new URLSearchParams({
    offset: params.offset.toString(),
    limit: params.limit.toString(),
  });
  if (params.start_date) queryParams.append("start_date", params.start_date);
  if (params.end_date) queryParams.append("end_date", params.end_date);

  const response = await fetch(`/api/logs?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch bot stats: ${response.status} ${response.statusText}`);
  }
  return response.json();
} 