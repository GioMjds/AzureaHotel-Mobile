import { ActivityIndicator, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { area } from "@/services/Area";
import { Area } from "@/types/Area.types";
import { pesoFormatter } from "@/utils/formatters";
import { FontAwesome } from "@expo/vector-icons";

export default function GetAreaScreen() {
    const { areaId } = useLocalSearchParams();
    const router = useRouter();

    const { data, isLoading, error } = useQuery({
        queryKey: ['area', areaId],
        queryFn: async () => {
            return await area.getSingleArea(areaId as string);
        },
        enabled: !!areaId,
    });

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <Text className="text-violet-600 font-montserrat mt-2">Loading area details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50">
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-red-500 font-montserrat-bold text-lg text-center">
                        Error loading area details
                    </Text>
                    <Text className="text-neutral-600 font-montserrat mt-2 text-center">
                        Please try again later
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const areaData: Area = data.data;

    const renderImageItem = ({ item }: { item: any }) => (
        <View className="w-full h-64 bg-neutral-100 mr-4">
            <Image
                source={{ uri: item.area_image }}
                className="w-full h-full rounded-lg"
                resizeMode="cover"
            />
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-200">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="mr-4 p-2 -ml-2"
                >
                    <FontAwesome name="arrow-left" size={20} color="#6b7280" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-neutral-800 flex-1">
                    Area Details
                </Text>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Image Gallery */}
                <View className="h-64 bg-neutral-100">
                    {areaData.images.length > 0 && (
                        <FlatList
                            data={areaData.images}
                            renderItem={renderImageItem}
                            keyExtractor={(item) => item.id.toString()}
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            className="h-64"
                        />
                    )}

                    {/* Status Badge */}
                    <View className="absolute top-4 left-4">
                        <View className={`px-3 py-2 rounded-full ${
                            areaData.status === 'available' 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                        }`}>
                            <Text className="text-white font-montserrat-bold text-sm capitalize">
                                {areaData.status}
                            </Text>
                        </View>
                    </View>

                    {/* Discount Badge */}
                    {areaData.discount_percent > 0 && (
                        <View className="absolute top-4 right-4 bg-accent-pink rounded-full px-3 py-2">
                            <Text className="text-white font-montserrat-bold text-sm">
                                {areaData.discount_percent}% OFF
                            </Text>
                        </View>
                    )}
                </View>

                {/* Area Details */}
                <View className="bg-white mx-4 mt-4 rounded-xl p-6 shadow-sm border border-neutral-200">
                    {/* Header */}
                    <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-1">
                            <Text className="text-3xl font-bold text-neutral-800 mb-1">
                                {areaData.area_name}
                            </Text>
                        </View>
                        {/* Rating */}
                        {areaData.average_rating > 0 && (
                            <View className="flex-row items-center bg-violet-100 px-3 py-2 rounded-full">
                                <Text className="text-violet-700 font-montserrat-bold text-lg">
                                    ★
                                </Text>
                                <Text className="text-violet-700 font-montserrat-bold text-lg ml-1">
                                    {areaData.average_rating.toFixed(1)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Description */}
                    <Text className="text-neutral-700 font-montserrat text-base leading-6 mb-6">
                        {areaData.description}
                    </Text>

                    {/* Area Information */}
                    <View className="border-t border-neutral-200 pt-6 mb-6">
                        <Text className="text-lg font-playfair-bold text-neutral-800 mb-4">
                            Area Information
                        </Text>
                        
                        <View className="space-y-3">
                            <View className="flex-row justify-between items-center py-2">
                                <Text className="text-neutral-600 font-montserrat">
                                    Capacity
                                </Text>
                                <Text className="text-violet-600 font-montserrat-bold">
                                    {areaData.capacity} people
                                </Text>
                            </View>
                            
                            <View className="flex-row justify-between items-center py-2">
                                <Text className="text-neutral-600 font-montserrat">
                                    Status
                                </Text>
                                <Text className={`font-montserrat-bold capitalize ${
                                    areaData.status === 'available' 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                }`}>
                                    {areaData.status}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Pricing */}
                    <View className="border-t border-neutral-200 pt-6">
                        <View className="flex-row items-center justify-between">
                            <View>
                                {areaData.discounted_price_numeric ? (
                                    <View>
                                        <Text className="text-neutral-400 font-montserrat text-lg line-through">
                                            {pesoFormatter.format(areaData.price_per_hour_numeric)}
                                        </Text>
                                        <Text className="text-violet-600 font-black text-3xl">
                                            {pesoFormatter.format(areaData.discounted_price_numeric)}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text className="text-violet-600 font-black text-3xl">
                                        {pesoFormatter.format(areaData.price_per_hour_numeric)}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <Text className="text-neutral-500 font-montserrat text-sm mt-1">
                            per hour
                        </Text>
                    </View>
                </View>

                {/* Book Button */}
                <View className="px-4 py-6">
                    <TouchableOpacity 
                        className={`rounded-xl py-4 ${
                            areaData.status === 'available' 
                                ? 'bg-violet-600' 
                                : 'bg-neutral-400'
                        }`}
                        disabled={areaData.status !== 'available'}
                    >
                        <Text className="text-white font-montserrat-bold text-center text-lg">
                            {areaData.status === 'available' ? 'Book This Area' : 'Currently Unavailable'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}