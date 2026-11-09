import { statusesToKeep, setStatusesToKeep } from "../stores";
import { toTitleCase } from "../utils";

export function Filter({ status }) {
  return (
    <div class="form-field me-8">
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
