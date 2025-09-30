import { useEffect, useState } from 'react';
import { firebaseRealtimeService, AvailabilityUpdate } from '@/services/firebase/index';
import { useQueryClient } from '@tanstack/react-query';

export function useRoomAvailability(roomIds: number[]) {
  const [availabilityUpdates, setAvailabilityUpdates] = useState<AvailabilityUpdate[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (roomIds.length === 0) return;

    const unsubscribe = firebaseRealtimeService.subscribeToRoomAvailability(
      roomIds,
      (updates) => {
        setAvailabilityUpdates(updates);
        
        // Invalidate room queries when availability changes
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        updates.forEach(update => {
          if (update.room_id) {
            queryClient.invalidateQueries({ 
              queryKey: ['room', update.room_id] 
            });
          }
        });
      }
    );

    return unsubscribe;
  }, [roomIds, queryClient]);

  return { availabilityUpdates };
}