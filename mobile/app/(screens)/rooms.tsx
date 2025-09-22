import { room } from "@/services/Room";
import { Room } from "@/types/Room.types";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { pesoFormatter } from "@/utils/formatters";

export default function RoomsScreen() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
            return await room.getRooms();
        }
    });

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text className="text-violet-600 font-montserrat mt-2">Loading rooms...</Text>
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

    const renderRoomCard = ({ item }: { item: Room }) => (
        <View className="bg-white rounded-xl shadow-sm mx-4 mb-4 overflow-hidden border border-neutral-200">
            {/* Room Image */}
            <View className="h-48 bg-neutral-100">
                {item.images && item.images.length > 0 ? (
                    <Image
                        source={{ uri: item.images[0].room_image }}
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

            {/* Room Details */}
            <View className="p-4">
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-xl font-playfair-bold text-neutral-800 flex-1">
                        {item.room_name}
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

                {/* Room Type and Bed Type */}
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                        <Text className="text-neutral-500 font-montserrat text-sm">
                            Type: 
                        </Text>
                        <Text className="text-violet-600 font-montserrat-bold text-sm ml-1">
                            {item.room_type}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Text className="text-neutral-500 font-montserrat text-sm">
                            Bed: 
                        </Text>
                        <Text className="text-violet-600 font-montserrat-bold text-sm ml-1">
                            {item.bed_type}
                        </Text>
                    </View>
                </View>

                {/* Max Guests */}
                <View className="flex-row items-center mb-3">
                    <Text className="text-neutral-500 font-montserrat text-sm">
                        Max Guests: 
                    </Text>
                    <Text className="text-violet-600 font-montserrat-bold text-sm ml-1">
                        {item.max_guests} people
                    </Text>
                </View>

                {/* Pricing */}
                <View className="flex-row items-center justify-between">
                    <View>
                        {item.discouted_price_numeric ? (
                            <View className="flex-row items-center">
                                <Text className="text-neutral-400 font-montserrat text-sm line-through">
                                    {pesoFormatter.format(item.price_per_night)}
                                </Text>
                                <Text className="text-violet-600 font-black text-2xl ml-2">
                                    {pesoFormatter.format(item.discouted_price_numeric)}
                                </Text>
                            </View>
                        ) : (
                            <Text className="text-violet-600 font-black text-2xl">
                                {pesoFormatter.format(item.price_per_night)}
                            </Text>
                        )}
                    </View>

                    <Link href={`/(screens)/rooms/${item.id}` as any} asChild>
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
                    Available Rooms
                </Text>
                <Text className="text-neutral-600 font-montserrat text-sm mt-1">
                    {data?.data?.length || 0} rooms available
                </Text>
            </View>

            {/* Rooms List */}
            <FlatList
                data={data?.data || []}
                renderItem={renderRoomCard}
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