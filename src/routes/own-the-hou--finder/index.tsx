import { Title } from '@solidjs/meta';
import { query, type RouteDefinition, type RouteProps } from '@solidjs/router';
import { getRequestEvent } from '@solidjs/web';
import { createEffect, createMemo, For, Show, } from 'solid-js';

import { points, bbox, bboxPolygon, transformScale, booleanContains } from "@turf/turf"

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

const orgReferences = {
  'Avenue CDC': 'https://avenuecdc.org/affordable-homes/for-sale/',
  'Fifth Ward CRC': 'https://www.fifthwardcrc.org/programs-services/real-estate/residential-properties-for-sale/',
  'Tejano': 'https://www.tejanocenter.org/programs-resources/supportive-housing/affordable-housing-and-community-redevelopment',
  'Houston Habitat': 'https://www.houstonhabitat.org/homeownership-process',
  'HCLT': 'https://www.houstonclt.org/how-to-buy',
}

// Async data loading: a query (cached per key) read through a memo — the
// surrounding <Loading> boundary (in App.tsx) shows its fallback until the
// promise settles. Swap the static JSON for any API endpoint.
const getListings = query(async () => {
  // Same-origin URLs need an explicit origin when this runs during SSR
  // (getRequestEvent() is undefined in the browser, where location wins).
  const origin = getRequestEvent()?.request.url ?? location.origin;

  const listings = await json((new URL('/own-the-hou--finder/data/houses.json', origin)).toString());
  const listingsWithGeocoding = await csv((new URL('/own-the-hou--finder/data/houses.csv', origin)).toString());

  const harrisCountyProgramLimits = await json((new URL('/own-the-hou--finder/data/unincorp-harris-county.geojson', origin)).toString());
  const cohProgramLimits = await json((new URL('/own-the-hou--finder/data/coh-city-limits.geojson', origin)).toString());

  const programBoundsGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        ...harrisCountyProgramLimits.features[0],
        properties: {
          ...harrisCountyProgramLimits.features[0].properties,
          type: 'program-bounds',
          programs: ['County DPA'],
        },
        id: 100,
      },
      ...cohProgramLimits.features
        .filter((feature) => (feature.properties["ENTITY_NAM"] === "CITY OF HOUSTON"))
        .map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            type: 'program-bounds',
            programs: ['CoH Homebuyer', 'HCLT Homebuyer Choice Program'],
          }
        }))
    ],
  }

  function getPotentialPrograms(feature) {
    if (feature.properties.agency === 'HCLT') {
      return ['HCLT Program', 'Texas Homebuyer', 'TSAHC']
    }

    return [...
      programBoundsGeoJSON.features
        .filter((programBounds) => (booleanContains(programBounds, feature)))
        .map((programBounds) => (programBounds.properties.programs))
        .reduce((result, current) => ([...result, ...current]), []),
        'Texas Homebuyer', 'TSAHC',
    ]

    
  }

  const houses = listings.map((item, index) => ({
    ...item,
    latitude: listingsWithGeocoding[index]['Geocodio Latitude'] * 1,
    longitude: listingsWithGeocoding[index]['Geocodio Longitude'] * 1,
    houseNumber: listingsWithGeocoding[index]['Geocodio House Number'] * 1,
    schoolDistrict: listingsWithGeocoding[index]['Unified School District Name'],
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
    agencyURL: orgReferences[organizations[item.subdivision]],
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
        agency: organizations[subdivision],
        agencyURL: orgReferences[organizations[subdivision]],

        type: 'subdivision',
      },
    }))

  const geoCollection = houses.map(({id, latitude, longitude, ...item}) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    id: id,
    properties: {
      ...item,

      type: 'listing',
    },
  }))
  .map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      programs: getPotentialPrograms(feature),
    }
  }))

  const geoJSON = {
    type: 'FeatureCollection',
    features: [...geoCollection, ...groupedBySubs, ...programBoundsGeoJSON.features, ],
  }

  return {houses, geoJSON}

}, 'listings');


// Starts the fetch as soon as navigation begins, before the page renders.
export const route = {
  preload: () => void getListings(),
} satisfies RouteDefinition;

