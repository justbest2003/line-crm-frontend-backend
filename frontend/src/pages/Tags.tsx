import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tagsApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { customerTags: number };
}

const presetColors = ['#0E7C86', '#D4923B', '#8B5CF6', '#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#EC4899'];

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0E7C86');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTags = async () => {
    try {
      const res = await tagsApi.list();
      setTags(res.data);
    } catch {
      toast.error('โหลด Tags ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      await tagsApi.create(name, color);
      setName('');
      toast.success('สร้าง Tag สำเร็จ');
      fetchTags();
    } catch {
      toast.error('สร้าง Tag ไม่สำเร็จ');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await tagsApi.remove(deleteTarget.id);
      toast.success('ลบ Tag แล้ว');
      setDeleteTarget(null);
      fetchTags();
    } catch {
      toast.error('ลบ Tag ไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold font-heading">Tags</h1>
          <p className="text-sm text-muted-foreground">จัดการแท็กสำหรับจัดหมวดหมู่ลูกค้า</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          {/* Create form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" />
                สร้าง Tag ใหม่
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ชื่อ Tag</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น VIP, สนใจสินค้า" required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">สี</label>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-7 w-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-ring' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded-full border-0 p-0"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  สร้าง Tag
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tags list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tags ทั้งหมด</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">สี</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      ยังไม่มี Tag
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: t.color }} />
                      </TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground">{t._count?.customerTags ?? 0} คน</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบ Tag</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ tag <span className="font-medium text-foreground">"{deleteTarget?.name}"</span> หรือไม่? การลบจะไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
