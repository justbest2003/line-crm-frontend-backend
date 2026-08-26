import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersApi, tagsApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, Bot, User, Plus, X, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  customerTags: { tag: { id: string; name: string; color: string } }[];
  assignedTo: { id: string; name: string; email: string } | null;
}

interface Message {
  id: string;
  senderType: 'customer' | 'bot' | 'admin';
  content: string;
  messageType: string;
  createdAt: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Conversation {
  handledBy: 'bot' | 'human';
}

const statusOptions = ['new_lead', 'contacted', 'qualified', 'customer', 'closed_lost'];
const statusLabel: Record<string, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  customer: 'Customer',
  closed_lost: 'Closed Lost',
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [handledBy, setHandledBy] = useState<'bot' | 'human'>('bot');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [custRes, msgRes, tagsRes] = await Promise.all([
        customersApi.getById(id),
        customersApi.getMessages(id),
        tagsApi.list(),
      ]);
      setCustomer(custRes.data);
      setMessages(msgRes.data.data);
      setTags(tagsRes.data);
      setNotes(custRes.data.notes || '');
    } catch (err) {
      console.error('Failed to fetch customer:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    // Poll for new messages
    const interval = setInterval(async () => {
      if (!id) return;
      try {
        const res = await customersApi.getMessages(id);
        setMessages(res.data.data);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData, id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !id || sending) return;
    setSending(true);
    try {
      await customersApi.reply(id, replyText);
      setReplyText('');
      const res = await customersApi.getMessages(id);
      setMessages(res.data.data);
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleTakeover = async () => {
    if (!id) return;
    try {
      await customersApi.takeover(id);
      setHandledBy('human');
    } catch (err) {
      console.error('Takeover failed:', err);
    }
  };

  const handleRelease = async () => {
    if (!id) return;
    try {
      await customersApi.release(id);
      setHandledBy('bot');
    } catch (err) {
      console.error('Release failed:', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const res = await customersApi.update(id, { status: newStatus });
      setCustomer(res.data);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      await customersApi.update(id, { notes });
    } catch (err) {
      console.error('Save notes failed:', err);
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (!id) return;
    try {
      await customersApi.addTag(id, tagId);
      const res = await customersApi.getById(id);
      setCustomer(res.data);
      setShowTagPicker(false);
    } catch {}
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!id) return;
    try {
      await customersApi.removeTag(id, tagId);
      const res = await customersApi.getById(id);
      setCustomer(res.data);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return <p className="text-center text-muted-foreground py-8">Customer not found</p>;
  }

  const assignedTags = customer.customerTags.map((ct) => ct.tag);
  const availableTags = tags.filter((t) => !assignedTags.some((at) => at.id === t.id));

  return (
    <div className="animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          {customer.pictureUrl && <AvatarImage src={customer.pictureUrl} />}
          <AvatarFallback>{customer.displayName?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-heading font-semibold text-lg leading-tight">{customer.displayName || 'Unknown'}</h1>
          <p className="text-xs text-muted-foreground">
            {statusLabel[customer.status]} · {customer.source || 'LINE OA'}
          </p>
        </div>
      </div>

      {/* Main: Chat + Info panel */}
      <div className="flex-1 grid gap-4 lg:grid-cols-[2fr_1fr] min-h-0">
        {/* Chat panel */}
        <Card className="flex flex-col min-h-0">
          <CardContent className="flex-1 overflow-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">ยังไม่มีข้อความ</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    msg.senderType === 'customer'
                      ? 'bg-secondary text-secondary-foreground rounded-bl-sm'
                      : msg.senderType === 'bot'
                        ? 'bg-primary/10 text-foreground rounded-br-sm'
                        : 'bg-primary text-primary-foreground rounded-br-sm'
                  }`}
                >
                  {msg.senderType !== 'customer' && (
                    <span className="flex items-center gap-1 text-[10px] opacity-70 mb-0.5">
                      {msg.senderType === 'bot' ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {msg.senderType === 'bot' ? 'Bot' : 'Admin'}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.senderType === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </CardContent>

          {/* Reply input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              placeholder={handledBy === 'human' ? 'พิมพ์ข้อความ...' : 'Bot กำลังตอบอัตโนมัติ — กด Takeover เพื่อตอบเอง'}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
              disabled={handledBy === 'bot'}
            />
            <Button size="icon" onClick={handleSendReply} disabled={handledBy === 'bot' || sending || !replyText.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </Card>

        {/* Info panel */}
        <div className="space-y-4 overflow-auto">
          {/* Handled by / Takeover */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">Chat Mode</p>
              <div className="flex gap-2">
                <Button
                  variant={handledBy === 'bot' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={handleRelease}
                >
                  <Bot className="h-3.5 w-3.5" /> Bot
                </Button>
                <Button
                  variant={handledBy === 'human' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={handleTakeover}
                >
                  <User className="h-3.5 w-3.5" /> Takeover
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer info */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={customer.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="mt-1 w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{statusLabel[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone</label>
                <p className="text-sm">{customer.phone || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <p className="text-sm">{customer.email || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Source</label>
                <p className="text-sm">{customer.source || 'LINE OA'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Assigned To</label>
                <p className="text-sm">{customer.assignedTo?.name || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Created</label>
                <p className="text-sm">{new Date(customer.createdAt).toLocaleDateString('th-TH')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="บันทึกเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
              />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Tags</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowTagPicker(!showTagPicker)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-1.5">
                {assignedTags.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className="gap-1 pr-1"
                    style={{ borderColor: t.color, color: t.color }}
                  >
                    {t.name}
                    <button onClick={() => handleRemoveTag(t.id)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
                {assignedTags.length === 0 && <p className="text-xs text-muted-foreground">No tags</p>}
              </div>

              {/* Tag picker dropdown */}
              {showTagPicker && availableTags.length > 0 && (
                <div className="mt-2 rounded-md border bg-popover p-1.5 space-y-0.5">
                  {availableTags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleAddTag(t.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
