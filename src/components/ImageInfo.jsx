import { Card, CardContent, CardMedia, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const ImageInfo = ({ imageData, clickPosition, onClose }) => {
  if (!imageData || !clickPosition) return null;

  // Calculate position with offset from click point
  const cardStyle = {
    maxWidth: 500, // Increased by 25% from 400
    position: 'absolute',
    left: clickPosition.x + 10, // Small offset from click point
    top: clickPosition.y + 10,
    zIndex: 1000,
    boxShadow: 3,
    transform: 'translate(0, 0)', // Ensure it doesn't go off screen
  };

  return (
    <Card sx={cardStyle}>
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {imageData.title}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Typography>
      </CardContent>
      
      <CardMedia
        component="img"
        height="312"
        image={imageData.imagePath}
        alt={imageData.alt}
        sx={{ objectFit: 'cover' }}
      />
      
      <CardContent>
        <Typography variant="body1" color="text.secondary">
          {imageData.description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ImageInfo;