import * as mapboxgl from 'mapbox-gl/esm';
import 'mapbox-gl/dist/mapbox-gl.css';

import type {
  GeoJSON
} from 'geojson';

import { merge, onSettled } from 'solid-js';

export function Map(props: {
  center: {
    long: number,
    lat: number,
  },
  zoom: number,
  geojson: GeoJSON,
}) {

  let mapElement;

  onSettled(() => {
    const map = new mapboxgl.Map({
        accessToken: 'pk.eyJ1IjoicGFuZGFmdWxtYW5kYSIsImEiOiI2ZExMSUFRIn0.EReWG9JyWfuekKvxXhCQpw', // associates the map with your Mapbox account and its permissions
        container: 'map', // container ID
        center: [props.center.long, props.center.lat], // starting position [lng, lat]. Note that lat must be set between -90 and 90
        zoom: props.zoom, // starting zoom
    });

    map.on('load', () => {
      map.addSource('houses', {
        type: 'geojson',
        data: props.geojson,
      })
      map.addLayer({
        'id': 'houses-on-map',
        'type': 'circle',
        'source': 'houses',
        'paint': {
            'circle-radius': 6,
            'circle-color': '#B42222'
        },
        'filter': ['==', '$type', 'Point']
      });
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