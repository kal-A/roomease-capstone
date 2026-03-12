/**
 * Demo overlay: room ownership and quality metadata.
 * In production, this would come from the backend.
 */

export interface RoomMetadata {
  roomOwnerDepartment?: string;
  approvalRequired?: boolean;
  adminContact?: string;
  lightingQuality?: "low" | "medium" | "high";
  noiseLevel?: "low" | "medium" | "high";
  accessibility?: "full" | "partial" | "none";
  equipmentReliability?: "low" | "medium" | "high";
}

const METADATA: Record<string, RoomMetadata> = {
  "AL-209": {
    roomOwnerDepartment: "Arts Faculty",
    approvalRequired: true,
    adminContact: "arts-space@uwaterloo.ca",
    lightingQuality: "high",
    noiseLevel: "low",
    accessibility: "full",
    equipmentReliability: "high",
  },
  "AL-210": {
    roomOwnerDepartment: "Arts Faculty",
    approvalRequired: true,
    adminContact: "arts-space@uwaterloo.ca",
    lightingQuality: "high",
    noiseLevel: "low",
    accessibility: "full",
    equipmentReliability: "high",
  },
  "HH-259": {
    roomOwnerDepartment: "Arts Faculty",
    approvalRequired: false,
    adminContact: "arts-space@uwaterloo.ca",
    lightingQuality: "medium",
    noiseLevel: "medium",
    accessibility: "full",
    equipmentReliability: "medium",
  },
  "HH-334": {
    roomOwnerDepartment: "Arts Faculty",
    approvalRequired: false,
    adminContact: "arts-space@uwaterloo.ca",
    lightingQuality: "high",
    noiseLevel: "low",
    accessibility: "full",
    equipmentReliability: "high",
  },
  "MC-4020": {
    roomOwnerDepartment: "Math",
    approvalRequired: false,
    adminContact: "math-rooms@uwaterloo.ca",
    lightingQuality: "high",
    noiseLevel: "medium",
    accessibility: "full",
    equipmentReliability: "high",
  },
  "DC-1350": {
    roomOwnerDepartment: "Campus-wide",
    approvalRequired: false,
    adminContact: "events@uwaterloo.ca",
    lightingQuality: "high",
    noiseLevel: "low",
    accessibility: "full",
    equipmentReliability: "high",
  },
};

export function getRoomMetadata(roomId: string | number): RoomMetadata | undefined {
  return METADATA[String(roomId)];
}

export function getRoomMetadataWithDefaults(roomId: string | number): RoomMetadata {
  const m = METADATA[String(roomId)];
  return {
    roomOwnerDepartment: m?.roomOwnerDepartment ?? "Campus",
    approvalRequired: m?.approvalRequired ?? false,
    adminContact: m?.adminContact ?? "bookings@uwaterloo.ca",
    lightingQuality: m?.lightingQuality ?? "medium",
    noiseLevel: m?.noiseLevel ?? "medium",
    accessibility: m?.accessibility ?? "full",
    equipmentReliability: m?.equipmentReliability ?? "medium",
  };
}
