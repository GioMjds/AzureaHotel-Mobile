import {
	ActivityIndicator,
	FlatList,
	Image,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { area } from '@/services/Area';
import { Area } from '@/types/Area.types';
import { pesoFormatter } from '@/utils/formatters';
import { Link } from 'expo-router';

export default function AreasScreen() {
	const { data, isLoading, error } = useQuery({
		queryKey: ['areas'],
		queryFn: async () => {
			return await area.getAreas();
		},
	});

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#8b5cf6" />
					<Text className="text-violet-600 font-montserrat mt-2">
						Loading areas...
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center px-6">
					<Text className="text-red-500 font-montserrat-bold text-lg text-center">
						Error loading areas
					</Text>
					<Text className="text-neutral-600 font-montserrat mt-2 text-center">
						Please try again later
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	const renderAreaCard = ({ item }: { item: Area }) => (
		<View className="bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden border border-neutral-200">
			{/* Area Image */}
			<View className="h-48 bg-neutral-100">
				{item.images && item.images.length > 0 ? (
					<Image
						source={{ uri: item.images[0].area_image }}
						className="w-full h-full"
						resizeMode="cover"
					/>
				) : (
					<View className="w-full h-full bg-violet-100 justify-center items-center">
						<Text className="text-violet-400 font-montserrat">
							No Image
						</Text>
					</View>
				)}

				{/* Discount Badge */}
				{item.discount_percent > 0 && (
					<View className="absolute top-3 right-3 bg-accent-pink rounded-full px-3 py-1">
						<Text className="text-white font-montserrat-bold text-xs">
							{item.discount_percent}% OFF
						</Text>
					</View>
				)}

				{/* Status Badge */}
				<View className="absolute top-3 left-3">
					<View
						className={`px-3 py-1 rounded-full ${
							item.status === 'available'
								? 'bg-green-500'
								: 'bg-red-500'
						}`}
					>
						<Text className="text-white font-montserrat-bold text-xs capitalize">
							{item.status}
						</Text>
					</View>
				</View>
			</View>

			{/* Area Details */}
			<View className="p-4">
				<View className="flex-row justify-between items-start mb-2">
					<Text className="text-xl font-playfair-bold text-neutral-800 flex-1">
						{item.area_name}
					</Text>
					{/* Rating */}
					{item.average_rating > 0 && (
						<View className="flex-row items-center bg-violet-100 px-2 py-1 rounded-full">
							<Text className="text-violet-700 font-montserrat-bold text-sm">
								★
							</Text>
							<Text className="text-violet-700 font-montserrat-bold text-sm ml-1">
								{item.average_rating.toFixed(1)}
							</Text>
						</View>
					)}
				</View>

				<Text className="text-neutral-600 font-montserrat text-sm mb-3 line-height-5">
					{item.description}
				</Text>

				{/* Capacity */}
				<View className="flex-row items-center mb-3">
					<Text className="text-neutral-500 font-montserrat text-sm">
						Capacity:{' '}
					</Text>
					<Text className="text-violet-600 font-montserrat-bold text-sm">
						{item.capacity} people
					</Text>
				</View>

				{/* Pricing */}
				<View className="flex-row items-center justify-between">
					<View>
						{item.discounted_price_numeric ? (
							<View className="flex-row items-center">
								<Text className="text-neutral-400 font-montserrat text-sm line-through">
									{pesoFormatter.format(
										item.price_per_hour_numeric
									)}
								</Text>
								<Text className="text-violet-600 font-black text-2xl ml-2">
									{pesoFormatter.format(
										item.discounted_price_numeric
									)}
								</Text>
							</View>
						) : (
							<Text className="text-violet-600 font-black text-2xl">
								{pesoFormatter.format(
									item.price_per_hour_numeric
								)}
							</Text>
						)}
					</View>

					<Link href={`/(screens)/areas/${item.id}` as any} asChild>
						<TouchableOpacity className="bg-violet-600 px-6 py-2 rounded-full">
							<Text className="text-white font-montserrat-bold text-sm">
								View Details
							</Text>
						</TouchableOpacity>
					</Link>
				</View>
			</View>
		</View>
	);

	return (
		<SafeAreaView className="flex-1 bg-neutral-50">
			{/* Header */}
			<View className="px-4 py-2 bg-white border-b border-neutral-200">
				<Text className="text-2xl font-playfair-bold text-neutral-800">
					Available Areas
				</Text>
				<Text className="text-neutral-600 font-montserrat text-sm mt-1">
					{data?.data?.length || 0} areas available
				</Text>
			</View>

			{/* Areas List */}
			<FlatList
				data={data?.data || []}
				renderItem={renderAreaCard}
				keyExtractor={(item) => item.id.toString()}
				contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<View className="flex-1 justify-center items-center py-20">
						<Text className="text-neutral-500 font-montserrat text-center">
							No areas available at the moment
						</Text>
					</View>
				}
			/>
		</SafeAreaView>
	);
}
