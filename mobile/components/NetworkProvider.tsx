import { createContext, useContext, ReactNode } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import OfflineSuspense from '@/components/ui/OfflineSuspense';

interface NetworkContextType {
	isConnected: boolean | null;
	isInternetReachable: boolean | null;
	isOffline: boolean | null;
	type: string | null;
	checkConnection: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
	const context = useContext(NetworkContext);
	if (!context) {
		throw new Error('useNetwork must be used within NetworkProvider');
	}
	return context;
};

interface NetworkProviderProps {
	children: ReactNode;
	showOfflineUI?: boolean;
}

export const NetworkProvider = ({ 
	children, 
	showOfflineUI = true 
}: NetworkProviderProps) => {
	const networkStatus = useNetworkStatus();

	return (
		<NetworkContext.Provider value={networkStatus}>
			{children}
			{showOfflineUI && (
				<OfflineSuspense
					isOffline={networkStatus.isOffline}
					onRetry={networkStatus.checkConnection}
				/>
			)}
		</NetworkContext.Provider>
	);
};
