import { Title } from '@solidjs/meta';
import { query, type RouteDefinition, type RouteProps } from '@solidjs/router';
import { getRequestEvent } from '@solidjs/web';
import { createEffect, createMemo, For, Show, } from 'solid-js';

import { points, bbox, bboxPolygon, transformScale } from "@turf/turf"

import { activeMapSelection, setActiveMapSelection } from '../../stores';

import { csv, json } from "d3-fetch";

import { Map } from "../../components/Mapbox";

const subdivisions = {
  16579: 'Avenue Park Replat',
  16114: 'Robins Landing',
  17086: 'Pineapple Square',
  16586: 'Pineapple Square',
  17440: 'Waverly Gardens',
  17659: 'Waverly Gardens',
  17657: 'Allison Park',
  17629: 'Allison Park',
  17088: 'Allison Park',
  17625: 'Allison Park',
  17648: 'Allison Park',
  17607: 'Allison Park',
  17656: 'Allison Park',

  3165: 'Flower City',
  17633: 'Central Gardens Ext',
  17621: 'Highland Heights',
  2966: 'Highland Heights',

  17660: 'Mansfield Park', // 17648, 17656
  17642: 'Mansfield Park', // 17648, 17656
  17626: 'Mansfield Park', // 17648, 17656
  17560: 'Mansfield Park', // 17648, 17656
  17549: 'Mansfield Park', // 17648, 17656
  17635: 'Mansfield Park', // 17648, 17656
}

const subs = {
  17656310: 'Mansfield Park',
  17648359: 'Mansfield Park',
}

const subdivisionsURL = {
  'Avenue Park Replat': 'https://www.har.com/pricetrends/avenue-park-replat-realestate/16111',

  'Robins Landing': 'https://www.har.com/pricetrends/robins-landing-realestate/16207',
  'Pineapple Square': 'https://www.har.com/geomarketarea/medical-center-south-realestate/92',
  'Waverly Gardens': 'https://www.har.com/pricetrends/waverly-gardens-realestate/2155',
  'Allison Park': 'https://www.har.com/pricetrends/allison-park-realestate/16107',
  'Flower City': 'https://www.har.com/pricetrends/flower-city-realestate/2220',
  'Central Gardens Ext': 'https://www.har.com/pricetrends/central-gardens-77026-realestate/1582',
  'Highland Heights': 'https://www.har.com/pricetrends/highland-heights-realestate/3532',
  'Mansfield Park': 'https://www.har.com/pricetrends/mansfield-park-realestate/15773',
}

const organizations = {
  'Avenue Park Replat': 'Avenue CDC',
  'Robins Landing': 'Fifth Ward CRC',
  'Pineapple Square': 'Tejano',
  'Waverly Gardens': 'Tejano',
  'Allison Park': 'Tejano',
  'Flower City': 'Tejano',
  'Central Gardens Ext': 'Houston Habitat',
  'Highland Heights': 'Houston Habitat',
  'Mansfield Park': 'HCLT',
}

// Async data loading: a query (cached per key) read through a memo — the
// surrounding <Loading> boundary (in App.tsx) shows its fallback until the
// promise settles. Swap the static JSON for any API endpoint.
const getListings = query(async () => {
  // Same-origin URLs need an explicit origin when this runs during SSR
  // (getRequestEvent() is undefined in the browser, where location wins).
  const origin = getRequestEvent()?.request.url ?? location.origin;

  const listings = await json((new URL('./data/houses.json', origin)).toString());
  const listingsWithGeocoding = await csv((new URL('./data/houses.csv', origin)).toString());

  const houses = listings.map((item, index) => ({
    ...item,
    latitude: listingsWithGeocoding[index]['Geocodio Latitude'] * 1,
    longitude: listingsWithGeocoding[index]['Geocodio Longitude'] * 1,
    houseNumber: listingsWithGeocoding[index]['Geocodio House Number'] * 1,
    streetName: listingsWithGeocoding[index]['Geocodio Street'],
    urlParts: item.harURL.split('/'),
  }))
  .map((item, index) => ({
    ...item,
    id: `${item.urlParts[item.urlParts.length - 1].split('?')[0]}` * 1,
  }))
  .map((item, index) => ({
    ...item,
    subdivision: subs[item.id] || subdivisions[Math.floor(item.id/1000)],
  }))
  .map((item, index) => ({
    ...item,
    subdivisionURL: subdivisionsURL[item.subdivision],
    agency: organizations[item.subdivision],
  }))
  .toSorted((a, b) => (`${a.agency} ${a.subdivision} ${a.streetName} ${a.houseNumber}`.localeCompare(`${b.agency} ${b.subdivision} ${b.streetName} ${b.houseNumber}`)))

  const groupedBySubs = Object.entries(Object.groupBy(houses, (house) => (house.subdivision)))
    .map(([subdivision, houses]) => ([subdivision, {
      geoCollection: houses?.map((house) => ([house.longitude, house.latitude])),
      houses,
      subdivisionURL: subdivisionsURL[subdivision],
      subdivisionURLParts: subdivisionsURL[subdivision].split('/'),
    }]))
    .map(([subdivision, collection]) => ([subdivision, {
      ...collection,
      feature: transformScale(bboxPolygon(bbox(points(collection.geoCollection))), 2),
      subdivisionID: collection.subdivisionURLParts[collection.subdivisionURLParts.length - 1] * 1,
    }]))
    .map(([subdivision, item]) => ({
      id: item.subdivisionID,
      type: 'Feature',
      ...item.feature,
      // geometry: {
      //   ...item.feature.geometry,
      //   coordinates: [item.feature.geometry.coordinates],
      // },
      properties: {
        subdivisionName: subdivision,
        houses: item.houses.map((house) => (house.id)),
        houseCount: item.houses.length,
        subdivisionURL: item.subdivisionURL,
      },
    }))

  const geoCollection = houses.map((item) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [item.longitude, item.latitude],
    },
    id: item.id,
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
    features: [...geoCollection, ...groupedBySubs],
  }

  return {houses, geoJSON}

}, 'listings');


// Starts the fetch as soon as navigation begins, before the page renders.
export const route = {
  preload: () => void getListings(),
} satisfies RouteDefinition;

export default function Listings() {
  const listings = createMemo(() => getListings());
  const activeFeature = () => (listings().houses.find((item) => (item.id === activeMapSelection())))

  createEffect(() => (listings()), (value) => {
    console.log({ houses: value })
  })

  createEffect(() => (activeFeature()), (value) => {
    console.log({active: value})
  })

  return (
    <main class="py-5">
      <Title>{`Listings`}</Title>
      <div class="container-fluid">
        <div class="row">
          <div class="col-8">
            <div class="container-fluid">
              <div class="row g-3">

                <For each={listings().houses}>{(item, i) => (
                  <div class="col-12 col-md-4">
                    <div class={`card ${item.id === activeMapSelection() && 'bg-primary-subtle' || ''}`} onClick={() => {setActiveMapSelection(item.id)}}>
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
                        <span class="badge rounded-pill border border-info text-primary me-1">{item.subdivision}</span>
                        <span class="badge rounded-pill border border-info text-primary me-1">{item.agency}</span>
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
          </div>
          <div class="col-4">
            <div class="sticky-top" style={{height: '600px'}}>
              <Map
                center={{lat: 29.749907, long: -95.358421,}}
                zoom={10}
                geojson={listings().geoJSON}
              />
              {/* <Show when={activeFeature()}>
                <p>
                  <a href={activeFeature().harURL}>{activeMapSelection()}</a>
                </p>
              </Show> */}
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}
