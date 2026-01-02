type OnlineData = {
    stats: OnlineStats | null;
    refresh: () => Promise<void>;
  };