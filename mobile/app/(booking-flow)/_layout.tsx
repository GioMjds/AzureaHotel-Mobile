import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Stack } from "expo-router";

export default function BookingFlowLayout() {
    return (
        <ProtectedRoute requireAuth={true}>
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
        </ProtectedRoute>
    )
}