export default function Listings() {
  const listings = createMemo(() => getListings());
  const activeFeature = () => (listings().geoJSON.features.find((item) => (item.id === activeMapSelection() && item.properties.type === 'listing')))
  const activeSubdivision = () => (listings().geoJSON.features.find((item) => (item.properties.houses?.includes(activeMapSelection()))))
  // const focusFeatureCoords = () => (activeFeature().geometry.coordinates)
  // const focusSubdivisionCoords = () => (activeSubdivision() && centroid(activeSubdivision().geometry).geometry.coordinates || [])


  createEffect(() => (listings()), (value) => {
    console.log({ houses: value })
  })

  createEffect(() => (activeFeature()), (value) => {
    console.log({active: value})
  })

  return (
    <main class="py-5">
      <div class="container-fluid">
        <div class="row">
          <div class="col-8">
            <div class="container-fluid">
              <div class="row g-3">

                <For each={listings().geoJSON.features.filter((feature) => (feature.properties.type === 'listing'))}>{(item, i) => (
                  <div class="col-12 col-lg-6" role="button" data-listing={`listing-${item.id}`}>
                    <div class={`card ${item.id === activeMapSelection() && 'bg-primary-subtle' || ''}`} onClick={() => {setActiveMapSelection(item.id)}}>
                      <img src={item.properties.imageURL} class="card-img-top object-fit-cover border-bottom border-gray" style="height: 15em;"/>
                      <div class="card-body">
                        <div class="card-title">
                          <h5>
                            {new Intl.NumberFormat("en-US",{
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(item.properties.price * 1)}
                          </h5>

                          <span class="badge rounded-pill border border-primary text-primary me-1">{item.properties.statusTitle}</span>
                        </div>
                        <p class="card-text mb-0">
                          {item.properties.addressLine1}<br/>{item.properties.addressLine2}
                        </p>
                        <span class="badge rounded-pill border border-primary text-primary me-1">{item.properties.subdivision}</span>
                        {/* <span class="badge rounded-pill border border-primary text-primary me-1">{item.properties.agency}</span> */}
                        <span class="badge rounded-pill border border-primary text-primary me-1">{item.properties.beds} bedrooms</span>
                        <span class="badge rounded-pill border border-primary text-primary me-1">{item.properties.fullBaths + ((item.properties.halfBaths || 0)/2)} bathrooms</span>
                        <span class="badge rounded-pill border border-primary text-primary me-1">{item.properties.interiorSize} sqft.</span>
                        <span class="badge rounded-pill border border-primary text-primary me-1">{item.properties.buildingType}</span>
                        <span class="badge rounded-pill border border-primary text-primary me-1">{item.properties.schoolDistrict}</span>
                        <p class="card-text mb-0 mt-2">
                          <small>
                          <strong>Available Down Payment Assistance Programs</strong>
                          </small>
                        </p>
                        <For each={item.properties.programs}>{(program) => (
                          <span class="badge rounded-pill border border-info text-info me-1">{program}</span>
                        )}</For>
                      </div>
                    </div>
                  </div>
                )}</For>

              </div>
            </div>
          </div>
          <div class="col-4">
            <div class="sticky-top" style={{height: '45vh'}}>
              <Map
                center={{lat: 29.749907, long: -95.358421,}}
                zoom={10}
                geojson={listings().geoJSON}
              />
              <Show when={activeFeature()}>
                <div class="mt-1">
                  <div class="row">
                    <div class="col">                      
                      <h2>{activeFeature().properties.subdivision}</h2>
                      <p class="mb-0">{activeSubdivision().properties.houseCount} house{activeSubdivision().properties.houseCount > 1 && 's' || ''} available in subdivision through <a target="_blank" href={activeSubdivision().properties.agencyURL}><strong>{activeSubdivision().properties.agency}</strong></a></p>
                  <p class="mb-0 mt-0">
                    <strong>Recommended Down Payment Range (3 - 20%)</strong>
                  </p>

                  <div class="progress-stacked">
                    <div class="progress" role="progressbar" aria-label="Segment one" aria-valuenow="3" aria-valuemin="0" aria-valuemax="100" style="width: 3%">
                      <div class="progress-bar" style="background: var(--bs-progress-bg);"></div>
                    </div>
                    <div class="progress" role="progressbar" aria-label="Segment two" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100" style="width: 17%">
                      <div class="progress-bar bg-info progress-bar-striped progress-bar-animated"></div>
                    </div>
                  </div>
                  <p class="mb-1">
                    <strong>{new Intl.NumberFormat("en-US",{
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(activeFeature().properties.price * 0.03)}</strong> to <strong>{new Intl.NumberFormat("en-US",{
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(activeFeature().properties.price * 0.2)}</strong>
                  </p>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col">

<div class="overflow-y-scroll" style="height: 28vh;">
                  <p>Depending on your household income, you may qualify for Down Payment Assistance through: <br/> {activeFeature().properties.programs.join(', ')}.</p>
                  <Show when={activeFeature().properties.agency === 'HCLT'}>
                    <p>You can received up to $150,000 in financial assistance grants through <a href={activeFeature().properties.agencyURL} target="_blank">Houston Community Land Trust</a> to help lower the cost of buying this home.</p>
                  </Show>
                  <p>The Texas Homebuyer Program or Texas State Affordable Housing Corporation may be able to offer you up to 5% of the purchase price, or <strong>{new Intl.NumberFormat("en-US",{
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(activeFeature().properties.price * 0.05)}</strong>.</p>

</div>

                    </div>

                  </div>

                  <div class="btn-group">
                    <a class="btn btn-outline-primary" target="_blank" href={activeFeature().properties.harURL}>See Listing on HAR</a>
                    <a class="btn btn-outline-primary" target="_blank" href={activeFeature().properties.agencyURL}>Get DPA with <strong>{activeFeature().properties.agency}</strong></a>
                  </div>
                </div>
              </Show>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}
