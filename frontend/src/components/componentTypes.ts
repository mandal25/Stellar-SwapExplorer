import type { useOrderbook } from '../hooks/useOrderbook'
export type ReturnTypeUseOrderbook = ReturnType<typeof useOrderbook>
import type { useAnalyticsStats } from '../hooks/useAnalyticsStats'
import type { useManualRecovery } from '../hooks/useManualRecovery'
export type ReturnTypeOfStats = ReturnType<typeof useAnalyticsStats>
export type ReturnTypeOfRecovery = ReturnType<typeof useManualRecovery>
