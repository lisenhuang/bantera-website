import { redirect } from 'next/navigation';
import { getAccessToken } from '@/lib/dashboard-api';
import { getApiBaseUrl } from '@/lib/bantera-api';
import ModelTests from './model-tests';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const token = await getAccessToken();
  if (!token) redirect('/dashboard/login');
  const response = await fetch(`${getApiBaseUrl()}/api/admin/model-tests/status`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (response.status === 401 || response.status === 403) redirect('/dashboard/login');
  return <ModelTests />;
}
