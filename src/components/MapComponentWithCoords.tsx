'use client';

import { useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css';

// Dynamically import Leaflet to avoid SSR issues
const LeafletLoader = { L: null as any };

interface MapComponentWithCoordsProps {
	lat?: number;
	lon?: number;
	address?: string;
	className?: string;
	height?: string;
	showPopup?: boolean;
	interactive?: boolean;
	zoom?: number;
	editable?: boolean; // Allow marker to be dragged
	onMarkerMove?: (lat: number, lon: number, address?: string) => void; // Callback when marker is moved
}

export default function MapComponentWithCoords({
	lat,
	lon,
	address,
	className = '',
	height = '300px',
	showPopup = true,
	interactive = true,
	zoom = 16,
	editable = false,
	onMarkerMove,
}: MapComponentWithCoordsProps) {
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const markerRef = useRef<any>(null);
	const lastCoordsRef = useRef<{ lat?: number; lon?: number }>({});

	const reverseGeocode = useCallback(
		async (lat: number, lon: number): Promise<string | undefined> => {
			try {
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(
					`${API_BASE_URL}/mapbox/reverse-geocode?lat=${lat}&lon=${lon}`
				);

				if (!response.ok) {
					return undefined;
				}

				const result = await response.json();
				return result?.address;
			} catch (error) {
				console.error('❌ Error reverse geocoding:', error);
				return undefined;
			}
		},
		[]
	);

	const updateMapWithCoords = useCallback(
		(lat: number, lon: number, address?: string, updateFromDrag = false) => {
			if (!mapInstanceRef.current || !LeafletLoader.L) {
				console.warn(
					'⚠️ Cannot update map: mapInstanceRef or Leaflet not ready'
				);
				return;
			}

			console.log('🗺️ updateMapWithCoords called:', {
				lat,
				lon,
				address,
				updateFromDrag,
			});

			// Remove existing marker first
			if (markerRef.current) {
				mapInstanceRef.current.removeLayer(markerRef.current);
				if (markerRef.current.off) {
					markerRef.current.off('dragend'); // Remove previous event listeners
				}
				markerRef.current = null;
			}

			// Create red marker icon with cursor pointer if editable
			// Use larger size for better visibility on mobile
			const markerSize = 24;
			const markerBorder = 3;
			const markerAnchor = markerSize / 2;

			const redMarker = LeafletLoader.L.divIcon({
				html: `<div style="
				background-color: #ff5b5b;
				width: ${markerSize}px;
				height: ${markerSize}px;
				border-radius: 50%;
				border: ${markerBorder}px solid white;
				box-shadow: 0 2px 6px rgba(0,0,0,0.4);
				position: relative;
				cursor: ${editable ? 'move' : 'default'};
				transform: translate(-50%, -50%);
			"></div>`,
				iconSize: [markerSize, markerSize],
				iconAnchor: [markerAnchor, markerAnchor],
				popupAnchor: [0, -markerAnchor],
				className: 'custom-red-marker',
			});

			// Add marker at coordinates with drag capability if editable
			const markerOptions: any = {
				icon: redMarker,
				draggable: editable,
			};

			try {
				console.log('🗺️ Creating marker at:', [lat, lon], 'Map instance:', !!mapInstanceRef.current);
				
				// Ensure map is ready
				if (!mapInstanceRef.current._loaded) {
					console.warn('⚠️ Map not loaded yet, waiting...');
					// Wait a bit and try again
					setTimeout(() => {
						if (mapInstanceRef.current && LeafletLoader.L) {
							markerRef.current = LeafletLoader.L.marker(
								[lat, lon],
								markerOptions
							).addTo(mapInstanceRef.current);
							console.log('🗺️ Marker created after delay:', !!markerRef.current);
						}
					}, 200);
					return;
				}

				markerRef.current = LeafletLoader.L.marker(
					[lat, lon],
					markerOptions
				).addTo(mapInstanceRef.current);

				// Verify marker was added
				if (!markerRef.current) {
					console.error('❌ Failed to create marker');
					return;
				}

				// Force marker to be visible and update its position
				setTimeout(() => {
					if (markerRef.current && mapInstanceRef.current) {
						// Update marker position to ensure it's correct
						markerRef.current.setLatLng([lat, lon]);
						
						// Force marker element to be visible
						if (markerRef.current.getElement) {
							const markerElement = markerRef.current.getElement();
							if (markerElement) {
								markerElement.style.zIndex = '1000';
								markerElement.style.pointerEvents = 'auto';
								markerElement.style.display = 'block';
							}
						}
						
						// Bring marker to front
						markerRef.current.bringToFront();
						
						console.log('🗺️ Marker visibility forced');
					}
				}, 100);

				const markerPos = markerRef.current.getLatLng();
				console.log(
					'🗺️ Marker created successfully:',
					{
						markerPosition: [markerPos.lat, markerPos.lng],
						requestedPosition: [lat, lon],
						currentMapCenter: mapInstanceRef.current.getCenter(),
						mapBounds: mapInstanceRef.current.getBounds(),
						markerElement: !!markerRef.current.getElement?.(),
					}
				);

				// Center map on marker after it's added (only if not from drag)
				// Use a small delay to ensure map is ready and marker is visible
				if (!updateFromDrag) {
					const centerMap = () => {
						if (mapInstanceRef.current && markerRef.current) {
							// First invalidate size to ensure map dimensions are correct
							mapInstanceRef.current.invalidateSize();

							// Small delay to let invalidateSize take effect
							setTimeout(() => {
								if (mapInstanceRef.current && markerRef.current) {
									// Get marker position to ensure exact centering
									const markerLatLng = markerRef.current.getLatLng();

									// Center on the exact marker coordinates
									mapInstanceRef.current.setView(
										[markerLatLng.lat, markerLatLng.lng],
										zoom,
										{
											animate: false,
										}
									);

									// Force another invalidateSize after centering
									mapInstanceRef.current.invalidateSize();

									const currentCenter = mapInstanceRef.current.getCenter();
									console.log('🗺️ Map centered on marker:', {
										center: currentCenter,
										markerPosition: [markerLatLng.lat, markerLatLng.lng],
										zoom,
										centerLat: currentCenter.lat,
										centerLon: currentCenter.lng,
										latDiff: Math.abs(currentCenter.lat - markerLatLng.lat),
										lonDiff: Math.abs(currentCenter.lng - markerLatLng.lng),
									});
								}
							}, 150);
						}
					};

					// Wait for map to be ready and then center
					if (mapInstanceRef.current.whenReady) {
						mapInstanceRef.current.whenReady(() => {
							setTimeout(centerMap, 250);
						});
					} else {
						setTimeout(centerMap, 250);
					}

					// Additional centering after a longer delay to ensure everything is rendered
					setTimeout(() => {
						if (mapInstanceRef.current && markerRef.current) {
							const markerLatLng = markerRef.current.getLatLng();
							mapInstanceRef.current.invalidateSize();
							mapInstanceRef.current.setView(
								[markerLatLng.lat, markerLatLng.lng],
								zoom,
								{ animate: false }
							);
							console.log('🗺️ Final map centering completed');
						}
					}, 600);
				}

				// Handle marker drag events if editable
				if (editable && onMarkerMove) {
					markerRef.current?.on('dragend', async (e: any) => {
						const marker = e.target;
						const position = marker.getLatLng();
						const newLat = position.lat;
						const newLon = position.lng;

						// Reverse geocode to get new address
						const newAddress = await reverseGeocode(newLat, newLon);

						// Call callback with new coordinates and address
						onMarkerMove(newLat, newLon, newAddress);
					});
				}

				// Add popup if enabled and address provided
				if (showPopup && address && markerRef.current) {
					markerRef.current
						.bindPopup(`<div class="text-sm"><strong>${address}</strong></div>`)
						.openPopup();
				}
			} catch (error) {
				console.error('❌ Error creating marker:', error);
			}
		},
		[zoom, editable, onMarkerMove, reverseGeocode, showPopup]
	);

	const showDefaultMarker = useCallback(() => {
		if (!mapInstanceRef.current || !LeafletLoader.L) return;

		const defaultLatLng: [number, number] = [21.0285, 105.8542]; // Hanoi, Vietnam

		// Remove existing marker
		if (markerRef.current) {
			mapInstanceRef.current.removeLayer(markerRef.current);
		}

		// Create red marker icon
		// Use larger size for better visibility on mobile
		const markerSize = 24;
		const markerBorder = 3;
		const markerAnchor = markerSize / 2;

		const redMarker = LeafletLoader.L.divIcon({
			html: `<div style="
				background-color: #ff5b5b;
				width: ${markerSize}px;
				height: ${markerSize}px;
				border-radius: 50%;
				border: ${markerBorder}px solid white;
				box-shadow: 0 2px 6px rgba(0,0,0,0.4);
				position: relative;
				transform: translate(-50%, -50%);
			"></div>`,
			iconSize: [markerSize, markerSize],
			iconAnchor: [markerAnchor, markerAnchor],
			popupAnchor: [0, -markerAnchor],
			className: 'custom-red-marker',
		});

		// Add default marker
		markerRef.current = LeafletLoader.L.marker(defaultLatLng, {
			icon: redMarker,
		}).addTo(mapInstanceRef.current);
	}, []);

	const geocodeAddress = useCallback(
		async (address: string) => {
			try {
				// Use our backend API for geocoding
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
				const response = await fetch(
					`${API_BASE_URL}/geocoding/search?address=${encodeURIComponent(address)}`
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();

				if (result.success && result.data) {
					const { lat, lon, display_name } = result.data;
					updateMapWithCoords(lat, lon, address);
				} else {
					console.warn('⚠️ No geocoding results found for:', address);
					showDefaultMarker();
				}
			} catch (error) {
				console.error('❌ Error geocoding address:', error);
				// Show marker at default location if geocoding fails
				showDefaultMarker();
			}
		},
		[updateMapWithCoords, showDefaultMarker]
	);

	// Initialize Leaflet dynamically
	useEffect(() => {
		if (typeof window === 'undefined' || LeafletLoader.L) {
			return;
		}

		const initLeaflet = async () => {
			try {
				const leaflet = await import('leaflet');
				LeafletLoader.L = leaflet.default;

				// Fix for default markers in Leaflet with Next.js
				delete (
					LeafletLoader.L.Icon.Default.prototype as unknown as Record<
						string,
						unknown
					>
				)._getIconUrl;
				LeafletLoader.L.Icon.Default.mergeOptions({
					iconRetinaUrl:
						'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
					iconUrl:
						'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
					shadowUrl:
						'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
				});
			} catch (error) {
				console.error('❌ Failed to load Leaflet:', error);
			}
		};

		initLeaflet();
	}, []);

	// Initialize map once - wait for Leaflet to load
	useEffect(() => {
		function initializeMap() {
			if (!mapRef.current || mapInstanceRef.current || !LeafletLoader.L) {
				return;
			}

			const containerWidth = mapRef.current.offsetWidth;
			const containerHeight = mapRef.current.offsetHeight;

			// If container has no size, wait a bit and try again
			if (containerWidth === 0 || containerHeight === 0) {
				setTimeout(() => {
					if (mapRef.current && !mapInstanceRef.current && LeafletLoader.L) {
						initializeMap();
					}
				}, 100);
				return;
			}

			const mapOptions: any = {
				zoomControl: interactive,
				dragging: interactive,
				touchZoom: interactive,
				doubleClickZoom: interactive,
				scrollWheelZoom: interactive,
				boxZoom: interactive,
				keyboard: interactive,
				attributionControl: false,
			};

			// Use provided coordinates if available, otherwise use default (Hanoi)
			const normalizedLat = lat != null ? Number(lat) : undefined;
			const normalizedLon = lon != null ? Number(lon) : undefined;
			const hasValidCoords =
				normalizedLat !== undefined &&
				normalizedLon !== undefined &&
				!isNaN(normalizedLat) &&
				!isNaN(normalizedLon) &&
				isFinite(normalizedLat) &&
				isFinite(normalizedLon);

			const initialLat = hasValidCoords ? normalizedLat : 21.0285;
			const initialLon = hasValidCoords ? normalizedLon : 105.8542;

			console.log('🗺️ Initializing map with coords:', {
				initialLat,
				initialLon,
				hasValidCoords,
				providedLat: normalizedLat,
				providedLon: normalizedLon,
			});

			const map = LeafletLoader.L.map(mapRef.current, mapOptions).setView(
				[initialLat, initialLon],
				zoom
			);

			// Use grayscale tile layer
			LeafletLoader.L.tileLayer(
				'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: '© OpenStreetMap contributors',
					maxZoom: 19,
					className: 'grayscale-map',
				}
			).addTo(map);

			mapInstanceRef.current = map;

			// Wait for map to be fully loaded before marking as ready
			map.whenReady(() => {
				console.log('🗺️ Map ready, invalidating size');
				setTimeout(() => {
					if (mapInstanceRef.current) {
						mapInstanceRef.current.invalidateSize();
						window.dispatchEvent(new Event('resize'));

						// If we have valid coordinates, add marker immediately
						if (
							hasValidCoords &&
							normalizedLat !== undefined &&
							normalizedLon !== undefined &&
							LeafletLoader.L
						) {
							lastCoordsRef.current = {
								lat: normalizedLat,
								lon: normalizedLon,
							};
							console.log(
								'🗺️ Map initialized with coords, adding marker immediately:',
								{
									lat: normalizedLat,
									lon: normalizedLon,
								}
							);
							// Add marker immediately after map is ready
							setTimeout(() => {
								if (mapInstanceRef.current && LeafletLoader.L && !markerRef.current) {
									updateMapWithCoords(normalizedLat, normalizedLon, address, false);
								}
							}, 200);
						}
					}
				}, 100);
			});

			// Also invalidate size after delays to handle dynamic content
			setTimeout(() => {
				if (mapInstanceRef.current) {
					mapInstanceRef.current.invalidateSize();
				}
			}, 300);

			setTimeout(() => {
				if (mapInstanceRef.current) {
					mapInstanceRef.current.invalidateSize();
				}
			}, 1000);
		}

		if (!mapRef.current) {
			return;
		}
		if (mapInstanceRef.current) {
			return;
		}
		if (!LeafletLoader.L) {
			// Wait for Leaflet to load
			const checkLeaflet = setInterval(() => {
				if (LeafletLoader.L && mapRef.current && !mapInstanceRef.current) {
					clearInterval(checkLeaflet);
					initializeMap();
				}
			}, 100);

			// Timeout after 5 seconds
			setTimeout(() => {
				clearInterval(checkLeaflet);
			}, 5000);

			return () => clearInterval(checkLeaflet);
		}

		initializeMap();

		// Cleanup on unmount only
		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove();
				mapInstanceRef.current = null;
				markerRef.current = null;
			}
		};
	}, []); // Only run once on mount

	// Update map when coordinates or address change
	useEffect(() => {
		if (!mapInstanceRef.current || !LeafletLoader.L) {
			return;
		}

		// Normalize coordinates - handle null/undefined
		const normalizedLat = lat != null ? Number(lat) : undefined;
		const normalizedLon = lon != null ? Number(lon) : undefined;

		// Check if coordinates actually changed (including undefined -> defined transition)
		const prevLat = lastCoordsRef.current.lat;
		const prevLon = lastCoordsRef.current.lon;

		// Use precise comparison for numbers
		const latChanged =
			normalizedLat !== prevLat &&
			(normalizedLat !== undefined || prevLat !== undefined);
		const lonChanged =
			normalizedLon !== prevLon &&
			(normalizedLon !== undefined || prevLon !== undefined);
		const coordsChanged = latChanged || lonChanged;

		// Update map with coordinates if provided
		if (
			normalizedLat !== undefined &&
			normalizedLon !== undefined &&
			!isNaN(normalizedLat) &&
			!isNaN(normalizedLon) &&
			isFinite(normalizedLat) &&
			isFinite(normalizedLon)
		) {
			// Always update if coordinates are valid and changed, or if marker doesn't exist
			if (coordsChanged || !markerRef.current) {
				lastCoordsRef.current = { lat: normalizedLat, lon: normalizedLon };

				// Update map - wait for map to be ready
				const updateMap = () => {
					if (mapInstanceRef.current && LeafletLoader.L) {
						console.log('🗺️ Updating map with coords:', {
							lat: normalizedLat,
							lon: normalizedLon,
							address,
							mapLoaded: mapInstanceRef.current._loaded,
							markerExists: !!markerRef.current,
						});
						updateMapWithCoords(normalizedLat, normalizedLon, address, false);
					}
				};

				// Check if map is already loaded
				if (mapInstanceRef.current._loaded) {
					// Map is loaded, update immediately
					setTimeout(() => {
						updateMap();
					}, 50);
				} else {
					// Wait for map to load
					if (mapInstanceRef.current.whenReady) {
						mapInstanceRef.current.whenReady(() => {
							setTimeout(() => {
								updateMap();
							}, 100);
						});
					} else {
						// Poll for map to be ready
						const checkLoaded = setInterval(() => {
							if (mapInstanceRef.current && mapInstanceRef.current._loaded) {
								clearInterval(checkLoaded);
								setTimeout(() => {
									updateMap();
								}, 100);
							}
						}, 50);

						// Timeout after 2 seconds
						setTimeout(() => {
							clearInterval(checkLoaded);
							if (mapInstanceRef.current) {
								updateMap();
							}
						}, 2000);
					}
				}
			}
		} else if (
			address &&
			(!lastCoordsRef.current.lat || !lastCoordsRef.current.lon)
		) {
			// Fallback to geocoding if no coordinates provided (only once)
			geocodeAddress(address);
		} else if (!normalizedLat && !normalizedLon && !address) {
			// Show default marker if no address or coordinates
			if (!markerRef.current) {
				showDefaultMarker();
			}
		}
	}, [
		lat,
		lon,
		address,
		updateMapWithCoords,
		geocodeAddress,
		showDefaultMarker,
	]);

	return (
		<div
			className={`rounded-lg overflow-hidden border border-gray-200 relative w-full ${className}`}
			style={height ? { height, minHeight: height } : { minHeight: '300px' }}
		>
			{editable && (
				<div className="absolute bottom-1 right-1 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md shadow-sm text-xs text-gray-600 border border-gray-200">
					Переместите маркер для уточнения позиции
				</div>
			)}
			<div
				ref={mapRef}
				style={{
					height: '100%',
					width: '100%',
					minHeight: height || '300px',
					position: 'relative',
				}}
				className="w-full h-full"
			/>
		</div>
	);
}
