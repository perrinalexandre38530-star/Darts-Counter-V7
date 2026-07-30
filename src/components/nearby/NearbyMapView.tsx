import React from "react";
import type { NearbyPlace, NearbyPlayer } from "../../lib/nearbyPlayersApi";

type Coordinates = { latitude: number; longitude: number };

type Props = {
  center: Coordinates | null;
  radiusKm: number;
  players: NearbyPlayer[];
  places: NearbyPlace[];
  crossedUserIds?: Set<string>;
  accent: string;
  onSelectPlayer?: (player: NearbyPlayer) => void;
  onSelectPlace?: (place: NearbyPlace) => void;
  onNeedLocation?: () => void;
};

type WorldPoint = { x: number; y: number };
type MapCenter = { lat: number; lng: number };

type Tile = { key: string; x: number; y: number; left: number; top: number; url: string };

type Marker = {
  id: string;
  kind: "player" | "club" | "team" | "tournament" | "venue";
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  image?: string | null;
  player?: NearbyPlayer;
  place?: NearbyPlace;
  crossed?: boolean;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 7;
const MAX_ZOOM = 16;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function project(lat: number, lng: number, zoom: number): WorldPoint {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const sin = Math.sin((safeLat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function unproject(x: number, y: number, zoom: number): MapCenter {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function fallbackPlayerPoint(player: NearbyPlayer, center: Coordinates): MapCenter {
  const hash = hashString(player.userId || player.displayName);
  const bearing = Number.isFinite(Number(player.bearingDeg))
    ? Number(player.bearingDeg)
    : (hash % 360);
  const distanceKm = Math.max(0.75, Number(player.distanceKm || 2) * (0.55 + ((hash % 31) / 100)));
  const rad = (bearing * Math.PI) / 180;
  const latDelta = (distanceKm / 111.32) * Math.cos(rad);
  const lngScale = Math.max(0.2, Math.cos((center.latitude * Math.PI) / 180));
  const lngDelta = (distanceKm / (111.32 * lngScale)) * Math.sin(rad);
  return { lat: center.latitude + latDelta, lng: center.longitude + lngDelta };
}

function initialZoom(radiusKm: number) {
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 25) return 10;
  return 9;
}

function markerStyle(kind: Marker["kind"], accent: string, crossed?: boolean): React.CSSProperties {
  const palette: Record<Marker["kind"], string> = {
    player: accent,
    club: "#8d7cff",
    team: "#43d5ff",
    tournament: "#ffc45b",
    venue: "#75eea1",
  };
  const color = palette[kind];
  return {
    width: kind === "player" ? 44 : 40,
    height: kind === "player" ? 44 : 40,
    borderRadius: kind === "player" ? "50%" : 14,
    border: `2px solid ${crossed ? "#ffd36d" : color}`,
    background: `linear-gradient(145deg, ${color}44, rgba(4,9,16,.97))`,
    color: "#fff",
    boxShadow: `0 0 0 5px ${color}16, 0 10px 22px rgba(0,0,0,.38), 0 0 18px ${color}66`,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    cursor: "pointer",
    padding: 0,
  };
}

function kindIcon(kind: Marker["kind"]) {
  if (kind === "club") return "🏛";
  if (kind === "team") return "🛡";
  if (kind === "tournament") return "🏆";
  if (kind === "venue") return "📌";
  return "👤";
}

function createTiles(center: MapCenter, zoom: number, width: number, height: number): Tile[] {
  const centerPx = project(center.lat, center.lng, zoom);
  const minWorldX = centerPx.x - width / 2;
  const minWorldY = centerPx.y - height / 2;
  const startX = Math.floor(minWorldX / TILE_SIZE) - 1;
  const startY = Math.floor(minWorldY / TILE_SIZE) - 1;
  const endX = Math.floor((centerPx.x + width / 2) / TILE_SIZE) + 1;
  const endY = Math.floor((centerPx.y + height / 2) / TILE_SIZE) + 1;
  const count = 2 ** zoom;
  const tiles: Tile[] = [];
  for (let y = startY; y <= endY; y += 1) {
    if (y < 0 || y >= count) continue;
    for (let x = startX; x <= endX; x += 1) {
      const wrappedX = ((x % count) + count) % count;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        x,
        y,
        left: x * TILE_SIZE - minWorldX,
        top: y * TILE_SIZE - minWorldY,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
      });
    }
  }
  return tiles;
}

export default function NearbyMapView({
  center,
  radiusKm,
  players,
  places,
  crossedUserIds,
  accent,
  onSelectPlayer,
  onSelectPlace,
  onNeedLocation,
}: Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ startX: number; startY: number; centerWorld: WorldPoint } | null>(null);
  const [size, setSize] = React.useState({ width: 320, height: 460 });
  const [zoom, setZoom] = React.useState(() => initialZoom(radiusKm));
  const [mapCenter, setMapCenter] = React.useState<MapCenter | null>(center ? { lat: center.latitude, lng: center.longitude } : null);
  const [selected, setSelected] = React.useState<Marker | null>(null);
  const [tileErrors, setTileErrors] = React.useState(0);

  React.useEffect(() => {
    if (center) setMapCenter({ lat: center.latitude, lng: center.longitude });
  }, [center?.latitude, center?.longitude]);

  React.useEffect(() => {
    setZoom(initialZoom(radiusKm));
  }, [radiusKm]);

  React.useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    const update = () => setSize({ width: Math.max(280, node.clientWidth), height: Math.max(390, Math.min(560, window.innerHeight * .62)) });
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(node);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const markers = React.useMemo<Marker[]>(() => {
    if (!center) return [];
    const playerMarkers: Marker[] = players.map((player) => {
      const fallback = fallbackPlayerPoint(player, center);
      return {
        id: `player:${player.userId}`,
        kind: "player",
        lat: Number.isFinite(Number(player.mapLat)) ? Number(player.mapLat) : fallback.lat,
        lng: Number.isFinite(Number(player.mapLng)) ? Number(player.mapLng) : fallback.lng,
        title: player.displayName,
        subtitle: player.distanceLabel,
        image: player.avatarUrl,
        player,
        crossed: crossedUserIds?.has(player.userId),
      };
    });
    const placeMarkers: Marker[] = places
      .filter((place) => Number.isFinite(Number(place.mapLat)) && Number.isFinite(Number(place.mapLng)))
      .map((place) => ({
        id: `place:${place.id}`,
        kind: place.kind,
        lat: Number(place.mapLat),
        lng: Number(place.mapLng),
        title: place.title,
        subtitle: place.distanceLabel,
        place,
      }));
    return [...playerMarkers, ...placeMarkers];
  }, [center, crossedUserIds, places, players]);

  if (!center || !mapCenter) {
    return (
      <div style={{ borderRadius: 24, border: `1px solid ${accent}55`, background: "radial-gradient(circle at 50% 10%, rgba(45,132,255,.18), rgba(3,8,15,.96) 62%)", padding: 24, textAlign: "center", minHeight: 330, display: "grid", placeItems: "center" }}>
        <div>
          <div style={{ fontSize: 48 }}>🗺️</div>
          <div style={{ marginTop: 10, fontSize: 18, fontWeight: 1000, color: accent }}>OUVRIR MA CARTE LOCALE</div>
          <div style={{ margin: "8px auto 0", maxWidth: 420, fontSize: 12.5, lineHeight: 1.5, opacity: .78 }}>La carte a besoin de ta position actuelle pour se centrer. Les autres joueurs ne recevront jamais tes coordonnées.</div>
          <button type="button" onClick={onNeedLocation} style={{ marginTop: 16, borderRadius: 14, border: `1px solid ${accent}`, background: `${accent}20`, color: accent, padding: "12px 16px", fontWeight: 1000, cursor: "pointer" }}>📍 CENTRER LA CARTE</button>
        </div>
      </div>
    );
  }

  const centerPx = project(mapCenter.lat, mapCenter.lng, zoom);
  const tiles = createTiles(mapCenter, zoom, size.width, size.height);

  const markerPosition = (marker: Marker) => {
    const point = project(marker.lat, marker.lng, zoom);
    return { left: size.width / 2 + point.x - centerPx.x, top: size.height / 2 + point.y - centerPx.y };
  };

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement)?.closest("button")) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, centerWorld: centerPx };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const nextWorldX = drag.centerWorld.x - (event.clientX - drag.startX);
    const nextWorldY = drag.centerWorld.y - (event.clientY - drag.startY);
    setMapCenter(unproject(nextWorldX, nextWorldY, zoom));
  };

  const endDrag = () => { dragRef.current = null; };

  const recenter = () => {
    setMapCenter({ lat: center.latitude, lng: center.longitude });
    setZoom(initialZoom(radiusKm));
  };

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%" }}>
      <div
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          position: "relative",
          height: size.height,
          overflow: "hidden",
          borderRadius: 24,
          border: `1px solid ${accent}66`,
          background: "#07111b",
          boxShadow: "0 20px 60px rgba(0,0,0,.38)",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {tileErrors < 12 ? tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            onError={() => setTileErrors((value) => value + 1)}
            style={{ position: "absolute", left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE, objectFit: "cover", filter: "brightness(.62) saturate(.78) contrast(1.08)", pointerEvents: "none" }}
          />
        )) : (
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(37,118,153,.23), transparent 36%), repeating-linear-gradient(0deg, transparent 0 49px, rgba(255,255,255,.035) 50px), repeating-linear-gradient(90deg, transparent 0 49px, rgba(255,255,255,.035) 50px), #07111b" }} />
        )}

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,7,13,.12), rgba(2,7,13,.26)), radial-gradient(circle at center, transparent 30%, rgba(0,0,0,.22) 100%)", pointerEvents: "none" }} />

        <div style={{ position: "absolute", left: size.width / 2, top: size.height / 2, transform: "translate(-50%,-50%)", zIndex: 5, pointerEvents: "none" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: accent, border: "3px solid #fff", boxShadow: `0 0 0 9px ${accent}2a, 0 0 26px ${accent}` }} />
          <div style={{ marginTop: 9, transform: "translateX(-40%)", width: 116, textAlign: "center", borderRadius: 999, padding: "5px 8px", background: "rgba(2,8,14,.86)", border: `1px solid ${accent}55`, fontSize: 10, fontWeight: 1000, color: "#fff" }}>MA POSITION PRIVÉE</div>
        </div>

        {markers.map((marker) => {
          const pos = markerPosition(marker);
          if (pos.left < -70 || pos.top < -70 || pos.left > size.width + 70 || pos.top > size.height + 70) return null;
          return (
            <div key={marker.id} style={{ position: "absolute", left: pos.left, top: pos.top, transform: "translate(-50%,-50%)", zIndex: selected?.id === marker.id ? 12 : 8 }}>
              <button
                type="button"
                title={`${marker.title} • ${marker.subtitle}`}
                style={markerStyle(marker.kind, accent, marker.crossed)}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(marker);
                  if (marker.player) onSelectPlayer?.(marker.player);
                  if (marker.place) onSelectPlace?.(marker.place);
                }}
              >
                {marker.image ? <img src={marker.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 19 }}>{kindIcon(marker.kind)}</span>}
              </button>
              {marker.crossed ? <div style={{ position: "absolute", right: -5, top: -7, width: 20, height: 20, borderRadius: "50%", display: "grid", placeItems: "center", background: "#ffd36d", color: "#1b1400", border: "2px solid #08101a", fontSize: 10, fontWeight: 1000 }}>✦</div> : null}
            </div>
          );
        })}

        <div style={{ position: "absolute", left: 10, top: 10, zIndex: 20, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: "calc(100% - 110px)" }}>
          <span style={{ borderRadius: 999, padding: "6px 9px", background: "rgba(2,8,14,.86)", border: "1px solid rgba(255,255,255,.14)", fontSize: 10.5, fontWeight: 1000 }}>{players.length} joueur(s)</span>
          <span style={{ borderRadius: 999, padding: "6px 9px", background: "rgba(2,8,14,.86)", border: "1px solid rgba(255,255,255,.14)", fontSize: 10.5, fontWeight: 1000 }}>{places.length} lieu(x)</span>
        </div>

        <div style={{ position: "absolute", right: 10, top: 10, zIndex: 20, display: "grid", gap: 6 }}>
          <button type="button" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 1))} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "rgba(2,8,14,.9)", color: "#fff", fontSize: 20, fontWeight: 1000, cursor: "pointer" }}>+</button>
          <button type="button" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 1))} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "rgba(2,8,14,.9)", color: "#fff", fontSize: 20, fontWeight: 1000, cursor: "pointer" }}>−</button>
          <button type="button" onClick={recenter} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${accent}77`, background: "rgba(2,8,14,.9)", color: accent, fontSize: 17, cursor: "pointer" }}>◎</button>
        </div>

        <div style={{ position: "absolute", left: 10, bottom: selected ? 94 : 10, zIndex: 20, display: "flex", flexWrap: "wrap", gap: 5, pointerEvents: "none" }}>
          {["👤 Joueur", "✦ Croisé", "🏛 Club", "🛡 Équipe", "🏆 Tournoi", "📌 Lieu"].map((label) => <span key={label} style={{ borderRadius: 999, padding: "5px 7px", background: "rgba(2,8,14,.82)", border: "1px solid rgba(255,255,255,.1)", fontSize: 9.5, fontWeight: 850 }}>{label}</span>)}
        </div>

        <div style={{ position: "absolute", right: 8, bottom: 6, zIndex: 20, fontSize: 9, opacity: .75, background: "rgba(255,255,255,.7)", color: "#111", padding: "2px 4px", borderRadius: 3 }}>© OpenStreetMap</div>

        {selected ? (
          <div style={{ position: "absolute", zIndex: 30, left: 10, right: 10, bottom: 10, borderRadius: 18, padding: 11, background: "rgba(3,8,15,.96)", border: `1px solid ${accent}55`, boxShadow: "0 16px 40px rgba(0,0,0,.42)", display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: selected.kind === "player" ? "50%" : 13, overflow: "hidden", display: "grid", placeItems: "center", border: `1px solid ${accent}66`, background: `${accent}18`, fontSize: 19 }}>
              {selected.image ? <img src={selected.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : kindIcon(selected.kind)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selected.title}</div>
              <div style={{ marginTop: 2, fontSize: 11, color: accent, fontWeight: 900 }}>{selected.subtitle}</div>
              <div style={{ marginTop: 2, fontSize: 10, opacity: .64 }}>{selected.kind === "player" ? "Position volontairement approximative" : selected.place?.preciseLocation ? "Lieu public précisément positionné" : "Zone approximative"}</div>
            </div>
            <button type="button" onClick={() => setSelected(null)} style={{ width: 34, height: 34, borderRadius: 11, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", cursor: "pointer" }}>×</button>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 8, fontSize: 10.5, opacity: .64, lineHeight: 1.4 }}>
        Les marqueurs joueurs utilisent une zone arrondie côté Supabase. Une carte ne permet jamais de retrouver leur adresse ou leur position GPS exacte.
      </div>
    </div>
  );
}
