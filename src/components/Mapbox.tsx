import * as mapboxgl from 'mapbox-gl/esm';
import 'mapbox-gl/dist/mapbox-gl.css';

import type {
  GeoJSON
} from 'geojson';

import { merge, onSettled, createEffect } from 'solid-js';
import { centroid } from "@turf/turf"

import { activeMapSelection, setActiveMapSelection } from '../stores';

export function Map(props: {
  center: {
    long: number,
    lat: number,
  },
  zoom: number,
  geojson: GeoJSON,
}) {

  let mapElement;
  let map

  onSettled(() => {
    map = new mapboxgl.Map({
        accessToken: 'pk.eyJ1IjoicGFuZGFmdWxtYW5kYSIsImEiOiI2ZExMSUFRIn0.EReWG9JyWfuekKvxXhCQpw', // associates the map with your Mapbox account and its permissions
        container: 'map', // container ID
        center: [props.center.long, props.center.lat], // starting position [lng, lat]. Note that lat must be set between -90 and 90
        zoom: props.zoom, // starting zoom
    });
    window.map = map

    map.on('load', () => {
      map.addSource('houses', {
        type: 'geojson',
        data: props.geojson,
      })

      map.addLayer({
        'id': 'subdivision-on-map',
        'type': 'fill',
        'source': 'houses',
        'filter': ['==', '$type', 'Polygon'],
        'layout': {},
        'paint': {
          'fill-color': '#0080ff', // blue color fill
          'fill-opacity': 0.5,
        },
      });
      map.addLayer({
        'id': 'subdivision-on-map-border',
        'type': 'line',
        'source': 'houses',
        'filter': ['==', '$type', 'Polygon'],
        'layout': {},
        'paint': {
          'line-color': '#0080ff',
          'line-width': 1,
        },
      });
      map.addLayer({
        'id': 'houses-on-map',
        'type': 'circle',
        'source': 'houses',
        'filter': ['==', '$type', 'Point'],
        'paint': {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 4,   // At zoom level 5 or lower, radius is 2px
            15, 8  // At zoom level 15 or higher, radius is 20px
          ],
            'circle-color': [
                'case',
                ['==', ['feature-state', 'selected'], true],
                '#000', // Color when selected
                '#B42222',  // Default color
            ],
        },
      });
      map.on('mousemove', 'houses-on-map', (e) => {
        if (e.features.length > 0) {
          // console.log(e.features[0]);

          map.getCanvas().style.cursor = 'pointer';

          setActiveMapSelection(e.features[0].id)
        }
      })

    })
  })

  const activeFeature = () => (props.geojson.features.find((item) => (item.id === activeMapSelection())))
  const activeSubdivision = () => (props.geojson.features.find((item) => (item.properties.houses?.includes(activeMapSelection()))))
  const focusFeatureCoords = () => (activeFeature().geometry.coordinates)
  const focusSubdivisionCoords = () => (activeSubdivision() && centroid(activeSubdivision().geometry).geometry.coordinates || [])

  createEffect(() => (activeSubdivision()), (value, previous) => {
    console.log({
      sub: value,
      center: focusSubdivisionCoords(),
    })
  })

  createEffect(() => (activeMapSelection()), (value, previous) => {
    if (!map) {return}

    if (previous) {
      map.setFeatureState(
        { source: 'houses', id: previous },
        { selected: false }
      );
    }

    map.setFeatureState(
      { source: 'houses', id: value },
      { selected: true }
    );
    map.flyTo({
      center: focusSubdivisionCoords(),
      zoom: 16,
    })
  })

  return (
    <div
      id="map"
      class="col-12 h-100"
      ref={mapElement}
    ></div>
  )
}