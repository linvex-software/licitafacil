import { SetMetadata } from "@nestjs/common";
import { type FeatureName } from "../constants/feature-matrix";

export const FEATURE_KEY = "required_feature";
export const RequireFeature = (feature: FeatureName) => SetMetadata(FEATURE_KEY, feature);
