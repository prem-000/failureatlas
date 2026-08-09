import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

export interface ChatGPTIntegrationData {
  connected: boolean;
  connectedAt: string | null;
  scopes: string[];
  userEmail?: string;
}

export function useChatGPTIntegration() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['integrations', 'chatgpt'],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: ChatGPTIntegrationData }>(
        '/api/integrations/chatgpt'
      );
      return res.data;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ success: boolean; data: ChatGPTIntegrationData }>(
        '/api/integrations/chatgpt',
        { method: 'POST' }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'chatgpt'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{
        success: boolean;
        message: string;
        data: ChatGPTIntegrationData;
      }>('/api/integrations/chatgpt', { method: 'DELETE' });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'chatgpt'] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    connectToChatGPT: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error,
    disconnectFromChatGPT: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
    disconnectError: disconnectMutation.error,
    refetch: query.refetch,
  };
}
