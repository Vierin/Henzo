import { Controller, Get, Query } from '@nestjs/common';
import { MapboxService } from './mapbox.service';
import { Public } from '../auth/public.decorator';
import { Throttle } from '@nestjs/throttler';

@Public()
@Throttle({ short: { limit: 30, ttl: 60000 } })
@Controller('mapbox')
export class MapboxController {
  constructor(private readonly mapboxService: MapboxService) {}

  @Get('autocomplete')
  async getAutocompleteSuggestions(
    @Query('q') query: string,
    @Query('country') country?: string,
    @Query('limit') limit?: string,
    @Query('types') types?: string,
  ) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const limitNum = limit ? parseInt(limit, 10) : 5;
    const typeList = types
      ? types
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : ['address', 'poi'];
    const suggestions = await this.mapboxService.getAutocompleteSuggestions(
      query.trim(),
      country ?? 'VN',
      limitNum,
      typeList,
    );

    return suggestions;
  }

  @Get('geocode')
  async geocodeAddress(@Query('address') address: string) {
    if (!address || address.trim().length < 2) {
      return null;
    }

    const result = await this.mapboxService.geocodeAddress(
      address.trim(),
      'VN',
    );
    return result;
  }

  @Get('reverse-geocode')
  async reverseGeocode(@Query('lat') lat: string, @Query('lon') lon: string) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return null;
    }

    const result = await this.mapboxService.reverseGeocode(latNum, lonNum);
    return result;
  }
}
