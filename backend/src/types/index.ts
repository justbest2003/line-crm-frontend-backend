import { Request } from 'express';

/** Express request with authenticated admin payload */
export interface AuthRequest extends Request {
  admin?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/** LINE webhook event from Messaging API */
export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'postback' | string;
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: {
    id: string;
    type: 'text' | 'image' | 'sticker' | 'file' | string;
    text?: string;
    fileName?: string;
    fileSize?: number;
  };
}

/** LINE webhook request body */
export interface LineWebhookBody {
  events: LineWebhookEvent[];
  destination: string;
}

/** LINE user profile from Get Profile API */
export interface LineProfile {
  displayName: string;
  userId: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/** Dashboard summary response */
export interface DashboardSummary {
  totalLeads: number;
  newToday: number;
  byStatus: Record<string, number>;
  last7Days: { date: string; count: number }[];
}

/** Paginated API response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
