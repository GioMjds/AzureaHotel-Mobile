import { Text, View, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { area } from '@/services/Area';
import { useQuery } from '@tanstack/react-query';
import { FetchAreaResponse } from '@/types/Area.types';

export default function HomeScreen() {
	const { data, isLoading, error } = useQuery<FetchAreaResponse>({
		queryKey: ['areas'],
		queryFn: area.getAreas,
	});

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 items-center justify-center bg-white">
				<ActivityIndicator size="large" color="#007AFF" />
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView className="flex-1 items-center justify-center bg-white">
				<Text className="text-red-500">Failed to load areas.</Text>
			</SafeAreaView>
		);
	}

	if (!data) return null;

	return (
		<SafeAreaView className="flex-1 bg-gray-600">
			<ScrollView className="px-4 py-6">
				<Text className="text-2xl font-bold mb-4 text-purple-400">
					Available Areas
				</Text>
				{data?.data.map((area) => (
					<View
						key={area.id}
						className="mb-6 bg-white rounded-xl shadow p-4"
					>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							className="mb-2"
						>
							{area.images.map((img) => (
								<Image
									key={img.id}
									source={{ uri: img.area_image }}
									className="w-32 h-24 rounded-lg mr-2"
								/>
							))}
						</ScrollView>
						<Text className="text-lg font-semibold text-gray-900">
							{area.area_name}
						</Text>
						<Text className="text-gray-600 mb-2">
							{area.description}
						</Text>
						<View className="flex-row items-center mb-1">
							<Text className="text-sm text-gray-500 mr-2">
								Capacity:
							</Text>
							<Text className="text-sm text-gray-700 font-medium">
								{area.capacity}
							</Text>
						</View>
						<View className="flex-row items-center mb-1">
							<Text className="text-sm text-gray-500 mr-2">
								Price/Hour:
							</Text>
							<Text className="text-sm text-gray-700 font-medium">
								{area.price_per_hour}
							</Text>
						</View>
						{area.discounted_price && (
							<View className="flex-row items-center mb-1">
								<Text className="text-sm text-green-600 mr-2">
									Discounted:
								</Text>
								<Text className="text-sm text-green-700 font-bold">
									{area.discounted_price}
								</Text>
								<Text className="text-xs text-green-700 ml-2">
									({area.discount_percent}% OFF)
								</Text>
							</View>
						)}
						<View className="flex-row items-center">
							<Text className="text-sm text-blue-500 mr-2">
								Senior/PWD Price:
							</Text>
							<Text className="text-sm text-blue-700 font-bold">
								₱{area.senior_discounted_price}
							</Text>
						</View>
					</View>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}
