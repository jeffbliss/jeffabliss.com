// Image metadata for Appalachian Trail presentation
export const imageDetails = [
  {
    id: "amicalola",
    title: "Amicalola Falls State Park",
    imagePath: "./amicalola.jpg",
    description: "Jeff with his parents getting ready to start the hike",
    coordinates: [34.5569, -84.2427],
    alt: "Jeff with parents at Amicalola Falls State Park",
  },
  {
    id: "springer_mountain",
    title: "Springer Mountain",
    imagePath: "./springer.jpg",
    description:
      "Jeff and his friend Matthew on top of Springer Mountain at the start of The Appalachian Trail",
    coordinates: [34.62754014812993, -84.19394535659039],
    alt: "Jeff and his friend Matthew on top of Springer Mountain at the start of The Appalachian Trail",
  },
  {
    id: "blood_mountain",
    title: "Blood Mountain",
    imagePath: "./blood_mountain.jpg",
    description: "Jeff on top of Blood Mountain",
    coordinates: [34.738965962662206, -83.9364044972044],
    alt: "Jeff on top of Blood Mountain",
  },
  {
    id: "neels_gap",
    title: "Neels Gap",
    imagePath: "./neels_gap.jpg",
    description: "Jeff found a cat at Neels Gap!",
    coordinates: [34.73518320210396, -83.91796530832265],
    alt: "Jeff found a cat at Neels Gap!",
  },
  {
    id: "tray_mountain",
    title: "Tray Mountain",
    imagePath: "./tray_mountain.jpg",
    description: "Jeff and Matthew on top of Tray Mountain",
    coordinates: [34.801470858703894, -83.68380156735331],
    alt: "Jeff and Matthew on top of Tray Mountain",
  },
];

// Helper function to get image details by id
export const getImageById = (id) => {
  return imageDetails.find((image) => image.id === id);
};
