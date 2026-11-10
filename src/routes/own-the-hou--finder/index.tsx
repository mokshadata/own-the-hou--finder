import { Title } from '@solidjs/meta';
import { query, type RouteDefinition, type RouteProps } from '@solidjs/router';
import { createEffect, createMemo, For, Show, Errored, onSettled, createSignal} from 'solid-js';

import { DPAProgramSummary, getMatchingPrograms } from 'own-the-hou--tools';

import { FinderDrawerProvider, FinderDrawer, FinderController, FinderDrawerPanel, useFinderDrawer } from '../../components/Sidebar';

import { ListingCard } from '../../components/Card';
import { Filter } from '../../components/Filter';
import { Map } from "../../components/Mapbox";
import { DownPaymentRange } from '../../components/Range';

import { points, bbox, bboxPolygon, transformScale, booleanContains, toWgs84, feature } from "@turf/turf"

import {
  activeMapSelection, setActiveMapSelection,
  statusesToKeep, setStatusesToKeep
} from '../../stores';

import { csv, json } from "d3-fetch";

import { toTitleCase } from '../../utils';

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

  const listings = await json((new URL('./data/combined-20261019--single-family.json', origin)).toString());
  const listingsWithGeocoding = await csv((new URL('./data/combined-20261019--single-family.csv', origin)).toString());

  const harrisCountyProgramLimits = await json((new URL('./data/unincorp-harris-county.geojson', origin)).toString());
  const cohProgramLimits = await json((new URL('./data/coh-city-limits.geojson', origin)).toString());

  const cohSuperNeighborhoodsProjected = await json((new URL('./data/coh-super-neighborhoods-projected.geojson', origin)).toString());

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
      neighborhood: cohSuperNeighborhoodsProjected.features.find((neigh) => (booleanContains(neigh, feature))).properties,
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
      statusLabel: toTitleCase(statusName),
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
        header={(
        <div class="d-flex flex-column w-100">
          <nav class="drawer-title navbar gap-3 bg-dark p-3 pe-0 w-100" data-bs-theme="dark">
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
        <div class="d-flex w-100 gap-4 px-4" role="group">
          <a class="btn btn-subtle theme-accent border border-2 border-accent my-4 flex-fill" target="_blank" href={activeFeature().properties.harURL}>View <strong>Listing</strong></a>
          <a class="btn btn-subtle theme-accent border border-2 border-accent my-4 flex-fill" target="_blank" href={activeFeature().properties.agencyURL}>Go to <strong>{activeFeature().properties.agency}</strong></a>
        </div>
      </Show>)}
      >
        <Show when={activeFeature()}>
          <div class="px-4 pt-4">
            <h4 class="fg-accent">
              <span class="fw-bold">
                {toTitleCase(activeFeature().properties.neighborhood.SNBNAME)} Neighborhood
              </span><span>, {activeFeature().properties.subdivision} Subdivision</span>
            </h4>
            <h4 class="mt-6 mb-6">
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
            <hr class="border-1 border-bottom mb-6 mt-6 border-primary"/>
            <h4 class="fg-accent fw-bold">Down Payment Assistance Information</h4>
            <DownPaymentRange activeFeature={activeFeature}/>
            <p class="mt-6">Depending on your household income, you may qualify for Down Payment Assistance through:</p>
          </div>
          <div class="accordion theme-primary mb-8">
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
        <div class="d-flex flex-column p-4">
          <div class="intro sticky-top m-4" role="card">
            <h2 class="mb-0">
              Affordable Home Finder
            </h2>
            <p>Every listing on this map comes from an Own the HOU collaborative partner, with the down payment assistance programs that may apply based on where the home is located.</p>
            <div class="intro-footer d-flex flex-wrap">
              {statusHousingCount().map((status) => (
                <Filter status={status}/>
              ))}
            </div>
          </div>
          <div class="container mx-0" data-statuses={statusesToKeep().join('|')}>
            <div class="row">
              <For each={listings().geoJSON.features.filter((feature) => (feature.properties.type === 'listing'))}>{(item, i) => (
                <ListingCard item={item}/>
              )}</For> 
            </div>
          </div>
        </div>
      </FinderDrawerPanel>
    </FinderDrawerProvider>
  );
}
