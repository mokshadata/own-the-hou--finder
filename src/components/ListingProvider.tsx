import { createSignal, onSettled, useContext, createContext, createEffect, onCleanup } from 'solid-js';
import type { ParentProps, ParentComponent, Component, ComponentProps, Element } from 'solid-js';

import { centroid } from '@turf/turf';
import type { FeatureCollection } from 'geojson';

export interface ListingsState {
  houses: object[],
  geoJSON: FeatureCollection,
}
export type ListingsContextValue = ReturnType<typeof createListings>

export function createListings() {
  const [listings, setListings] = createSignal<ListingsState>({ houses: [], geoJSON: {type: 'FeatureCollection', features: []} })
  const [activeMapSelection, setActiveMapSelection] = createSignal()
  const [statusesToKeep, setStatusesToKeep] = createSignal(['For Sale'])
  const activeFeature = () => (listings().geoJSON.features.find((item) => (item.id === activeMapSelection() && item.properties.type === 'listing')))
  const activeSubdivision = () => (listings().geoJSON.features.find((item) => (item.properties.houses?.includes(activeMapSelection()))))
  const focusFeatureCoords = () => (activeFeature() && activeFeature().geometry.coordinates || [])
  const focusSubdivisionCoords = () => (activeSubdivision() && centroid(activeSubdivision().geometry).geometry.coordinates || [])

  return {
    listings, setListings,
    activeMapSelection, setActiveMapSelection,
    statusesToKeep, setStatusesToKeep,

    activeFeature, activeSubdivision,
    focusFeatureCoords, focusSubdivisionCoords,
  }
}

export const ListingsContext = createContext<ListingsContextValue>()

export function useListings() {
  return useContext(ListingsContext)
}

export const ListingsProvider: ParentComponent<ParentProps> = (props) => {
  return <ListingsContext value={createListings()}>{props.children}</ListingsContext>
}
