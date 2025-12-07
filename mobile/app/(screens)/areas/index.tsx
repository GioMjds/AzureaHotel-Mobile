import { ActivityIndicator, FlatList, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { area } from '@/services/Area';
import AreaCard from '@/components/areas/AreaCard';
import { Area } from '@/types/Area.types';
import { useNetwork } from '@/components/NetworkProvider';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';

export default function AreasScreen() {
	const { isOffline } = useNetwork();
	const [searchQuery, setSearchQuery] = useState('');
	
	const { 
		data, 
		isLoading, 
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage
	} = useInfiniteQuery({
		queryKey: ['areas'],
		queryFn: ({ pageParam = 1 }) => area.getAreas(pageParam),
		getNextPageParam: (lastPage) => {
			if (lastPage.pagination.current_page < lastPage.pagination.total_pages) {
				return lastPage.pagination.current_page + 1;
			}
			return undefined;
		},
		initialPageParam: 1,
	});

	const allAreas = useMemo(() => {
		if (!data?.pages) return [];
		return data.pages.flatMap(page => page.data);
	}, [data]);

	const filteredAreas = useMemo(() => {
		if (!searchQuery.trim()) return allAreas;
		
		const query = searchQuery.toLowerCase();
		return allAreas.filter((area: Area) => 
			area.area_name.toLowerCase().includes(query) ||
			area.description.toLowerCase().includes(query)
		);
	}, [allAreas, searchQuery]);

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
			{/* Search Bar */}
			<View className="px-4 pt-4 pb-2 bg-background-elevated border-b border-border-subtle">
				<View className="relative">
					<TextInput
						className="bg-input-background border border-input-border rounded-full px-12 py-3 font-montserrat text-text-primary"
						placeholder="Search areas..."
						placeholderTextColor="#E9B3FB"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					<Ionicons 
						name="search" 
						size={20} 
						color="#6F00FF" 
						style={{ position: 'absolute', left: 16, top: 12 }}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity 
							onPress={() => setSearchQuery('')}
							style={{ position: 'absolute', right: 16, top: 12 }}
						>
							<Ionicons name="close-circle" size={20} color="#6F00FF" />
						</TouchableOpacity>
					)}
				</View>
				{searchQuery.length > 0 && (
					<Text className="text-text-muted font-raleway text-xs mt-2">
						{filteredAreas.length} area{filteredAreas.length !== 1 ? 's' : ''} found
					</Text>
				)}
			</View>

			{/* Areas List */}
			<FlatList
				data={filteredAreas}
				renderItem={({ item }) => <AreaCard item={item} />}
				keyExtractor={(item) => item.id.toString()}
				contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
				showsVerticalScrollIndicator={false}
				onEndReached={() => {
					if (hasNextPage && !isFetchingNextPage && !searchQuery) {
						fetchNextPage();
					}
				}}
				onEndReachedThreshold={0.5}
				ListFooterComponent={() => {
					if (isFetchingNextPage) {
						return (
							<View className="py-4">
								<ActivityIndicator size="small" color="#8b5cf6" />
							</View>
						);
					}
					return null;
				}}
				ListEmptyComponent={
					<View className="flex-1 justify-center items-center mt-10">
						<Ionicons name="business-outline" size={48} color="#E9B3FB" />
						<Text className="text-neutral-600 font-montserrat text-center mt-4">
							{searchQuery ? 'No areas match your search' : 'No areas available.'}
						</Text>
					</View>
				}
			/>
		</View>
	);
}
