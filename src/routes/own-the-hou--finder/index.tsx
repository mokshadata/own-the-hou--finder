import { Title } from '@solidjs/meta';
import { query, type RouteDefinition, type RouteProps } from '@solidjs/router';
import { createEffect, createMemo, For, Show, } from 'solid-js';

import { points, bbox, bboxPolygon, transformScale, booleanContains } from "@turf/turf"

import { activeMapSelection, setActiveMapSelection } from '../../stores';

import { csv, json } from "d3-fetch";

import { Map } from "../../components/Mapbox";

const subdivisionsURL = {
  'Avenue Park Replat': 'https://www.har.com/pricetrends/avenue-park-replat-realestate/16111',

  'Robins Landing': 'https://www.har.com/pricetrends/robins-landing-realestate/16207',
  'Pineapple Square': 'https://www.har.com/geomarketarea/medical-center-south-realestate/92',
  'Waverly Gardens': 'https://www.har.com/pricetrends/waverly-gardens-realestate/2155',
  'Allison Park': 'https://www.har.com/pricetrends/allison-park-realestate/16107',
  'Flower City': 'https://www.har.com/pricetrends/flower-city-realestate/2220',
  'Green Ridge North': 'https://www.har.com/pricetrends/green-ridge-north-realestate/2554',
  'Northwest Park': 'https://www.har.com/pricetrends/northwest-park-realestate/3402',
  'Central Gardens Ext': 'https://www.har.com/pricetrends/central-gardens-77026-realestate/1582',
  'Highland Heights': 'https://www.har.com/pricetrends/highland-heights-realestate/3532',
  'Mansfield Park': 'https://www.har.com/pricetrends/mansfield-park-realestate/15773',

  "Highland Acre Homes": "https://www.har.com/pricetrends/highland-acre-homes-realestate/3446",
  "Carver Estates": "https://www.har.com/pricetrends/carver-estates-realestate/3554",
  "Ryon": "https://www.har.com/pricetrends/ryon-realestate/594",
  "Meadow Creek Village": "https://www.har.com/pricetrends/meadow-creek-village-realestate/865",
  "Stratton Place": "https://www.har.com/pricetrends/stratton-place-realestate/1141",
  "Prairie Home": "https://www.har.com/pricetrends/prairie-home-realestate/126",
  "Sydnor": "https://www.har.com/pricetrends/sydnor-realestate/1010",
  "Riverside Terrace": "https://www.har.com/pricetrends/riverside-terrace-houston-realestate/1069",
  "Wilson Wm A": "https://www.har.com/pricetrends/wilson-wm-a-realestate/119",
  "Fidelity": "https://www.har.com/pricetrends/fidelity-realestate/1696",
}

const orgReferences = {
  'Avenue CDC': 'https://avenuecdc.org/affordable-homes/for-sale/',
  'Fifth Ward CRC': 'https://www.fifthwardcrc.org/programs-services/real-estate/residential-properties-for-sale/',
  'Tejano': 'https://www.tejanocenter.org/programs-resources/supportive-housing/affordable-housing-and-community-redevelopment',
  'Habitat for Humanity': 'https://www.houstonhabitat.org/homeownership-process',
  'HCLT': 'https://www.houstonclt.org/how-to-buy',
}

// Async data loading: a query (cached per key) read through a memo — the
// surrounding <Loading> boundary (in App.tsx) shows its fallback until the
// promise settles. Swap the static JSON for any API endpoint.
const getListings = query(async () => {
  // Same-origin URLs need an explicit origin when this runs during SSR
  // (getRequestEvent() is undefined in the browser, where location wins).
  const origin = location.origin;

  const listings = await json((new URL('/own-the-house--finder/data/combined-20261019--single-family.json', origin)).toString());
  const listingsWithGeocoding = await csv((new URL('/own-the-house--finder/data/combined-20261019--single-family.csv', origin)).toString());

  const harrisCountyProgramLimits = await json((new URL('/own-the-house--finder/data/unincorp-harris-county.geojson', origin)).toString());
  const cohProgramLimits = await json((new URL('/own-the-house--finder/data/coh-city-limits.geojson', origin)).toString());

  const programBoundsGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        ...harrisCountyProgramLimits.features[0],
        properties: {
          ...harrisCountyProgramLimits.features[0].properties,
          type: 'program-bounds',
          programs: ['County DPA'],
          boundName: 'Harris County unincorporated',
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
            boundName: 'City of Houston',
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

  const houses = listings.map((item) => {
    const listing = listingsWithGeocoding.find((geo) => (geo.harURL === item.harURL))

    return {
      ...item,
      latitude: listing['Geocodio Latitude'] * 1,
      longitude: listing['Geocodio Longitude'] * 1,
      houseNumber: listing['Geocodio House Number'] * 1,
      schoolDistrict: listing['Unified School District Name'],
      streetName: listing['Geocodio Street'],
      urlParts: item.harURL.split('/'),
    }
  })
  .map((item) => ({
    ...item,
    id: `${item.urlParts[item.urlParts.length - 1].split('?')[0]}` * 1,
  }))
  .map((item) => ({
    ...item,
    subdivisionURL: subdivisionsURL[item.subdivision],
    agencyURL: orgReferences[item.agency],
  }))
  .toSorted((a, b) => (
    `${a.subdivision} ${a.streetName} ${(a.houseNumber + '').padStart(6, '0')}`
      .localeCompare(`${b.subdivision} ${b.streetName} ${(b.houseNumber + '').padStart(6, '0')}`)
  ))

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
        agencies: Object.entries((Object.groupBy(item.houses, (house) => (house.agency))))
          .map(([agency, houses]) => ({
            name: agency,
            url: orgReferences[agency],
            count: houses?.length,
          })),
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
                            }).format(item.properties.price * 1 || item.properties.priceListed * 1)}
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
                      {
                        activeSubdivision().properties.agencies.map((item) => (
                          <p class="mb-0">
                             {item.count} house{item.count > 1 && 's' || ''} available through <a target="_blank" href={item.url}><strong>{item.name}</strong></a>
                          </p>
                        ))
                      }
                  <p class="mb-0 mt-2">
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
                          }).format(activeFeature().properties.price * 0.05)}</strong>.
                        </p>
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
