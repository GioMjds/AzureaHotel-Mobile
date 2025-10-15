import { View, Image, ScrollView, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useState, useRef } from 'react';
import { AreaImage } from '@/types/Area.types';
import { RoomImage } from '@/types/Room.types';
import { FontAwesome } from '@expo/vector-icons';

interface PhotoGalleryProps {
	images: AreaImage[] | RoomImage[];
	imageKey: 'area_image' | 'room_image';
}

const PhotoGallery = ({
	images,
	imageKey,
}: PhotoGalleryProps) => {
	const [activeIndex, setActiveIndex] = useState<number>(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const screenWidth = Dimensions.get('window').width - 32;

	if (!images || images.length === 0) {
		return (
			<View className="h-64 bg-violet-100 justify-center items-center rounded-xl">
				<FontAwesome name="image" size={48} color="#a78bfa" />
				<Text className="text-violet-400 font-montserrat text-lg mt-2">
					No Images Available
				</Text>
			</View>
		);
	}

	const goToNext = () => {
		if (activeIndex < images.length - 1) {
            const nextIndex = activeIndex + 1;
			setActiveIndex(nextIndex);
            scrollViewRef.current?.scrollTo({
                x: nextIndex * screenWidth,
                animated: true
            });
		}
	};

	const goToPrevious = () => {
		if (activeIndex > 0) {
            const prevIndex = activeIndex - 1;
            setActiveIndex(prevIndex);
            scrollViewRef.current?.scrollTo({
                x: prevIndex * screenWidth,
                animated: true
            });
		}
	};

    const handleScroll = (event: any) => {
        const index = Math.round(
            event.nativeEvent.contentOffset.x / screenWidth
        );
        setActiveIndex(index);
    }

	return (
		<View className="relative h-64 bg-neutral-900 rounded-xl overflow-hidden">
            {/* Main Image ScrollView */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                className="h-full"
                style={{ width: screenWidth }}
            >
                {images.map((image) => (
                    <View key={image.id} style={{ width: screenWidth }} className="h-full">
                        <Image
                            source={{
                                uri:
                                    imageKey === 'area_image'
                                        ? (image as AreaImage).area_image
                                        : (image as RoomImage).room_image,
                            }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    </View>
                ))}
            </ScrollView>

            {/* Navigation Arrows */}
            {images.length > 1 && (
                <>
                    {activeIndex > 0 && (
                        <TouchableOpacity
                            hitSlop={30}
                            onPress={goToPrevious}
                            className="absolute left-4 w-14 h-14 bg-black/50 rounded-full items-center justify-center"
                            style={{ top: '50%', marginTop: -24 }}
                        >
                            <FontAwesome
                                name="chevron-left"
                                size={20}
                                color="white"
                            />
                        </TouchableOpacity>
                    )}

                    {activeIndex < images.length - 1 && (
                        <TouchableOpacity
                            hitSlop={30}
                            onPress={goToNext}
                            className="absolute right-4 w-14 h-14 bg-black/50 rounded-full items-center justify-center"
                            style={{ top: '50%', marginTop: -24 }}
                        >
                            <FontAwesome
                                name="chevron-right"
                                size={20}
                                color="white"
                            />
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
                <View className="absolute top-4 right-4 bg-black/50 rounded-full px-3 py-1">
                    <Text className="text-white font-montserrat text-sm">
                        {activeIndex + 1} / {images.length}
                    </Text>
                </View>
            )}
        </View>
	);
};

export default PhotoGallery;