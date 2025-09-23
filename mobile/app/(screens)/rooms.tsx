import {
    ActivityIndicator,
	FlatList,
	Text,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { room } from '@/services/Room';
import RoomCard from '@/components/RoomCard';

export default function RoomsScreen() {
	const { data, isLoading, error } = useQuery({
		queryKey: ['rooms'],
		queryFn: async () => {
			return await room.getRooms();
		},
	});

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#8b5cf6" />
					<Text className="text-violet-600 font-montserrat mt-2">
						Loading rooms...
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
						Error loading rooms
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
				<Text className="text-3xl font-montserrat-bold text-neutral-800">
					Browse Rooms
				</Text>
				<Text className="text-neutral-600 font-montserrat text-lg mt-1">
					{data?.data?.length || 0} rooms available
				</Text>
			</View>

			{/* Rooms List */}
			<FlatList
				data={data?.data || []}
				renderItem={({ item }) => <RoomCard item={item} />}
				keyExtractor={(item) => item.id.toString()}
				contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<View className="flex-1 justify-center items-center py-20">
						<Text className="text-neutral-500 font-montserrat text-center">
							No rooms available at the moment
						</Text>
					</View>
				}
			/>
		</SafeAreaView>
	);
}
