/** How the site agent talks VISCA to the camera. */
export enum PtzProtocol {
  /** Sony VISCA-over-IP with the 8-byte header. */
  ViscaUdp = 'visca_udp',
  /** Raw VISCA over a TCP stream (e.g. PTZOptics). */
  ViscaTcp = 'visca_tcp',
}

/** Port used when a stream does not set its own. */
export const PTZ_DEFAULT_PORTS: Readonly<Record<PtzProtocol, number>> = {
  [PtzProtocol.ViscaUdp]: 52381,
  [PtzProtocol.ViscaTcp]: 5678,
};
