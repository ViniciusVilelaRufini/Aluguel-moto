import { LocationClient, SearchPlaceIndexForPositionCommand } from '@aws-sdk/client-location';
import type { ReverseGeocoder } from '../../ports/reverse-geocoder.port';

type Sender = Pick<LocationClient, 'send'>;

interface Place {
  Label?: string;
  AddressNumber?: string;
  Street?: string;
  Neighborhood?: string;
  SubMunicipality?: string;
  Municipality?: string;
}

/** Mesmo formato do modo local: `Rua, número · Bairro, Cidade` (cai no `Label` do provedor quando falta a rua). */
export function formatPlace(p: Place | undefined): string | null {
  if (!p) return null;
  const district = p.Neighborhood ?? p.SubMunicipality;
  const city = p.Municipality;
  if (p.Street) {
    const head = p.AddressNumber ? `${p.Street}, ${p.AddressNumber}` : p.Street;
    const tail = [district, city].filter(Boolean).join(', ');
    return tail ? `${head} · ${tail}` : head;
  }
  return p.Label ?? null;
}

/** `GEOCODER_MODE=aws`: Amazon Location `SearchPlaceIndexForPosition` (índice em `LOCATION_PLACE_INDEX`). */
export class AwsLocationReverseGeocoder implements ReverseGeocoder {
  constructor(
    private readonly client: Sender,
    private readonly indexName: string,
  ) {}

  static create(region: string, indexName: string): AwsLocationReverseGeocoder {
    return new AwsLocationReverseGeocoder(new LocationClient({ region }), indexName);
  }

  async reverse(lat: number, lng: number): Promise<string | null> {
    const out = await this.client.send(
      new SearchPlaceIndexForPositionCommand({ IndexName: this.indexName, Position: [lng, lat], MaxResults: 1, Language: 'pt-BR' }),
    );
    return formatPlace(out.Results?.[0]?.Place as Place | undefined);
  }
}
