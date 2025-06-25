# Reptile Data Fetcher

A Google Cloud Run service that fetches and processes herpetological data from iNaturalist API and stores it in Firebase Firestore.

## Overview

This service automatically collects data about amphibians and reptiles (herpetofauna) including:

- Species information from iNaturalist
- Observation images
- Seasonality data
- Wikipedia content
- Common names and scientific classifications

## Features

- **Multi-taxon Support**: Processes 8 different herpetological groups:

  - Caecilians
  - Frogs
  - Salamanders
  - Crocodilians
  - Lizards
  - Snakes
  - Tuataras
  - Turtles

- **Robust Data Fetching**:

  - Retry logic with exponential backoff
  - Rate limiting protection
  - Connection error handling

- **Firebase Integration**: Stores processed data in Firestore with:

  - Species metadata
  - Image collections
  - Seasonality patterns
  - Wikipedia HTML content

- **Background Processing**: Runs asynchronously to avoid timeout issues

## API Endpoints

### Main Endpoint

- **URL**: `/`
- **Method**: `GET`
- **Response**: Returns 202 Accepted and processes a random taxon in the background

## Setup

### Prerequisites

- Google Cloud Platform account
- Firebase project with Firestore enabled
- Node.js 14+ (for local development)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd reptile-data-fetcher
```

2. Install dependencies:

```bash
npm install
```

3. Set up Firebase credentials:

   - Download your Firebase service account key
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable

4. Deploy to Cloud Run:

```bash
gcloud run deploy reptile-data-fetcher \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Environment Variables

- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Firebase service account key (for local development)

## Data Structure

Each species document in Firestore contains:

```json
{
  "id": "species_id",
  "title": "Scientific Name",
  "scientificName": "Scientific Name",
  "imageURL": "primary_image_url",
  "images": ["array_of_image_urls"],
  "seasonality": "seasonality_data",
  "category": "taxon_category",
  "notes": "",
  "vernacular_names": ["common_names"],
  "wikipediaHtml": "wikipedia_content"
}
```

## Development

### Local Testing

```bash
npm start
```

## Author

Nicholas Eyman

## License

ISC License

## Acknowledgments

- [iNaturalist API](https://api.inaturalist.org/) for species data
- [Wikipedia API](https://en.wikipedia.org/api/) for species information
- Google Cloud Run for hosting
- Firebase for data storage
