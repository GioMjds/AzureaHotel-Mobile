export interface ChartData {
    labels: string[];
    datasets: {
        label?: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string;
        fill?: boolean;
        tension?: number;
    }[];
}

export interface ReportData {
    title: string;
    period: string;
    stats: {
        totalBookings: number;
        activeBookings: number;
        revenue: number;
        formattedRevenue: string;
        occupancyRate: string;
        pendingBookings: number;
        checkedInCount: number;
        availableRooms: number;
        totalRooms: number;
    };
    bookingStatusCounts: {
        pending: number;
        reserved: number;
        checked_in: number;
        checked_out: number;
        cancelled: number;
        no_show: number;
        rejected: number;
    };
    charts: {
        revenueData: {
            type: "line";
            data: ChartData;
        };
        bookingTrendsData: {
            type: "line";
            data: ChartData;
        };
        bookingStatusData: {
            type: "pie";
            data: ChartData;
        };
        roomOccupancyData: {
            type: "bar";
            data: ChartData;
        };
    };
}
