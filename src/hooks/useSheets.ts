import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { PracticeSheet, SheetId } from '@/types/sheets';

export function usePracticeSheet(sheetId: SheetId) {
  return useQuery({
    queryKey: ['sheet', sheetId],
    queryFn: () => apiFetch<PracticeSheet>(`/api/sheets/${sheetId}`),
    staleTime: 5 * 60 * 1000,
  });
}
