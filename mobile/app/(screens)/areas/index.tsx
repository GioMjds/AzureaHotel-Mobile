import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { area } from '@/services/Area';
import AreaCard from '@/components/areas/AreaCard';
import { Area } from '@/types/Area.types';
import { useNetwork } from '@/components/NetworkProvider';

export default function AreasScreen() {
	const { isOffline } = useNetwork();
	
	const { data, isLoading, error } = useQuery({
		queryKey: ['areas'],
		queryFn: async () => {
			return await area.getAreas();
		},
	});

	if (isLoading) {
		return (
			<View className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#8b5cf6" />
					<Text className="text-violet-600 font-montserrat mt-2">
						Loading areas...
					</Text>
				</View>
			</View>
		);
	}

	if (error) {
		return (
			<View className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center px-6">
					<Text className="text-red-500 font-montserrat-bold text-lg text-center">
						Error loading areas
					</Text>
					<Text className="text-neutral-600 font-montserrat mt-2 text-center">
						Please try again later
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View className={`flex-1 ${isOffline ? 'bg-neutral-200' : 'bg-neutral-50'}`}>
			{/* Areas List */}
			<FlatList
				data={data?.data as Area[]}
				renderItem={({ item }) => <AreaCard item={item} />}
				keyExtractor={(item) => item.id.toString()}
				contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
				showsVerticalScrollIndicator={false}
				style={isOffline ? { opacity: 0.6 } : undefined}
				ListEmptyComponent={
					<View className="flex-1 justify-center items-center mt-10">
						<Text className="text-neutral-600 font-montserrat text-center">
							No areas available.
						</Text>
					</View>
				}
			/>
		</View>
	);
}
