import { DPAProgramBadge, } from 'own-the-hou--tools';
import { DownPaymentRange } from './Range';

import { toTitleCase } from '../utils'

import {
  activeMapSelection, setActiveMapSelection,
} from '../stores';

export function ListingCard({ item, }) {
  return (
    <div
      class={`col xs:col-12 xl:col-6`}
      data-status={`${item.properties.statusTitle}`}
    >
      <div
        role="button"
        data-listing={`listing-${item.id}`}
        class={`mb-8 card ${(item.id === activeMapSelection() && "bg-subtle-primary border-accent") || ""}`}
        onClick={() => {
          setActiveMapSelection(item.id);
        }}
      >
        <img
          src={item.properties.imageURL}
          class={`card-img-top object-fit-cover`}
          style="height: 15em;"
        />
        <div class={`card-body gap-0 py-4 ${(item.id === activeMapSelection() && "border-accent") || ""}`}>
          <div class="card-title d-flex">
            <h5 class="flex-fill">
              <span class="border-bottom border-1 border-black fst-italic fs-lg">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(
                  item.properties.price * 1 || item.properties.priceListed * 1,
                )}
              </span>
            </h5>
            <span class="badge rounded-pill theme-warning fs-md">
              {toTitleCase(item.properties.statusTitle)}
            </span>
          </div>
          <p class="card-text mb-0">
            {item.properties.addressLine1}
            <br />
            {item.properties.addressLine2}
          </p>
          <div class="d-flex flex-wrap gap-2 mt-2 mb-0">
            <span class="badge rounded-pill theme-primary">
              {item.properties.subdivision}
            </span>
            {/* <span class="badge rounded-pill theme-primary">{item.properties.agency}</span> */}
            <span class="badge rounded-pill theme-primary">
              {item.properties.beds} bedrooms
            </span>
            <span class="badge rounded-pill theme-primary">
              {item.properties.fullBaths + (item.properties.halfBaths || 0) / 2}{" "}
              bathrooms
            </span>
            <span class="badge rounded-pill theme-primary">
              {item.properties.interiorSize} sqft.
            </span>
            <span class="badge rounded-pill theme-primary">
              {item.properties.buildingType}
            </span>
            <span class="badge rounded-pill theme-primary">
              {item.properties.schoolDistrict}
            </span>
          </div>
        </div>
        <div class={`card-footer ${(item.id === activeMapSelection() && "bg-subtle-primary border-accent") || ""}`}>
          <p class="mb-1">
            <small>
              <strong>Available Down Payment Assistance Programs</strong>
            </small>
          </p>
          <div class="d-flex flex-wrap gap-2">
            {item.properties.programs.map((program) => (
              <DPAProgramBadge program={program} />
            ))}
          </div>
          {/* <DownPaymentRange activeFeature={() => (item)}/> */}
        </div>
      </div>
    </div>
  );
}
