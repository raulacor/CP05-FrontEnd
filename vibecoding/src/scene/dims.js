// Every size is in metres. The screen stands on the z = 0 plane and the audience looks toward −z.

export const SCREEN = { w: 40, h: 28, bottom: 4, cy: 18, forward: 5.5 };
export const ROOM = { halfW: 28, height: 38, back: 44, front: -4 };
export const STAGE = { halfW: 23, height: 1.5, z0: -1, z1: 7 };
export const PROSC = { z: 2.8, depth: 1.2, openHalfW: 23, openBottom: 1.5, openTop: 34 };
export const CURTAIN = { z: 1.5, anchor: 24.5, width: 25, bottom: 1.5, top: 34 };
export const RAKE = { rows: 10, seats: 34, z0: 16, dz: 1.7, dy: 0.7, pitch: 0.86, curve: 90, width: 32 };
export const BALCONY = { rows: 2, seats: 40, z0: 37.2, dz: 1.8, y0: 11.2, dy: 0.8, pitch: 0.8, front: 35.6, curve: 110, width: 40 };
export const BOOTH = { floor: 15, z0: 44.2, z1: 51, halfW: 4.5, height: 8.5, win: { halfW: 3, y0: 16.2, y1: 19.4 } };
export const EYE = 1.15;
export const EXPLODE = { side: 9, ceiling: 10, back: 10 };

// 420 seats: 10 rows of 34 in the stalls, 2 rows of 40 in the balcony.
export const SEAT_COUNT = RAKE.rows * RAKE.seats + BALCONY.rows * BALCONY.seats;
