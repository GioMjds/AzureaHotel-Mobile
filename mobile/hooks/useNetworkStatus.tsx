import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

interface NetworkStatus {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string | null;
    isOffline: boolean;
    checkConnection: () => Promise<void>;
}

export const useNetworkStatus = (): NetworkStatus => {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isConnected: null,
        isInternetReachable: null,
        type: null,
        isOffline: false,
        checkConnection: async () => {},
    });

    useEffect(() => {
        let isMounted = true;

        const checkNetworkStatus = async () => {
            try {
                const state = await Network.getNetworkStateAsync();
                
                if (isMounted) {
                    const connected = state.isConnected ?? false;
                    const reachable = state.isInternetReachable ?? false;
                    const offline = !connected || reachable === false;

                    setNetworkStatus({
                        isConnected: connected,
                        isInternetReachable: reachable,
                        type: state.type ?? null,
                        isOffline: offline,
                        checkConnection: checkNetworkStatus,
                    });
                }
            } catch (error) {
                console.warn('Failed to get network status:', error);
                if (isMounted) {
                    setNetworkStatus({
                        isConnected: null,
                        isInternetReachable: null,
                        type: null,
                        isOffline: true,
                        checkConnection: checkNetworkStatus,
                    });
                }
            }
        };

        // Initial check
        checkNetworkStatus();

        // Poll for network changes (Expo Network doesn't have event listeners)
        const interval = setInterval(checkNetworkStatus, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    return networkStatus;
};