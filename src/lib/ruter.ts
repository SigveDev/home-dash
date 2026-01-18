export interface RuterStop {
    id: string;
    name: string;
    distance?: number;
}

export interface Departure {
    expectedDepartureTime: string;
    destinationDisplay: {
        frontText: string;
    };
    serviceJourney: {
        journeyPattern: {
            line: {
                publicCode: string; // "31"
                transportMode: string; // "bus"
            }
        }
    }
}

const GEOCODER_URL = "https://api.entur.io/geocoder/v1/autocomplete";
const JOURNEY_URL = "https://api.entur.io/journey-planner/v3/graphql";

export class RuterService {
    static async searchStops(query: string): Promise<RuterStop[]> {
        if (!query || query.length < 3) return [];

        try {
            // Removed layers=venue to find all stop types.
            // Added ET-Client-Name header as required by Entur.
            const res = await fetch(`${GEOCODER_URL}?text=${encodeURIComponent(query)}&lang=en`, {
                headers: {
                    'ET-Client-Name': 'homedash-personal-project'
                }
            });

            if (!res.ok) {
                console.error("Ruter Search Error Status:", res.status);
                return [];
            }

            const data = await res.json();
            return data.features.map((f: any) => ({
                id: f.properties.id,
                name: f.properties.name,
            }));
        } catch (e) {
            console.error("Ruter Search Error", e);
            return [];
        }
    }

    static async getDepartures(stopId: string, limit: number = 5): Promise<Departure[]> {
        const query = `
        {
          stopPlace(id: "${stopId}") {
            name
            estimatedCalls(numberOfDepartures: ${limit}) {
              expectedDepartureTime
              destinationDisplay {
                frontText
              }
              serviceJourney {
                journeyPattern {
                  line {
                    publicCode
                    transportMode
                  }
                }
              }
            }
          }
        }
        `;

        try {
            const res = await fetch(JOURNEY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ET-Client-Name': 'homedash-personal-project'
                },
                body: JSON.stringify({ query })
            });

            if (!res.ok) {
                console.error("Ruter Departure Error Status:", res.status);
                // Try to log body if possible
                try { console.error(await res.text()); } catch { }
                return [];
            }

            const data = await res.json();
            if (data.errors) {
                console.error("Ruter GraphQL Errors:", data.errors);
            }
            return data.data.stopPlace?.estimatedCalls || [];
        } catch (e) {
            console.error("Ruter Departures Error", e);
            return [];
        }
    }
}
