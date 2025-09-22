import {
	ActivityIndicator,
	FlatList,
	Text,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { area } from '@/services/Area';
import AreaCard from '@/components/AreaCard';

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
				renderItem={({ item }) => <AreaCard item={item} />}
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
