import { useListings } from "./ListingProvider";

export function Filter({ status }) {
  const { statusesToKeep, setStatusesToKeep } = useListings();

  return (
    <div class="form-field me-8 w-full">
      <div class="switch theme-primary">
        <input
          type="checkbox"
          value={status.statusName}
          id={status.statusSlug}
          role="switch"
          switch
          checked={statusesToKeep().includes(status.statusName)}
          onChange={() =>
            (statusesToKeep().includes(status.statusName) &&
              setStatusesToKeep(
                [
                  ...new Set([
                    ...statusesToKeep().filter(
                      (hey) => hey !== status.statusName,
                    ),
                  ]),
                ].toSorted(),
              )) ||
            setStatusesToKeep(
              [...new Set([...statusesToKeep(), status.statusName])].toSorted(),
            )
          }
        />
      </div>
      <label for={status.statusSlug}>
        {status.statusLabel} ({status.count})
      </label>
    </div>
  );
}
