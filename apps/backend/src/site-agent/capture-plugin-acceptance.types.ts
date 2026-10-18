import type { CapturePluginAcceptanceSource } from '../db/schema';
import type { CapturePluginState } from './dto/agent-report.dto';

/** Error code carried as the message of the 409 a not-ready plugin produces. */
export const CAPTURE_PLUGIN_NOT_READY = 'capture_plugin_not_ready';
export const CAPTURE_LICENSE_MISMATCH = 'license_mismatch';
export const CAPTURE_LICENSE_TEXT_MISSING = 'license_text_missing';

/** The dashboard's view of an agent's capture plugin and its acceptance. */
export interface CapturePluginView {
  state: CapturePluginState | 'absent';
  pluginVersion: string | null;
  sdkVersion: string | null;
  errorCode: string | null;
  license: { licenseSha256: string; ndiLicenseSha256: string; termsSha256: string } | null;
  licenseTextAvailable: boolean;
  acceptance: {
    licenseSha256: string;
    source: CapturePluginAcceptanceSource;
    acceptedAt: string;
    acceptedBy: { id: string; name: string } | null;
  } | null;
  reportedAt: string | null;
}

export interface CaptureLicenseTextView {
  licenseSha256: string;
  ndiLicenseText: string;
  termsText: string;
}
