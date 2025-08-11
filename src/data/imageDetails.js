// Image metadata for Appalachian Trail presentation
export const imageDetails = [
  {
    id: 'amicalola',
    title: 'Amicalola Falls State Park',
    imagePath: '/src/assets/images/amicalola.jpg',
    description: 'Jeff with his parents getting ready to start the hike',
    coordinates: [34.5569, -84.2427], // Amicalola Falls State Park coordinates
    alt: 'Jeff with parents at Amicalola Falls State Park'
  }
  // Add more images here as needed
];

// Helper function to get image details by id
export const getImageById = (id) => {
  return imageDetails.find(image => image.id === id);
};