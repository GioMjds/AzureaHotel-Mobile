import { useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/services/UserAuth";
import useAuthStore from "@/store/AuthStore";
import { Guest } from "@/types/GuestUser.types";

export const useUploadImage = () => {
    const queryClient = useQueryClient();

    // Upload valid ID mutation
    const uploadValidIdMutation = useMutation({
        mutationFn: async (payload: { frontUri: string; backUri: string; idType: string }) => {
            return await auth.uploadValidId(payload.frontUri, payload.backUri, payload.idType);
        },
        onSuccess: (data: any) => {
            const { id_type, front_url, back_url } = data;

            const currentUser = useAuthStore.getState().user;

            if (currentUser) {
                useAuthStore.getState().setUser({
                    ...currentUser,
                    valid_id_type_display: id_type ?? currentUser['valid_id_type_display'],
                    valid_id_front: front_url ?? currentUser['valid_id_front'],
                    valid_id_back: back_url ?? currentUser['valid_id_back'],
                } as any);
            }

            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        },
    });

    const uploadProfileImageMutation = useMutation({
        mutationFn: async (payload: { uri: string; fileName?: string; mimeType?: string }) => {
            return await auth.changeProfileImage(payload.uri, payload.fileName, payload.mimeType);
        },
        onSuccess: (data: Guest) => {
            const profileUrl = data?.profile_image;

            if (profileUrl) {
                const currentUser = useAuthStore.getState().user;
                if (currentUser) {
                    useAuthStore.getState().setUser({
                        ...currentUser,
                        profile_image: profileUrl,
                    } as any);
                }
            }

            queryClient.invalidateQueries({ queryKey: ['user-profile'] });
            queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
        }
    });

    return {
        uploadValidIdMutation,
        uploadProfileImageMutation,
    }
};
