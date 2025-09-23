import { Amenities } from "./Amenity.types";
import { Reviews } from "./Reviews.types";

export interface RoomImage {
    id: number;
    room_image: string;
}

export interface Room {
    id: number;
    room_name: string;
    room_type: string;
    images: RoomImage[];
    bed_type: string;
    status: string;
    room_price: string;
    discount_percent: number;
    discounted_price: string | null;
    senior_discounted_price: number | null;
    description: string;
    max_guests: number;
    amenities: Amenities[];
    average_rating: number;
    reviews: Reviews[];
    price_per_night: number;
    discounted_price_numeric: number | null;
}

export interface FetchRoomResponse {
    data: Room[];
}