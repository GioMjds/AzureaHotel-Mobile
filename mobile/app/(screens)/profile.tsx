import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <Text className="text-xl font-bold p-4">Profile</Text>
        </SafeAreaView>
    );
}