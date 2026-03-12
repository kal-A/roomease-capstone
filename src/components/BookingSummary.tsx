import { furnitureLabelsFromCodes } from "@/lib/furniture";
import { getBuildingTicketLabel } from "@/lib/buildings";
import type { EventFormData } from "@/types/booking";
import type { Room } from "@/types/booking";
import { formatDuration, formatTimeSlot } from "@/types/booking";
import {
  roomHasDocumentCamera,
  roomIsElectronicClassroom,
  roomIsStreamingRecordingCapable,
} from "@/types/booking";
import { FeatureBadge } from "./FeatureBadge";

interface BookingSummaryProps {
  formData: EventFormData;
  room: Room;
  confirmationNumber: string;
  /** If true, render as compact ticket sections (for confirmation page). */
  ticketStyle?: boolean;
  /** If true, render without the outer ticket container (use parent card). */
  embedded?: boolean;
}

export function BookingSummary({
  formData,
  room,
  confirmationNumber,
  ticketStyle = false,
  embedded = false,
}: BookingSummaryProps) {
  const timeLabel = formatTimeSlot(formData.timeSlot);
  const durationLabel = formatDuration(formData.durationMinutes ?? 60);
  const buildingLabel = getBuildingTicketLabel(room.building);
  const furnitureLabels = furnitureLabelsFromCodes(room.furniture).filter((l) => l !== "(Unknown)");
  const avBadges: string[] = [];
  if (roomIsStreamingRecordingCapable(room)) avBadges.push("Streaming & Recording");
  if (roomIsElectronicClassroom(room)) avBadges.push("Electronic Classroom");
  if (roomHasDocumentCamera(room)) avBadges.push("Document Camera");

  if (ticketStyle) {
    return (
      <div
        className={
          embedded
            ? "space-y-3"
            : "rounded-xl border-2 border-[var(--primaryBorder)] bg-[var(--surface)] p-4 sm:p-5 shadow-[var(--shadowMd)]"
        }
      >
        {!embedded && (
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
            Confirmation #{confirmationNumber}
          </p>
        )}
        <div className={embedded ? "space-y-3" : "space-y-3"}>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Event</p>
            <p className="mt-0.5 text-[var(--textPrimary)] font-medium">{formData.eventName}</p>
            <p className="mt-0.5 text-xs text-[var(--textSecondary)]">Organizer: {formData.organizerName}</p>
          </section>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Time</p>
            <p className="mt-0.5 text-[var(--textPrimary)]">{formData.preferredDate} • {timeLabel}</p>
            <p className="mt-0.5 text-xs text-[var(--textSecondary)]">Duration: {durationLabel}</p>
          </section>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Room</p>
            <p className="mt-0.5 text-[var(--textPrimary)] font-medium">{room.name}</p>
            <p className="mt-0.5 text-xs text-[var(--textSecondary)]">Capacity {room.capacity}</p>
          </section>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Building</p>
            <p className="mt-0.5 text-[var(--textPrimary)]">{buildingLabel}</p>
          </section>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Group size</p>
            <p className="mt-0.5 text-[var(--textPrimary)]">{formData.groupSize}</p>
          </section>
          {(avBadges.length > 0 || furnitureLabels.length > 0) && (
            <>
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)] mb-1">AV Capabilities</p>
                <div className="flex flex-wrap gap-1.5">{avBadges.map((b) => <FeatureBadge key={b} animated={false}>{b}</FeatureBadge>)}</div>
              </section>
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)] mb-1">Furniture Layout</p>
                <div className="flex flex-wrap gap-1.5">{furnitureLabels.map((label) => <FeatureBadge key={label} animated={false}>{label}</FeatureBadge>)}</div>
              </section>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
      <p className="mb-4 text-sm font-medium uppercase tracking-wide text-[var(--primary)]">
        Confirmation #{confirmationNumber}
      </p>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">
            Event Details
          </h3>
          <ul className="space-y-2 text-[var(--text)]">
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Event:</span> {formData.eventName}
            </li>
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Organizer:</span> {formData.organizerName}
            </li>
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Date:</span> {formData.preferredDate}
            </li>
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Time:</span> {timeLabel}
            </li>
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Duration:</span> {durationLabel}
            </li>
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Group size:</span> {formData.groupSize}
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--textMuted)]">
            Room Details
          </h3>
          <ul className="space-y-2 text-[var(--text)]">
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Room:</span> {room.name}
            </li>
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Building:</span> {buildingLabel}
            </li>
            <li>
              <span className="font-medium text-[var(--textSecondary)]">Capacity:</span> {room.capacity}
            </li>
          </ul>
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">AV Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {avBadges.map((b) => (
                <FeatureBadge key={b} animated={false}>{b}</FeatureBadge>
              ))}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--textMuted)]">Furniture Layout</p>
            <div className="flex flex-wrap gap-2">
              {furnitureLabels.map((label) => (
                <FeatureBadge key={label} animated={false}>{label}</FeatureBadge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
