export type Slide = {
  id: string;
  title: string;
  category: string;
  /** Unsplash photo id (the part after `photo-`). */
  photo: string;
  alt: string;
  /** Duotone colour used behind / over the photograph. */
  color: string;
  /** Full Unsplash URL, derived from `photo`. */
  src: string;
};

const unsplash = (photo: string) =>
  `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=1400&q=80`;

const raw: Omit<Slide, "src">[] = [
  {
    id: "01",
    title: "Midnight Profile",
    category: "Portrait",
    photo: "1507003211169-0a1dd7228f2d",
    alt: "Side profile of a man",
    color: "#1d3cf0",
  },
  {
    id: "02",
    title: "Golden Hour",
    category: "Editorial",
    photo: "1494790108377-be9c29b29330",
    alt: "Woman looking away at golden hour",
    color: "#e0241c",
  },
  {
    id: "03",
    title: "Quiet Noise",
    category: "Fashion",
    photo: "1500648767791-00dcc994a43e",
    alt: "Bearded man in a portrait",
    color: "#2a49d6",
  },
  {
    id: "04",
    title: "Soft Static",
    category: "Studio",
    photo: "1534528741775-53994a69daeb",
    alt: "Woman portrait in soft light",
    color: "#ec8f84",
  },
  {
    id: "05",
    title: "Afterglow",
    category: "Portrait",
    photo: "1488426862026-3ee34a7d66df",
    alt: "Woman with wind in her hair",
    color: "#58a893",
  },
  {
    id: "06",
    title: "Deep Water",
    category: "Editorial",
    photo: "1531746020798-e6953c6e8e04",
    alt: "Close portrait of a woman",
    color: "#1b2a9c",
  },
  {
    id: "07",
    title: "Burnt Orange",
    category: "Fashion",
    photo: "1506794778202-cad84cf45f1d",
    alt: "Man in a casual portrait",
    color: "#e58a2b",
  },
  {
    id: "08",
    title: "Paper Sky",
    category: "Studio",
    photo: "1524504388940-b1c1722653e1",
    alt: "Woman with long hair",
    color: "#38a2d8",
  },
  {
    id: "09",
    title: "Olive Rooms",
    category: "Portrait",
    photo: "1492562080023-ab3db95bfbce",
    alt: "Man in a quiet portrait",
    color: "#a7a45a",
  },
  {
    id: "10",
    title: "Signal Red",
    category: "Editorial",
    photo: "1529626455594-4ff0802cfb7e",
    alt: "Fashion portrait of a woman",
    color: "#d12a2a",
  },
  {
    id: "11",
    title: "Cold Frame",
    category: "Fashion",
    photo: "1519085360753-af0119f7cbe7",
    alt: "Man in a suit",
    color: "#3a56e8",
  },
  {
    id: "12",
    title: "Last Light",
    category: "Portrait",
    photo: "1544005313-94ddf0286df2",
    alt: "Woman at dusk",
    color: "#c96aa4",
  },
  {
    id: "13",
    title: "Blue Hour",
    category: "Editorial",
    photo: "1517841905240-472988babdf9",
    alt: "Woman portrait at blue hour",
    color: "#2457e6",
  },
  {
    id: "14",
    title: "Concrete Sun",
    category: "Studio",
    photo: "1552058544-f2b08422138a",
    alt: "Man in a studio portrait",
    color: "#f0a02e",
  },
  {
    id: "15",
    title: "Mint Static",
    category: "Fashion",
    photo: "1509967419530-da38b4704bc6",
    alt: "Woman fashion portrait",
    color: "#4fb59a",
  },
  {
    id: "16",
    title: "Red Room",
    category: "Portrait",
    photo: "1539571696357-5a69c17a67c6",
    alt: "Man in a red-lit room",
    color: "#c9302c",
  },
];

export const slides: Slide[] = raw.map((s) => ({
  ...s,
  src: unsplash(s.photo),
}));
