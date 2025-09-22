import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { room } from "@/services/Room";
import { pesoFormatter } from "@/utils/formatters";
import { Amenities } from "@/types/Amenity.types";

export default function GetRoomScreen() {
    const { roomId } = useLocalSearchParams();
    
    const { data, isLoading, error } = useQuery({
        queryKey: ['room', roomId],
        queryFn: async () => {
            return await room.getSingleRoom(roomId as string);
        },
        enabled: !!roomId
    });

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text className="text-violet-600 font-montserrat mt-2">Loading room details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-red-500 font-montserrat-bold text-lg text-center">
                        Error loading room details
                    </Text>
                    <Text className="text-neutral-600 font-montserrat mt-2 text-center">
                        Please try again later
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const roomData = data?.data;

    if (!roomData) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-neutral-600 font-montserrat text-center">
                        Room not found
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const renderImageItem = ({ item }: { item: any }) => (
        <View className="w-full h-64 bg-neutral-100 mr-4">
            <Image
                source={{ uri: item.room_image }}
                className="w-full h-full rounded-lg"
                resizeMode="cover"
            />
        </View>
    );

    const renderAmenityItem = ({ item }: { item: Amenities }) => (
        <View className="bg-violet-100 px-3 py-2 rounded-full mr-2 mb-2">
            <Text className="text-violet-700 font-montserrat text-sm">
                {item.description}
            </Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Image Gallery */}
                <View className="h-64 bg-neutral-100">
                    {roomData.images && roomData.images.length > 0 ? (
                        <FlatList
                            data={roomData.images}
                            renderItem={renderImageItem}
                            keyExtractor={(item) => item.id.toString()}
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            className="h-64"
                        />
                    ) : (
                        <View className="w-full h-full bg-violet-100 justify-center items-center">
                            <Text className="text-violet-400 font-montserrat text-lg">
                                No Images Available
                            </Text>
                        </View>
                    )}

                    {/* Status Badge */}
                    <View className="absolute top-4 left-4">
                        <View
                            className={`px-3 py-2 rounded-full ${
                                roomData.status === 'available'
                                    ? 'bg-green-500'
                                    : 'bg-red-500'
                            }`}
                        >
                            <Text className="text-white font-montserrat-bold text-sm capitalize">
                                {roomData.status}
                            </Text>
                        </View>
                    </View>

                    {/* Discount Badge */}
                    {roomData.discount_percent > 0 && (
                        <View className="absolute top-4 right-4 bg-accent-pink rounded-full px-3 py-2">
                            <Text className="text-white font-montserrat-bold text-sm">
                                {roomData.discount_percent}% OFF
                            </Text>
                        </View>
                    )}
                </View>

                {/* Room Details */}
                <View className="bg-white mx-4 mt-4 rounded-xl p-6 shadow-sm border border-neutral-200">
                    {/* Header */}
                    <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-1">
                            <Text className="text-3xl font-bold text-neutral-800 mb-1">
                                {roomData.room_name}
                            </Text>
                            <Text className="text-neutral-600 capitalize text-sm font-semibold">
                                {roomData.room_type}
                            </Text>
                        </View>
                        {/* Rating */}
                        {roomData.average_rating > 0 && (
                            <View className="flex-row items-center bg-violet-100 px-3 py-2 rounded-full">
                                <Text className="text-violet-700 font-montserrat-bold text-lg">
                                    ★
                                </Text>
                                <Text className="text-violet-700 font-montserrat-bold text-lg ml-1">
                                    {roomData.average_rating.toFixed(1)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Description */}
                    <Text className="text-neutral-700 font-montserrat text-base leading-6 mb-6">
                        {roomData.description}
                    </Text>

                    {/* Room Information */}
                    <View className="border-t border-neutral-200 pt-6 mb-6">
                        <Text className="text-lg font-playfair-bold text-neutral-800 mb-4">
                            Room Information
                        </Text>
                        
                        <View className="space-y-3">
                            <View className="flex-row justify-between items-center py-2">
                                <Text className="text-neutral-600 font-montserrat">
                                    Bed Type
                                </Text>
                                <Text className="text-violet-600 font-montserrat-bold">
                                    {roomData.bed_type}
                                </Text>
                            </View>
                            
                            <View className="flex-row justify-between items-center py-2">
                                <Text className="text-neutral-600 font-montserrat">
                                    Max Guests
                                </Text>
                                <Text className="text-violet-600 font-montserrat-bold">
                                    {roomData.max_guests} people
                                </Text>
                            </View>
                            
                            <View className="flex-row justify-between items-center py-2">
                                <Text className="text-neutral-600 font-montserrat">
                                    Status
                                </Text>
                                <Text className={`font-montserrat-bold capitalize ${
                                    roomData.status === 'available' 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                }`}>
                                    {roomData.status}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Amenities */}
                    {roomData.amenities && roomData.amenities.length > 0 && (
                        <View className="border-t border-neutral-200 pt-6 mb-6">
                            <Text className="text-lg font-playfair-bold text-neutral-800 mb-4">
                                Amenities
                            </Text>
                            <FlatList
                                data={roomData.amenities}
                                renderItem={renderAmenityItem}
                                keyExtractor={(item) => item.id.toString()}
                                numColumns={3}
                                scrollEnabled={false}
                            />
                        </View>
                    )}

                    {/* Pricing */}
                    <View className="border-t border-neutral-200 pt-6">
                        <View className="flex-row items-center justify-between">
                            <View>
                                {roomData.discouted_price_numeric ? (
                                    <View>
                                        <Text className="text-neutral-400 font-montserrat text-lg line-through">
                                            {pesoFormatter.format(roomData.price_per_night)}
                                        </Text>
                                        <Text className="text-violet-600 font-black text-3xl">
                                            {pesoFormatter.format(roomData.discouted_price_numeric)}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text className="text-violet-600 font-black text-3xl">
                                        {pesoFormatter.format(roomData.price_per_night)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Book Now Button */}
                <View className="px-4 py-6">
                    <TouchableOpacity 
                        className={`rounded-xl py-4 ${
                            roomData.status === 'available' 
                                ? 'bg-violet-600' 
                                : 'bg-neutral-400'
                        }`}
                        disabled={roomData.status !== 'available'}
                    >
                        <Text className="text-white font-montserrat-bold text-center text-lg">
                            {roomData.status === 'available' ? 'Book Now' : 'Not Available'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}