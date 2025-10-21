import React, { useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useTabVisibilityStore } from '@/store/ScrollStore';
import StyledText from '@/components/ui/StyledText';

interface TabItem {
	name: string;
	route: string;
	icon: keyof typeof FontAwesome.glyphMap;
}

const tabs: TabItem[] = [
	{ name: 'My Bookings', route: '/', icon: 'calendar' },
	{ name: 'Areas', route: '/areas', icon: 'map-marker' },
	{ name: 'Rooms', route: '/rooms', icon: 'bed' },
];

const Tabs = () => {
	const router = useRouter();
	const pathname = usePathname();

	const tabState = useTabVisibilityStore((state) => state.state);
	const translateY = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(translateY, {
			toValue: tabState === 'hidden' ? 84 : 0,
			duration: 250,
			useNativeDriver: true,
		}).start();
	}, [tabState, translateY]);

	const isActiveTab = useCallback(
		(route: string) => {
			if (route === '/') return pathname === '/';
			return pathname === route;
		},
		[pathname]
	);

	const handleTabPress = useCallback(
		(route: string) => {
			if (isActiveTab(route)) return;
			router.push(route as any);
		},
		[isActiveTab, router]
	);

	return (
		<>
			{/* Spacer to prevent page content from being hidden behind the absolute tab bar */}
			<Animated.View
				style={{
					transform: [{ translateY }],
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
				}}
				pointerEvents="box-none"
			>
				{/* Floating translucent container that sits above content */}
				<View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
					<View
						className="rounded-2xl overflow-hidden bg-background-elevated"
						style={{
							marginHorizontal: 16,
							shadowColor: '#000',
							shadowOffset: { width: 0, height: -2 },
							shadowOpacity: 0.08,
							shadowRadius: 8,
							elevation: 8,
							borderWidth: 0,
						}}
					>
						<View className="flex-row p-2">
							{tabs.map((tab) => {
								const isActive = isActiveTab(tab.route);

								return (
									<TouchableOpacity
										key={tab.name}
										onPress={() => handleTabPress(tab.route)}
										className="flex-1 items-center justify-center"
										activeOpacity={0.75}
										disabled={isActive}
										accessibilityState={{ selected: isActive, disabled: isActive }}
									>
										<View className="items-center relative p-2">
											<View className="relative">
												{isActive ? (
													<View className="px-6 py-2">
														<FontAwesome name={tab.icon} size={26} color="#6F00FF" />
													</View>
												) : (
													<View className="px-6 py-2">
														<FontAwesome name={tab.icon} size={26} color="#A8A29E" />
													</View>
												)}
											</View>

											<StyledText
												variant={isActive ? 'playfair-bold' : 'playfair-regular'}
												className={
													isActive ? 'text-brand-primary text-md' : 'text-neutral-500 text-md'
												}
												numberOfLines={1}
											>
												{tab.name}
											</StyledText>
										</View>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
				</View>
			</Animated.View>
		</>
	);
}

export default React.memo(Tabs);

