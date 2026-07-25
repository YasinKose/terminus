import { invoke } from "@tauri-apps/api/core";

export interface HealthCheckResponse {
  version: string;
  platform: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

export async function healthCheck(): Promise<HealthCheckResponse> {
  return invoke<HealthCheckResponse>("health_check");
}
