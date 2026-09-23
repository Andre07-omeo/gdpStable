// src/app/dashboard/commercial/components/index.ts

export { PanneauxTable } from './PanneauxTable';
export { CommercialFilters } from './CommercialFilters';
export { CommercialHeader } from './CommercialHeader';
export { FaceDetailModal } from './FaceDetailModal';
export { default as NotificationModal } from './NotificationModal';  // ✅ CORRIGÉ
export { CartPanel } from './CartPanel';
export { StatsPanel } from './StatsPanel';
export { AdminModal } from './AdminModal';
export { CatalogueContent } from './CatalogueContent';
export { ReportsModal } from './ReportsModal';
export { PredictionsModal } from './PredictionsModal';
export { TeamManagementModal } from './TeamManagementModal';
export { ReservationsManagementModal } from './ReservationsManagementModal';
export { ReservationModal } from './ReservationModal';
export { PanneauReservationsModal } from './PanneauReservationsModal';
export { PendingReservationsTab } from './PendingReservationsTab';
export { LogoutConfirmModal } from './LogoutConfirmModal';
export { ProfileDropdown } from './ProfileDropdown';
// ✅ Nouveaux modals
export { ProlongationModal } from './ProlongationModal';
export { ModificationModal } from './ModificationModal';

export type { CartItem, Currency } from '@/context/CartContext';