import { Title } from '@solidjs/meta';
import { query, type RouteDefinition, type RouteProps } from '@solidjs/router';
import { createEffect, createMemo, For, Show, Errored, onSettled, createSignal} from 'solid-js';

import { DPATool, DPAProgramsList, DPAProgram, DPAProgramBadge, DPAProgramSummary, getMatchingPrograms } from 'own-the-hou--tools';

import { FinderDrawerProvider, FinderDrawer, FinderController, FinderDrawerPanel } from '../../components/Sidebar';

import { points, bbox, bboxPolygon, transformScale, } from "@turf/turf"

import {
  activeMapSelection, setActiveMapSelection,
  statusesToKeep, setStatusesToKeep
} from '../../stores';

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

  const listings = await json((new URL('/own-the-hou--finder/data/combined-20261019--single-family.json', origin)).toString());
  const listingsWithGeocoding = await csv((new URL('/own-the-hou--finder/data/combined-20261019--single-family.csv', origin)).toString());

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
      programs: getMatchingPrograms({
        coordinates: feature.geometry.coordinates, // [-95.374543, 29.850715],
        // householdSize: householdSize(),
        // annualIncome: householdIncome(),
        // coordinates: [-95.484657, 29.930173],
        houseListingPrice: feature.properties.price,
      }),//getPotentialPrograms(feature),
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
  const statusHousingCount = () => (
    Object.entries(
      Object.groupBy(
        listings().geoJSON.features.filter((item) => (item.properties.type === 'listing')),
        (item) => (item.properties.statusTitle)
      )
    ).map(([statusName, properties]) => ({
      statusName,
      statusSlug: statusName.replace(' ', '-'),
      count: properties?.length,
    }))
    .toSorted((a, b) => (a.statusName.localeCompare(b.statusName)))
  )

  return (
    <FinderDrawerProvider>
      <FinderDrawer
        scroll={true}
        backdrop={false}
        tabindex={-1}
        label="finder-sidebar"
        style={{'background-color': 'rgba(255, 255, 255, 0.75)'}}
        header={(
        <div class="d-flex flex-column w-100">
          <nav class="drawer-title navbar gap-3 bg-dark p-3 w-100" data-bs-theme="dark">
            <a href="#" class="navbar-brand">
              <img
                src="https://ownthehou.org/wp-content/themes/twentytwentyfive--own-the-hou/assets/images/logo-header.svg"
                style="height: 44.9833px"
              />
              <span>Home Finder</span>
            </a>
            <FinderController/>
          </nav>
          <div style={{height: '40vh', width: '100%'}}>
            <Map
              center={{lat: 29.749907, long: -95.358421,}}
              zoom={10}
              geojson={listings().geoJSON}
            />
          </div>
        </div>
      )}
      footer={(<Show when={activeFeature()}>
        <div class="btn-group w-100" role="group">
          <a class="btn btn-outline theme-primary border border-2 border-primary rounded-0" target="_blank" href={activeFeature().properties.harURL}>View listing</a>
          <a class="btn btn-outline theme-primary border border-2 border-primary rounded-0" target="_blank" href={activeFeature().properties.agencyURL}>Go to <strong>{activeFeature().properties.agency}</strong></a>
        </div>
      </Show>)}
      >
        <Show when={activeFeature()}>
          <div class="px-4 pt-4">
            <h4 class="fg-accent fw-bold">Neighborhood: {activeFeature().properties.subdivision}</h4>
            <h4>
              {activeFeature().properties.addressLine1}<br/>
              {activeFeature().properties.addressLine2}
            </h4>
            {
              activeSubdivision().properties.agencies.map((item) => (
                <p class="mb-0">
                  {item.count} house{item.count > 1 && 's' || ''} available through <a target="_blank" href={item.url}><strong>{item.name}</strong></a>
                </p>
              ))
            }
            <hr class="border-1 mb-4 border-primary"/>
            <h4 class="fg-accent fw-bold">Down Payment Assistance Information</h4>
            <p class="mb-0 mt-2 fw-semibold">
              Recommended Down Payment Range (3.5 - 5%)
            </p>

            <div class="progress-stacked border border-1 border-primary mb-1">
              <div class="progress" role="progressbar" aria-label="Minimum down payment" aria-valuenow="3.5" aria-valuemin="0" aria-valuemax="100" style="width: 3.5%">
                <div class="progress-bar" style="background: var(--bs-progress-bg);"></div>
              </div>
              <div class="progress" role="progressbar" aria-label="Recommended down payment" aria-valuenow="5" aria-valuemin="0" aria-valuemax="100" style="width: 5%">
                <div class="progress-bar bg-info progress-bar-striped progress-bar-animated"></div>
              </div>
            </div>
            <p class="mb-1">
              <span class="border-bottom border-1 border-black fst-italic">{new Intl.NumberFormat("en-US",{
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format((activeFeature().properties.price || activeFeature().properties.priceListed) * 0.035)}</span> to <span class="border-bottom border-1 border-black fst-italic">{new Intl.NumberFormat("en-US",{
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format((activeFeature().properties.price || activeFeature().properties.priceListed) * 0.05)}</span>
            </p>
            <p class="mt-6">Depending on your household income, you may qualify for Down Payment Assistance through:</p>
          </div>
          <div class="accordion accordion-sm theme-primary">
            {activeFeature().properties.programs.map((program) => (
              <DPAProgramSummary
                program={program}
                houseListingPrice={() => (activeFeature().properties.price)}
                downPaymentPercentLower={() => (0.035)}
                downPaymentPercentUpper={() => (0.05)}
              />
            ))}
          </div>
        </Show>
      </FinderDrawer>
      <FinderDrawerPanel>
        <div class="d-flex flex-column p-4" style={{'max-width': '1200px'}}>
          <div class="alert theme-primary d-flex flex-column m-4 sticky-top" role="alert">
            <h4 class="alert-heading mb-2">
              Affordable Home Finder
              <FinderController/>
            </h4>
            <p>Every listing on this map comes from an Own the HOU collaborative partner, with the down payment assistance programs that may apply based on where the home is located.</p>
            <div class="d-flex">              
              {statusHousingCount().map((status) => (
                <div class="form-field me-8">
                  <div class="switch theme-primary">
                    <input
                      type="checkbox"
                      value={status.statusName}
                      id={status.statusSlug}
                      role="switch"
                      switch
                      checked={statusesToKeep().includes(status.statusName)}
                      onChange={() => (
                        statusesToKeep().includes(status.statusName) &&
                        setStatusesToKeep([...new Set([...statusesToKeep().filter((hey) => (hey !== status.statusName))])].toSorted()) ||
                        setStatusesToKeep([...new Set([...statusesToKeep(), status.statusName])].toSorted())
                      )}
                  />
                  </div>
                  <label for={status.statusSlug}>{status.statusName} ({status.count})</label>
                </div>
              ))}
            </div>
          </div>
          <div class="d-flex flex-wrap" data-statuses={statusesToKeep().join('|')}>
            <For each={listings().geoJSON.features.filter((feature) => (feature.properties.type === 'listing'))}>{(item, i) => (
                <div class={`w-50 p-4`} data-status={`${item.properties.statusTitle}`}>
                  <div
                    role="button"
                    data-listing={`listing-${item.id}`}
                    class={`card ${item.id === activeMapSelection() && 'bg-subtle-primary' || ''}`}
                    onClick={() => {setActiveMapSelection(item.id)}}>
                    <img src={item.properties.imageURL} class="card-img-top object-fit-cover border-bottom border-gray" style="height: 15em;"/>
                    <div class="card-body gap-0 py-4">
                      <div class="card-title d-flex">
                        <h5 class="flex-fill">
                          <span class="border-bottom border-1 border-black fst-italic">
                            {new Intl.NumberFormat("en-US",{
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(item.properties.price * 1 || item.properties.priceListed * 1)}
                          </span>
                        </h5>
                        <span class="badge rounded-pill theme-warning fs-md">{item.properties.statusTitle}</span>
                      </div>
                      <p class="card-text mb-0">
                        {item.properties.addressLine1}<br/>{item.properties.addressLine2}
                      </p>
                      <div class="d-flex flex-wrap gap-2 mt-2 mb-0">
                        <span class="badge rounded-pill border border-primary fg-primary">{item.properties.subdivision}</span>
                        {/* <span class="badge rounded-pill border border-primary fg-primary">{item.properties.agency}</span> */}
                        <span class="badge rounded-pill border border-primary fg-primary">{item.properties.beds} bedrooms</span>
                        <span class="badge rounded-pill border border-primary fg-primary">{item.properties.fullBaths + ((item.properties.halfBaths || 0)/2)} bathrooms</span>
                        <span class="badge rounded-pill border border-primary fg-primary">{item.properties.interiorSize} sqft.</span>
                        <span class="badge rounded-pill border border-primary fg-primary">{item.properties.buildingType}</span>
                        <span class="badge rounded-pill border border-primary fg-primary">{item.properties.schoolDistrict}</span>
                      </div>
                    </div>
                    <div class="card-footer">
                      <p class="mb-1">
                        <small>
                          <strong>Available Down Payment Assistance Programs</strong>
                        </small>
                      </p>
                      <div class="d-flex flex-wrap gap-2">
                        {item.properties.programs.map((program) => (
                          <DPAProgramBadge program={program}/>
                        ))}
                      </div>

                    </div>
                  </div>
                </div>
            )}</For> 
          </div>
        </div>
      </FinderDrawerPanel>
    </FinderDrawerProvider>
  );
}
