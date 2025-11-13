import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { room } from '@/services/Room';
import RoomCard from '@/components/rooms/RoomCard';
import { Room } from '@/types/Room.types';
import { useNetwork } from '@/components/NetworkProvider';
import { Ionicons } from '@expo/vector-icons';

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

	if (error || isOffline) {
		return (
			<View className="flex-1 bg-background">
                <View className="flex-1 justify-center items-center px-6">
                    <View className="bg-background-elevated rounded-2xl p-8 items-center shadow-sm border border-border-subtle">
                        <Ionicons 
                            name={isOffline ? "cloud-offline" : "alert-circle"} 
                            size={48} 
                            color={isOffline ? "#F59E0B" : "#dc2626"} 
                        />
                        <Text className={`font-montserrat-bold text-lg mt-4 text-center ${isOffline ? 'text-feedback-warning-DEFAULT' : 'text-feedback-error-DEFAULT'}`}>
                            {isOffline ? 'No internet connection' : 'Failed to load bookings'}
                        </Text>
                        <Text className="text-text-muted font-montserrat text-sm mt-2 text-center">
                            {isOffline 
                                ? 'Please check your connection and try again' 
                                : (error instanceof Error ? error.message : 'Something went wrong while fetching your bookings')
                            }
                        </Text>
                    </View>
                </View>
            </View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			{/* Rooms List */}
			<FlatList
				data={data?.data || []}
				renderItem={({ item }) => <RoomCard item={item} />}
				keyExtractor={(item: Room) => item.id.toString()}
				contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
				showsVerticalScrollIndicator={false}
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
