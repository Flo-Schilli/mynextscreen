/**
 * Schemes FFmpeg is allowed to ingest. Kept next to the live-stream module so
 * the DTO validation and the FFmpeg `-protocol_whitelist` stay in sync.
 */
export const LIVE_STREAM_SCHEMES = ['http:', 'https:', 'rtmp:', 'rtsp:', 'rtp:'] as const;
