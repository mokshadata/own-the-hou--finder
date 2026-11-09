

export function DownPaymentRange({ activeFeature }) {
  return (
    <>
      <p class="mb-0 mt-4 fw-semibold">
        Recommended Down Payment Range (3.5 - 5%)
      </p>
      <div class="progress-stacked border border-1 border-primary mb-1">
        <div
          class="progress"
          role="progressbar"
          aria-label="Minimum down payment"
          aria-valuenow="3.5"
          aria-valuemin="0"
          aria-valuemax="100"
          style="width: 3.5%"
        >
          <div
            class="progress-bar"
            style="background: var(--bs-progress-bg);"
          ></div>
        </div>
        <div
          class="progress"
          role="progressbar"
          aria-label="Recommended down payment"
          aria-valuenow="5"
          aria-valuemin="0"
          aria-valuemax="100"
          style="width: 5%"
        >
          <div class="progress-bar bg-info progress-bar-striped progress-bar-animated"></div>
        </div>
      </div>
      <p class="mb-1">
        <span class="border-bottom border-1 border-black fst-italic">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(
            (activeFeature().properties.price ||
              activeFeature().properties.priceListed) * 0.035,
          )}
        </span>{" "}
        to{" "}
        <span class="border-bottom border-1 border-black fst-italic">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(
            (activeFeature().properties.price ||
              activeFeature().properties.priceListed) * 0.05,
          )}
        </span>
      </p>
    </>
  );
}
