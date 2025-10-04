import axios, {
    AxiosError,
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse,
} from 'axios';
import * as SecureStore from 'expo-secure-store';

export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    success: boolean;
}

export interface RequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, any>;
    timeout?: number;
    withCredentials?: boolean;
    data?: any;
}

export class ApiClient {
    private axiosInstance: AxiosInstance;
    private baseUrl: string;

    constructor(config: AxiosRequestConfig = {}) {
        this.baseUrl = `${process.env.EXPO_PUBLIC_DJANGO_URL}`;

        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                ...config.headers,
            },
            withCredentials: true,
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                config.withCredentials = true;
                try {
                    const accessToken = await SecureStore.getItemAsync('access_token');
                    config.headers.Authorization = `Bearer ${accessToken}`;
                } catch (error) {
                    console.error(`❌ Error retrieving access token: ${error}`);
                }
                return config;
            },
            (error) => {
                console.error('❌ Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => response.data,
            async (error: AxiosError) => {
                const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

                if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        const refreshToken = await SecureStore.getItemAsync('refresh_token');
                        
                        if (refreshToken) {
                            const response = await axios.post(
                                `${this.baseUrl}/api/token/refresh`,
                                { refresh: refreshToken },
                                { withCredentials: true }
                            );

                            const newAccessToken = response.data.access;
                            await SecureStore.setItemAsync('access_token', newAccessToken);

                            if (!originalRequest.headers) {
                                originalRequest.headers = {};
                            }
                            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                            return this.axiosInstance(originalRequest);
                        }
                    } catch (refreshError) {
                        await SecureStore.deleteItemAsync('access_token');
                        await SecureStore.deleteItemAsync('refresh_token');
                        await SecureStore.deleteItemAsync('user_data');
                        console.error('Token refresh failed:', refreshError);
                    }
                }

                const errorMsg = (error?.response?.data as any)?.error || 'Request failed';
                return Promise.reject(new Error(errorMsg));
            }
        );
    }

    async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
        return this.axiosInstance.get<T>(url, { ...config, withCredentials: true }) as Promise<T>;
    }

    async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.axiosInstance.post<T>(url, data, { ...config, withCredentials: true }) as Promise<T>;
    }

    async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.axiosInstance.put<T>(url, data, { ...config, withCredentials: true }) as Promise<T>;
    }

    async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.axiosInstance.patch<T>(url, data, { ...config, withCredentials: true }) as Promise<T>;
    }

    async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
        return this.axiosInstance.delete<T>(url, { ...config, withCredentials: true }) as Promise<T>;
    }

    withAuth(token: string): RequestConfig {
        return {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
        }
    }

    withParams(params: Record<string, any>): RequestConfig {
        return { 
            params,
            withCredentials: true,
        }
    }
}

export const httpClient = new ApiClient();