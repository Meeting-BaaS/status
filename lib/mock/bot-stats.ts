export interface BotStatistics {
  totalBots: number;
  successfulBots: number;
  errorBots: number;
  errorTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  platformDistribution: {
    platform: string;
    count: number;
    percentage: number;
  }[];
  dailyStats: {
    date: string;
    totalBots: number;
    errorBots: number;
    platforms: {
      [key: string]: number;
    };
  }[];
}

export const mockBotStatistics: BotStatistics = {
  totalBots: 1243,
  successfulBots: 980,
  errorBots: 263,
  errorTypes: [
    {
      type: "Cannot start meeting bot",
      count: 97,
      percentage: 36.9,
    },
    {
      type: "Cannot join meeting: RemovedByHost",
      count: 78,
      percentage: 29.7,
    },
    {
      type: "MeetingNotExist",
      count: 65,
      percentage: 24.7,
    },
    {
      type: "Duration over 4 hours",
      count: 18,
      percentage: 6.8,
    },
    {
      type: "TimeoutWaitingToStart",
      count: 5,
      percentage: 1.9,
    },
  ],
  platformDistribution: [
    {
      platform: "Google Meet",
      count: 566,
      percentage: 45.5,
    },
    {
      platform: "Zoom",
      count: 418,
      percentage: 33.6,
    },
    {
      platform: "Teams",
      count: 259,
      percentage: 20.9,
    },
  ],
  dailyStats: [
    {
      date: "2024-05-01",
      totalBots: 45,
      errorBots: 8,
      platforms: {
        "Google Meet": 23,
        Zoom: 14,
        Teams: 8,
      },
    },
    {
      date: "2024-05-02",
      totalBots: 52,
      errorBots: 11,
      platforms: {
        "Google Meet": 25,
        Zoom: 15,
        Teams: 12,
      },
    },
    {
      date: "2024-05-03",
      totalBots: 48,
      errorBots: 9,
      platforms: {
        "Google Meet": 24,
        Zoom: 16,
        Teams: 8,
      },
    },
    {
      date: "2024-05-04",
      totalBots: 38,
      errorBots: 7,
      platforms: {
        "Google Meet": 19,
        Zoom: 12,
        Teams: 7,
      },
    },
    {
      date: "2024-05-05",
      totalBots: 25,
      errorBots: 5,
      platforms: {
        "Google Meet": 13,
        Zoom: 8,
        Teams: 4,
      },
    },
    {
      date: "2024-05-06",
      totalBots: 57,
      errorBots: 12,
      platforms: {
        "Google Meet": 28,
        Zoom: 19,
        Teams: 10,
      },
    },
    {
      date: "2024-05-07",
      totalBots: 62,
      errorBots: 14,
      platforms: {
        "Google Meet": 30,
        Zoom: 21,
        Teams: 11,
      },
    },
    {
      date: "2024-05-08",
      totalBots: 58,
      errorBots: 12,
      platforms: {
        "Google Meet": 29,
        Zoom: 18,
        Teams: 11,
      },
    },
    {
      date: "2024-05-09",
      totalBots: 64,
      errorBots: 15,
      platforms: {
        "Google Meet": 32,
        Zoom: 20,
        Teams: 12,
      },
    },
    {
      date: "2024-05-10",
      totalBots: 55,
      errorBots: 12,
      platforms: {
        "Google Meet": 26,
        Zoom: 19,
        Teams: 10,
      },
    },
    {
      date: "2024-05-11",
      totalBots: 43,
      errorBots: 9,
      platforms: {
        "Google Meet": 21,
        Zoom: 14,
        Teams: 8,
      },
    },
    {
      date: "2024-05-12",
      totalBots: 39,
      errorBots: 7,
      platforms: {
        "Google Meet": 18,
        Zoom: 13,
        Teams: 8,
      },
    },
    {
      date: "2024-05-13",
      totalBots: 68,
      errorBots: 16,
      platforms: {
        "Google Meet": 32,
        Zoom: 23,
        Teams: 13,
      },
    },
    {
      date: "2024-05-14",
      totalBots: 72,
      errorBots: 18,
      platforms: {
        "Google Meet": 35,
        Zoom: 24,
        Teams: 13,
      },
    },
    {
      date: "2024-05-15",
      totalBots: 76,
      errorBots: 17,
      platforms: {
        "Google Meet": 37,
        Zoom: 25,
        Teams: 14,
      },
    },
    {
      date: "2024-05-16",
      totalBots: 71,
      errorBots: 15,
      platforms: {
        "Google Meet": 35,
        Zoom: 23,
        Teams: 13,
      },
    },
    {
      date: "2024-05-17",
      totalBots: 68,
      errorBots: 14,
      platforms: {
        "Google Meet": 33,
        Zoom: 22,
        Teams: 13,
      },
    },
    {
      date: "2024-05-18",
      totalBots: 49,
      errorBots: 10,
      platforms: {
        "Google Meet": 24,
        Zoom: 16,
        Teams: 9,
      },
    },
    {
      date: "2024-05-19",
      totalBots: 45,
      errorBots: 9,
      platforms: {
        "Google Meet": 22,
        Zoom: 15,
        Teams: 8,
      },
    },
    {
      date: "2024-05-20",
      totalBots: 73,
      errorBots: 17,
      platforms: {
        "Google Meet": 36,
        Zoom: 24,
        Teams: 13,
      },
    },
    {
      date: "2024-05-21",
      totalBots: 77,
      errorBots: 19,
      platforms: {
        "Google Meet": 38,
        Zoom: 25,
        Teams: 14,
      },
    },
  ],
};
