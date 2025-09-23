import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function AreaBookingScreen() {
    const { areaId } = useLocalSearchParams();

    return (
        <View className="flex-1 items-center justify-center">
            <Text>Area Booking Screen for {areaId}</Text>
        </View>
    )
}