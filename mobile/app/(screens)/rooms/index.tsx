import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { room } from '@/services/Room';
import RoomCard from '@/components/rooms/RoomCard';
import { Room } from '@/types/Room.types';
import { useNetwork } from '@/components/NetworkProvider';

export default function RoomsScreen() {
	const { isOffline } = useNetwork();
	
	const { data, isLoading, error } = useQuery({
		queryKey: ['rooms'],
		queryFn: async () => {
			return await room.getRooms();
		},
	});

	if (isLoading) {
		return (
			<View className="flex-1 bg-neutral-50">
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#8b5cf6" />
					<Text className="text-violet-600 font-montserrat mt-2">
						Loading rooms...
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
						Error loading rooms
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
			{/* Rooms List */}
			<FlatList
				data={data?.data || []}
				renderItem={({ item }) => <RoomCard item={item} />}
				keyExtractor={(item: Room) => item.id.toString()}
				contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
				showsVerticalScrollIndicator={false}
				style={isOffline ? { opacity: 0.6 } : undefined}
				ListEmptyComponent={
					<View className="flex-1 justify-center items-center mt-10">
						<Text className="text-neutral-500 font-montserrat text-center">
							No rooms available at the moment
						</Text>
					</View>
				}
			/>
		</View>
	);
}
