export interface GalleryItem {
  title: string;
  note: string;
  imageUrl: string;
}

export const exampleGallery: GalleryItem[] = [
  {
    title: "Veggie bowl concept",
    note: "Illustrative plating for lighter vegan dishes and bowl-style menus.",
    imageUrl: "/gallery/veggie-bowl.svg",
  },
  {
    title: "Comfort plate concept",
    note: "Illustrative moodboard for hearty Klassiker-style lunch trays.",
    imageUrl: "/gallery/comfort-plate.svg",
  },
  {
    title: "Global kitchen concept",
    note: "Illustrative art direction for rotating CampusWorld and Spezial dishes.",
    imageUrl: "/gallery/global-kitchen.svg",
  },
];
