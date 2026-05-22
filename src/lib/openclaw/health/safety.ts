export interface OpenClawHealthSafetyMetadata {
  userScope: "single_user_james";
  noRawProviderPayloads: true;
  noSecrets: true;
  writesLimitedTo: "ingestion_events_only";
  medicalDiagnosis: false;
  adviceType: "body_planning_not_medical_advice";
}

export const openClawHealthSafetyMetadata: OpenClawHealthSafetyMetadata = {
  userScope: "single_user_james",
  noRawProviderPayloads: true,
  noSecrets: true,
  writesLimitedTo: "ingestion_events_only",
  medicalDiagnosis: false,
  adviceType: "body_planning_not_medical_advice"
};

