import { Reviews } from "./Reviews.types";

export interface AreaImage {
    id: number;
    area_image: string;
}

export interface Area {
    id: number;
    area_name: string;
    description: string;
    images: AreaImage[];
    status: string;
    capacity: number;
    price_per_hour: string;
    discounted_price: string | null;
    discount_percent: number;
    senior_discounted_price: number;
    average_rating: number;
    reviews: Reviews[];
    price_per_hour_numeric: number;
    discounted_price_numeric: number | null;
}

export interface FetchAreaResponse {
    data: Area[];
}