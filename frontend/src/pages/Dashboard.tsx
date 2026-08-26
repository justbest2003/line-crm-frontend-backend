import { useEffect, useState } from 'react';
import { dashboardApi, notificationsApi } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, UserCheck, TrendingUp, Bell } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  totalLeads: number;
  newToday: number;
  byStatus: Record<string, number>;
  last7Days: { date: string; count: number }[];
}

interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  customer?: { id: string; displayName: string };
}

const statusConfig: Record<string, { label: string; icon: typeof Users }> = {
  new_lead: { label: 'New Leads', icon: UserPlus },
  contacted: { label: 'Contacted', icon: Users },
  qualified: { label: 'Qualified', icon: UserCheck },
  customer: { label: 'Customers', icon: TrendingUp },
  closed_lost: { label: 'Closed', icon: Users },
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.summary(),
      notificationsApi.list(true),
    ]).then(([summaryRes, notifRes]) => {
      setData(summaryRes.data);
      setNotifications(notifRes.data.data?.slice(0, 5) || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

  const chartData = data.last7Days.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('th-TH', { weekday: 'short' }),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
        <p className="text-muted-foreground">สวัสดี, {admin.name || 'Admin'}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold font-heading">{data.totalLeads}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New today — highlighted with honey accent */}
        <Card className="border-l-4 border-l-honey">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Today</p>
                <p className="text-3xl font-bold font-heading text-honey">{data.newToday}</p>
              </div>
              <div className="rounded-lg bg-honey/10 p-2.5">
                <UserPlus className="h-5 w-5 text-honey" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qualified */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Qualified</p>
                <p className="text-3xl font-bold font-heading">{data.byStatus.qualified || 0}</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-2.5">
                <UserCheck className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="text-3xl font-bold font-heading text-line-green">{data.byStatus.customer || 0}</p>
              </div>
              <div className="rounded-lg bg-line-green/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-line-green" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New Leads — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E7C86" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0E7C86" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(214, 12%, 48%)' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(214, 12%, 48%)' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#0E7C86" strokeWidth={2} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">ไม่มีแจ้งเตือนใหม่</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-2">
                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-muted' : 'bg-honey'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug truncate">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(n.createdAt).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant={n.type === 'new_lead' ? 'new-lead' : n.type === 'needs_human' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                      {n.type === 'new_lead' ? 'New' : n.type === 'needs_human' ? 'Escalate' : n.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
