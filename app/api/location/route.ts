
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        // Try Photon first
        const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
        if (photonRes.ok) {
            const data = await photonRes.json();
            const results = data.features.map((item: any) => ({
                id: item.properties.osm_id || Math.random(),
                name: item.properties.name,
                full_name: [item.properties.name, item.properties.city, item.properties.country].filter(Boolean).join(', ')
            })).filter((r: any) => r.name); // basic filter

            return NextResponse.json({ results });
        }

        throw new Error('Photon failed');
    } catch (error) {
        console.warn("Location proxy error:", error);
        // Fallback to internal error or empty 
        return NextResponse.json({ results: [], error: 'Failed to fetch location' }, { status: 500 });
    }
}
