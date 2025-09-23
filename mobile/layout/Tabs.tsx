import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface TabItem {
	name: string;
	route: string;
	icon: keyof typeof FontAwesome.glyphMap;
}

const tabs: TabItem[] = [
	{ name: 'Home', route: '/', icon: 'home' },
	{ name: 'Areas', route: '/areas', icon: 'map-marker' },
	{ name: 'Rooms', route: '/rooms', icon: 'bed' },
	{ name: 'My Bookings', route: '/bookings', icon: 'calendar' },
	{ name: 'Profile', route: '/profile', icon: 'user' },
];

export default function Tabs() {
	const router = useRouter();
	const pathname = usePathname();

	const handleTabPress = (route: string) => {
		router.push(route as any);
	};

	const isActiveTab = (route: string) => {
		if (route === '/') return pathname === '/'
		return pathname === route;
	};

	return (
		<View>
			{/* Main tab container with gradient border */}
			<LinearGradient
				colors={[
					'rgba(139, 92, 246, 0.05)',
					'rgba(124, 58, 237, 0.08)',
				]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
			>
				<View className="flex-row bg-white/95 px-2 py-3 pb-6">
					{tabs.map((tab) => {
						const isActive = isActiveTab(tab.route);

						return (
							<TouchableOpacity
								key={tab.name}
								onPress={() => handleTabPress(tab.route)}
								className="flex-1 items-center justify-center"
								activeOpacity={0.7}
								style={{ minHeight: 60 }}
							>
								<View className="items-center relative px-2 py-1">
									{/* Icon container */}
									<View className="relative mb-1">
										<View
											className={`p-2.5 rounded-xl ${
												isActive ? 'bg-violet-100/80' : 'bg-neutral-100/80'
											}`}
										>
											<FontAwesome
												name={tab.icon}
												size={25}
												color={isActive ? '#7c3aed' : '#78716c'}
											/>
										</View>
									</View>

									{/* Tab label */}
									<Text className={`text-md mt-1 ${isActive
										? 'font-raleway text-md text-violet-600'
										: 'font-raleway text-md text-neutral-600'
									}`}
										numberOfLines={1}
									>
										{tab.name}
									</Text>
								</View>
							</TouchableOpacity>
						);
					})}
				</View>
			</LinearGradient>

			{/* Bottom gradient fade for iPhone gesture area */}
			<LinearGradient
				colors={['rgba(139, 92, 246, 0.03)', 'transparent']}
				start={{ x: 0, y: 1 }}
				end={{ x: 0, y: 0 }}
				className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
			/>
		</View>
	);
}
