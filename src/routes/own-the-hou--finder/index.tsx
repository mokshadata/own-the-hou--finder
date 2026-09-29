import { Title } from '@solidjs/meta';
import { query, type RouteDefinition, type RouteProps } from '@solidjs/router';
import { getRequestEvent } from '@solidjs/web';
import { createMemo, For } from 'solid-js';
import { paths } from '../../router';

import { csv, json } from "d3-fetch";

import { Map } from "../../components/Mapbox";


// Async data loading: a query (cached per key) read through a memo — the
// surrounding <Loading> boundary (in App.tsx) shows its fallback until the
// promise settles. Swap the static JSON for any API endpoint.
const getListings = query(async () => {
  // Same-origin URLs need an explicit origin when this runs during SSR
  // (getRequestEvent() is undefined in the browser, where location wins).
  const origin = getRequestEvent()?.request.url ?? location.origin;

  const listings = await json((new URL('/data/houses.json', origin)).toString());
  const listingsWithGeocoding = await csv((new URL('/data/houses.csv', origin)).toString());

  const houses = listings.map((item, index) => ({
    ...item,
    latitude: listingsWithGeocoding[index]['Geocodio Latitude'],
    longitude: listingsWithGeocoding[index]['Geocodio Longitude'],
  }))

  const geoCollection = houses.map((item) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [item.longitude, item.latitude],
    },
    properties: {
      harURL: item.harURL,
      imageURL: item.imageURL,
      price: item.price,
      addressLine1: item.addressLine1,
      addressLine2: item.addressLine2,
      city: item.city,
      state: item.state,
      zip: item.zip,

      status: item.statusTitle,
      beds: item.beds,
      fullBaths: item.fullBaths,
      halfBaths: item.halfBaths,
      pricePer: item.pricePer,
      interiorSize: item.interiorSize,
      buildingType: item.buildingType,
    },
  }))

  const geoJSON = {
    type: 'FeatureCollection',
    features: geoCollection,
  }

  return {houses, geoJSON}

}, 'listings');


// Starts the fetch as soon as navigation begins, before the page renders.
export const route = {
  preload: () => void getListings(),
} satisfies RouteDefinition;

export default function Listings() {
  const listings = createMemo(() => getListings());

  return (
    <main class="py-5">
      <Title>{`Listings`}</Title>
      <div class="container">
        <div class="row mb-4 p-3" style={{height: '800px'}}>
          <Map
            center={{lat: 29.749907, long: -95.358421,}}
            zoom={10}
            geojson={listings().geoJSON}
          />
        </div>
        <div class="row g-3">

          <For each={listings().houses}>{(item, i) => (
            <div class="col-12 col-md-4 col-xxl-3">
              <div class="card">
                <img src={item.imageURL} class="card-img-top object-fit-cover border-bottom border-gray" style="height: 15em;"/>
                <div class="card-body">
                  <div class="card-title">
                    <h5>
                      {new Intl.NumberFormat("en-US",{
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(item.price * 1)}
                    </h5>

                    <span class="badge rounded-pill border border-info text-primary me-1">{item.statusTitle}</span>
                  </div>
                  <p class="card-text">
                    {item.addressLine1}<br/>{item.addressLine2}
                  </p>
                  <span class="badge rounded-pill border border-info text-primary me-1">{item.beds} bedrooms</span>
                  <span class="badge rounded-pill border border-info text-primary me-1">{item.fullBaths + ((item.halfBaths || 0)/2)} bathrooms</span>
                  <span class="badge rounded-pill border border-info text-primary me-1">{item.interiorSize} sqft.</span>
                  <span class="badge rounded-pill border border-info text-primary me-1">{item.buildingType}</span>
                </div>
                <div class="card-footer">
                  <a href={item.harURL} class="btn btn-primary" target="_blank">Go somewhere</a>
                </div>
              </div>
            </div>
          )}</For>
          
        </div>
      </div>
    </main>
  );
}
