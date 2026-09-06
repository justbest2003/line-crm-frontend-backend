import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customersApi, tagsApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Customer {
  id: string;
  displayName: string | null;
  pictureUrl: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  customerTags: { tag: { id: string; name: string; color: string } }[];
  assignedTo: { id: string; name: string } | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const statusVariant: Record<string, 'new-lead' | 'contacted' | 'qualified' | 'customer' | 'closed-lost'> = {
  new_lead: 'new-lead',
  contacted: 'contacted',
  qualified: 'qualified',
  customer: 'customer',
  closed_lost: 'closed-lost',
};

const statusLabel: Record<string, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  customer: 'Customer',
  closed_lost: 'Closed',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CustomerList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const tag = searchParams.get('tag') || '';
  const search = searchParams.get('search') || '';

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (status) params.status = status;
      if (tag) params.tag = tag;
      if (search) params.search = search;

      const res = await customersApi.list(params);
      setCustomers(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error('โหลดรายชื่อลูกค้าไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [page, status, tag, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    tagsApi.list().then((res) => setTags(res.data)).catch(() => {});
  }, []);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const resetFilters = () => {
    setSearchParams({});
  };

  const hasFilters = status || tag || search;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Customers</h1>
          <p className="text-sm text-muted-foreground">{total} รายชื่อทั้งหมด</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
                className="pl-9"
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
              />
            </div>

            {/* Status filter */}
            <select
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Status</option>
              {Object.entries(statusLabel).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Tag filter */}
            <select
              value={tag}
              onChange={(e) => updateParam('tag', e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground">
                <X className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Tags</TableHead>
              <TableHead className="hidden sm:table-cell">Assigned</TableHead>
              <TableHead className="text-right">Last Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      {c.pictureUrl && <AvatarImage src={c.pictureUrl} alt={c.displayName || ''} />}
                      <AvatarFallback className="text-xs">
                        {c.displayName?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{c.displayName || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status] || 'secondary'}>
                      {statusLabel[c.status] || c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.customerTags.map((ct) => (
                        <Badge key={ct.tag.id} variant="outline" className="text-[10px]" style={{ borderColor: ct.tag.color, color: ct.tag.color }}>
                          {ct.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {c.assignedTo?.name || '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {timeAgo(c.lastMessageAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} items)
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => updateParam('page', String(page + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
