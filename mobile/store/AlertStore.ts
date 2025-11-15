import { create } from "zustand";

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
	text: string;
	onPress?: () => void;
	style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
	visible: boolean;
	type: AlertType;
	title: string;
	message?: string;
	buttons?: AlertButton[];
}

interface AlertState {
	alertConfig: AlertConfig;
}

interface AlertActions {
	setAlertConfig: (config: AlertConfig) => void;
	showAlert: (config: Omit<AlertConfig, 'visible'>) => void;
	hideAlert: () => void;
	alert: (
		title: string,
		message?: string,
		buttons?: AlertButton[],
		options?: { type?: AlertType }
	) => void;
}

type AlertStore = AlertState & AlertActions;

const useAlertStore = create<AlertStore>((set) => ({
	// Initial state - matches the pattern in confirm.tsx
	alertConfig: {
		visible: false,
		type: 'info',
		title: '',
		message: '',
		buttons: [],
	},

	// Actions
	setAlertConfig: (config) => {
		set({ alertConfig: config });
	},

	showAlert: (config) => {
		set({
			alertConfig: {
				visible: true,
				type: config.type,
				title: config.title,
				message: config.message,
				buttons: config.buttons || [{ text: 'OK', style: 'default' }],
			},
		});
	},

	hideAlert: () => {
		set((state) => ({
			alertConfig: {
				...state.alertConfig,
				visible: false,
			},
		}));
	},

	// Convenience method similar to Alert.alert API
	alert: (title, message, buttons, options) => {
		set({
			alertConfig: {
				visible: true,
				type: options?.type || 'info',
				title,
				message,
				buttons: buttons || [{ text: 'OK', style: 'default' }],
			},
		});
	},
}));

// Selectors
export const useAlert = () => useAlertStore((state) => state.alertConfig);
export const useAlertActions = () => useAlertStore((state) => ({
	setAlertConfig: state.setAlertConfig,
	showAlert: state.showAlert,
	hideAlert: state.hideAlert,
	alert: state.alert,
}));

export default useAlertStore;