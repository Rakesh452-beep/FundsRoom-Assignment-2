export const ENQUIRY_STATUSES = ['NEW', 'QUOTED', 'WON', 'LOST'];
export const QUOTATION_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];
export const SO_STATUSES = ['PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED'];

export const STATUS_STYLES = {
  NEW: 'bg-warning-soft text-warning',
  QUOTED: 'bg-night-lineSoft text-bone-muted',
  WON: 'bg-success-soft text-success',
  LOST: 'bg-night-raise text-bone-faint',
  DRAFT: 'bg-night-raise text-bone-faint',
  SENT: 'bg-[#EDF1F5] text-bone-soft',
  ACCEPTED: 'bg-success-soft text-success',
  REJECTED: 'bg-error-soft text-error',
  PENDING: 'bg-warning-soft text-warning',
  CONFIRMED: 'bg-success-soft text-success',
  DISPATCHED: 'bg-line text-bone-soft',
  CANCELLED: 'bg-night-raise text-bone-faint',
};