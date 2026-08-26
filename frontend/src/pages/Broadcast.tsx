import { useEffect, useState } from 'react';
import { broadcastsApi, tagsApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Megaphone, Send, Loader2 } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Broadcast {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  targetTag: Tag | null;
  sentBy: { id: string; name: string } | null;
  _count: { broadcastLogs: number };
}

export default function Broadcast() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetTagId, setTargetTagId] = useState('');

  useEffect(() => {
    Promise.all([broadcastsApi.list(), tagsApi.list()])
      .then(([bRes, tRes]) => {
        setBroadcasts(bRes.data.data);
        setTags(tRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || sending) return;
    setSending(true);
    try {
      await broadcastsApi.create({
        title,
        content,
        targetTagId: targetTagId || undefined,
      });
      setTitle('');
      setContent('');
      setTargetTagId('');
      // Refresh list
      const res = await broadcastsApi.list();
      setBroadcasts(res.data.data);
    } catch (err) {
      console.error('Broadcast failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-heading">Broadcast</h1>
        <p className="text-sm text-muted-foreground">ส่งข้อความถึงลูกค้าหลายคนพร้อมกัน</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Send form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" />
              ส่ง Broadcast ใหม่
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">หัวข้อ</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อ Broadcast" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">เนื้อหา</label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="ข้อความที่จะส่ง..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">กลุ่มเป้าหมาย</label>
                <select
                  value={targetTagId}
                  onChange={(e) => setTargetTagId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">ส่งทุกคน</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>เฉพาะ tag: {t.name}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'กำลังส่ง...' : 'ส่ง Broadcast'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ประวัติ Broadcast</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>หัวข้อ</TableHead>
                <TableHead>กลุ่มเป้าหมาย</TableHead>
                <TableHead>จำนวน</TableHead>
                <TableHead>ส่งโดย</TableHead>
                <TableHead className="text-right">วันที่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : broadcasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    ยังไม่มีประวัติ
                  </TableCell>
                </TableRow>
              ) : (
                broadcasts.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell>
                      {b.targetTag ? (
                        <Badge variant="outline" style={{ borderColor: b.targetTag.color, color: b.targetTag.color }}>
                          {b.targetTag.name}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">ทุกคน</span>
                      )}
                    </TableCell>
                    <TableCell>{b._count.broadcastLogs}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.sentBy?.name || '—'}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(b.createdAt).toLocaleDateString('th-TH')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
