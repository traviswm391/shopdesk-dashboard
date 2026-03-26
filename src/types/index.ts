export interface BusinessHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface Shop {
  id: string;
  clerk_user_id: string;
  name: string;
  address?: string;
  phone_display?: string;
  phone_number?: string;
  greeting?: string;
  services: string[];
  declined_services?: string[];
  business_hours: BusinessHours;
  retell_agent_id?: string;
  subscription_status: string;
  agent_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  shop_id: string;
  retell_call_id?: string;
  caller_number?: string;
  called_number?: string;
  status: "in_progress" | "completed" | "failed";
  transcript?: string;
  summary?: string;
  duration_seconds?: number;
  appointment_booked: boolean;
  created_at: string;
  ended_at?: string;
}

export interface CallStats {
  total_calls: number;
  appointments_booked: number;
  conversion_rate: number;
  avg_duration_seconds: number;
}
