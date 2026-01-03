export function BottomTabBar({ go }: { go: (r: string) => void }) {
    return (
      <div className="bottom-tabs">
        <button onClick={() => go("home")}>Home</button>
        <button onClick={() => go("play")}>Play</button>
        <button onClick={() => go("stats")}>Stats</button>
        <button onClick={() => go("settings")}>Settings</button>
      </div>
    );
  }
  