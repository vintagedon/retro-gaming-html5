export const ASSETS = {
  tiles: {
    wallPrimary: 'assets/tiles/brick_4d.png',
    wallSecondary: 'assets/tiles/block_2e.png',
    sideWall: 'assets/tiles/cobbles_2b.png',
    floor: 'assets/tiles/floor_2e.png',
    ceiling: 'assets/tiles/block_2e.png',
    door: 'assets/tiles/door_8b.png',
  },
  props: {
    barrel: 'assets/props/barrel.png',
    barrelTall: 'assets/props/barrel_tall.png',
    bonePile: 'assets/props/bone_pile.png',
    brazier: 'assets/props/brazier.png',
    chains: 'assets/props/chains.png',
    chest: 'assets/props/chest.png',
    cobwebCorner: 'assets/props/cobweb_corner.png',
    crate: 'assets/props/crate.png',
    torchWall: 'assets/props/torch_wall.png',
    weaponRack: 'assets/props/weapon_rack.png',
  },
  backdrops: {
    throneRoom: 'assets/backdrops/throne-room-01.png',
  },
};

export function loadManifest(scene) {
  for (const [key, path] of Object.entries(ASSETS.tiles)) {
    scene.load.image(key, path);
  }

  for (const [key, path] of Object.entries(ASSETS.props)) {
    scene.load.image(key, path);
  }

  for (const [key, path] of Object.entries(ASSETS.backdrops)) {
    scene.load.image(key, path);
  }
}
