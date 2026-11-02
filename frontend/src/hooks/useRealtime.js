import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

/**
 * useRealtime
 * 
 * Connects to the backend SSE stream and listens for events.
 * Automatically invalidates TanStack Query caches based on event types.
 */
export function useRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!user?.kitchenId) return;

    // Connect to SSE stream
    const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "");
    const url = `${apiBase}/api/stream?kitchenId=${user.kitchenId}&userId=${user.email}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ Real-time connection established');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📥 Real-time event received:', data.type, data.payload);

        // Map backend event types to query key invalidations
        switch (data.type) {
          case 'INVENTORY_UPDATED':
            // Invalidate the inventory cache to trigger an automatic refetch
            // Using queryClient.setQueryData for optimistic/direct updates is also possible here,
            // but invalidation is safer and guarantees consistency.
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            break;
            
          case 'ORDER_CREATED':
          case 'ORDER_UPDATED':
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            break;

          case 'MENU_UPDATED':
            queryClient.invalidateQueries({ queryKey: ['menu'] });
            break;

          case 'CUSTOMER_UPDATED':
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            break;

          case 'SUPPLIER_UPDATED':
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            break;
            
          default:
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Real-time connection error:', error);
      eventSource.close();
      
      // Attempt reconnection after 5 seconds
      setTimeout(() => {
        if (user?.kitchenId) {
          // Re-trigger effect (handled loosely here, in production use robust reconnect logic)
        }
      }, 5000);
    };

    return () => {
      if (eventSourceRef.current) {
        console.log('🔌 Closing real-time connection');
        eventSourceRef.current.close();
      }
    };
  }, [user?.kitchenId, user?.email, queryClient]);
}
