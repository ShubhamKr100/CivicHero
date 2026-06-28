import { SamplePreset } from "./types";

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "preset-pothole",
    name: "Avenue Road Pothole",
    category: "Pothole",
    imageUrl: "https://tse3.mm.bing.net/th/id/OIP.jvFX3UU0O75QfKzlW8oxMgHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3",
    description: "Deep dangerous pothole on the main asphalt carriage driving lane.",
    latitude: 22.8046,
    longitude: 86.2029
  },
  {
    id: "preset-garbage",
    name: "Alleyway Garbage Pile",
    category: "Garbage",
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
    description: "Unattended pile of plastic garbage bags blocking the pedestrian walkway.",
    latitude: 22.8055,
    longitude: 86.2040
  },
  {
    id: "preset-streetlight",
    name: "Broken Lamp Post",
    category: "Damaged Streetlight",
    imageUrl: "https://c2.staticflickr.com/4/3618/3383458014_d7850bddb2_b.jpg",
    description: "Dark damaged metal streetlight pole failing to illuminate the pavement.",
    latitude: 22.8012,
    longitude: 86.1998
  },
  {
    id: "preset-leakage",
    name: "Main Water Pipe Leak",
    category: "Water Leakage",
    imageUrl:  "https://thumbs.dreamstime.com/b/water-pipe-leaking-gushing-crack-spreading-wet-ground-rainy-day-water-pipe-leaking-gushing-water-damaged-431444813.jpg?w=992",
    description: "Severe pressurized water leaking from roadside valve onto concrete surface.",
    latitude: 22.8090,
    longitude: 86.2105
  }
];
