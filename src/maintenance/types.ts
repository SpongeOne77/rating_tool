export enum ContractStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING = 'pending',
  TERMINATED = 'terminated',
}

export enum MaintenanceCycleType {
  MONTHLY = 'monthly',
  QUARTER = 'quarterly',
  YEARLY = 'yearly',
}

export interface MaintenanceCycle {
  type: MaintenanceCycleType;
  period: number;
}

export interface Contract {
  id: string;
  customerName: string;
  contractNumber?: string;
  startDate: string;
  endDate: string;
  serviceType: string;
  provider: string;
  amount: number;
  status: ContractStatus;
  maintenanceCycle: MaintenanceCycle;
  nextMaintenanceDate: string;
  isActive: boolean;
}

export interface MaintenanceTask {
  id: string;
  type: 'regular' | 'manual';
  contractId?: string;
  customerName: string;
  dueDate: string;
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createDate: string;
}

export interface ReminderSettings {
  contractExpiryDays: number;
  maintenanceDays: number;
}