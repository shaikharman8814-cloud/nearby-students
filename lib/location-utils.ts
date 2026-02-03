/**
 * Calculates the distance between two points in kilometers or miles using the Haversine formula.
 */
export function calculateDistance(
    lat1?: number,
    lon1?: number,
    lat2?: number,
    lon2?: number,
    unit: 'km' | 'miles' = 'km'
): number | undefined {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return undefined;
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return undefined;

    if (lat1 === lat2 && lon1 === lon2) return 0;

    const R = unit === 'km' ? 6371 : 3958.8; // Radius of the Earth in km or miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return parseFloat(distance.toFixed(1));
}

export function kmToMiles(km: number): number {
    return parseFloat((km * 0.621371).toFixed(1));
}

export function milesToKm(miles: number): number {
    return parseFloat((miles / 0.621371).toFixed(1));
}
