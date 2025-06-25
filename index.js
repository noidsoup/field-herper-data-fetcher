const axios = require("axios");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 5, delayMs = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      const isRateLimit = error.response?.status === 429;
      const isConnReset = error.code === "ECONNRESET";
      const isSocketHangup =
        error.code === "ECONNABORTED" ||
        error.message?.includes("socket hang up");
      const isTransientTLS = error.message?.includes(
        "socket disconnected before secure TLS connection was established"
      );

      if (isRateLimit || isConnReset || isSocketHangup || isTransientTLS) {
        const waitTime = delayMs * Math.pow(2, attempt);
        console.warn(
          `⚠️ Retrying (${attempt + 1}/${retries}) after error (${
            error.code || error.message
          }): ${url}`
        );
        await delay(waitTime);
        continue;
      }

      console.error(`❌ Failed fetching ${url}:`, error.message);
      throw error;
    }
  }

  throw new Error(`Failed after ${retries} attempts: ${url}`);
}

async function fetchAllINaturalistSpecies(taxonId, iconicTaxon) {
  const perPage = 100;
  let allResults = [];
  let page = 1;

  while (true) {
    const url = `https://api.inaturalist.org/v1/taxa?taxon_id=${taxonId}&rank=species&is_active=true&iconic_taxa=${iconicTaxon}&per_page=${perPage}&page=${page}`;
    console.log(
      `📥 Fetching page ${page} for taxon ${taxonId} (${iconicTaxon})`
    );
    const data = await fetchWithRetry(url);
    const results = data.results || [];

    const speciesResults = results.filter((t) => t.rank === "species");
    allResults = allResults.concat(speciesResults);

    if (results.length < perPage) break;

    page++;
    await delay(300);
  }

  console.log(`✅ Fetched ${allResults.length} species from iNaturalist`);
  return allResults;
}

async function fetchObservationImages(speciesId, maxImages = 5) {
  const url = `https://api.inaturalist.org/v1/observations?taxon_id=${speciesId}&per_page=30&photos=true&order=desc&order_by=created_at`;
  console.log(`🌐 Fetching observation images from: ${url}`);
  const data = await fetchWithRetry(url);

  const imageUrls = [];
  const observations = data.results || [];
  console.log(
    `🔍 ${observations.length} observations found for species ${speciesId}`
  );

  for (const obs of observations) {
    if (obs.photos?.length) {
      for (const photo of obs.photos) {
        const rawUrl = photo.url || "";
        const mediumUrl = rawUrl.includes("square")
          ? rawUrl.replace("square", "medium")
          : rawUrl;

        if (mediumUrl && !imageUrls.includes(mediumUrl)) {
          imageUrls.push(mediumUrl);
        }

        if (imageUrls.length >= maxImages) break;
      }
    }

    if (
      imageUrls.length < maxImages &&
      obs.taxon?.default_photo?.medium_url &&
      !imageUrls.includes(obs.taxon.default_photo.medium_url)
    ) {
      imageUrls.push(obs.taxon.default_photo.medium_url);
    }

    if (imageUrls.length >= maxImages) break;
  }

  console.log(
    `🖼️ the Collected ${imageUrls.length} images for species ${speciesId}`
  );
  return imageUrls;
}

async function fetchSeasonality(speciesId) {
  const url = `https://api.inaturalist.org/v1/observations/histogram?taxon_id=${speciesId}&interval=month_of_year`;
  console.log(`🍃 Fetching seasonality data from: ${url}`);
  const data = await fetchWithRetry(url);

  const seasonData = data.results || [];
  console.log(
    `🔍 ${seasonData.length} season data found for species ${speciesId}`
  );

  return seasonData;
}

async function fetchWikipediaMobileHTML(scientificName) {
  const encodedTitle = encodeURIComponent(scientificName.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/api/rest_v1/page/mobile-html/${encodedTitle}`;
  try {
    console.log(`📚 Fetching Wikipedia page for ${scientificName}`);
    const html = await fetchWithRetry(url);
    return html;
  } catch (error) {
    console.warn(`⚠️ No Wikipedia page found for "${scientificName}"`);
    return null;
  }
}

async function uploadToFirestore(doc) {
  await db.collection("collection").doc(doc.id).set(doc, { merge: true });
  console.log(`✅ Uploaded ${doc.title}`);
}

async function processSpecies(species, category) {
  console.log(
    `\n🔬 Starting process for species: ${species.name} (ID: ${species.id})`
  );

  const docRef = db.collection("collection").doc(species.id.toString());
  const existingDoc = await docRef.get();
  const existingData = existingDoc.exists ? existingDoc.data() : null;

  const hasExistingImages =
    Array.isArray(existingData?.images) && existingData.images.length > 0;
  const hasExistingSeasonality = !!existingData?.seasonalityData;
  const hasExistingWiki = !!existingData?.wikipediaHtml;

  console.log(`📄 Firestore document exists: ${existingDoc.exists}`);
  console.log(`📷 Has existing images: ${hasExistingImages}`);
  console.log(`📚 Has existing Wikipedia HTML: ${hasExistingWiki}`);

  const commonNames = species.preferred_common_name
    ? [species.preferred_common_name]
    : [];
  const defaultImage = species.default_photo?.medium_url || null;

  if (!defaultImage) {
    console.warn(
      `⚠️ No default image for ${species.name} — will use first observation image if available`
    );
  }

  if (commonNames.length === 0) {
    console.warn(`⚠️ No common name for ${species.name}`);
  }

  let images;
  if (hasExistingImages) {
    console.log(`🔁 Reusing existing images for ${species.name}`);
    images = existingData.images;
  } else {
    images = await fetchObservationImages(species.id);
    console.log(`📸 New images fetched for ${species.name}: ${images.length}`);
  }

  if (images.length === 0) {
    console.warn(`🚫 Skipping ${species.name} — no images available`);
    return;
  }

  const imageURL = defaultImage || images[0];

  let seasonalityData;
  if (hasExistingSeasonality) {
    console.log(`🔁 Reusing existing seasonality data for ${species.name}`);
    seasonalityData = existingData.seasonalityData;
  } else {
    seasonalityData = await fetchSeasonality(species.id);
    console.log(
      `🍃 Seasonality data ${seasonalityData ? "retrieved" : "not found"} for ${
        species.name
      }`
    );
  }

  let wikipediaHtml;
  if (hasExistingWiki) {
    console.log(`🔁 Reusing existing Wikipedia HTML for ${species.name}`);
    wikipediaHtml = existingData.wikipediaHtml;
  } else {
    wikipediaHtml = await fetchWikipediaMobileHTML(species.name);
    console.log(
      `📄 Wikipedia HTML ${wikipediaHtml ? "retrieved" : "not found"} for ${
        species.name
      }`
    );
  }

  const doc = {
    id: species.id.toString(),
    title: species.name,
    scientificName: species.name,
    imageURL,
    images,
    seasonality: seasonalityData,
    category,
    notes: "",
    vernacular_names: commonNames,
    wikipediaHtml: wikipediaHtml || "",
  };

  console.log(`📤 Uploading document to Firestore for ${species.name}`);
  await uploadToFirestore(doc);
}

exports.main = async (req, res) => {
  const taxa = [
    { id: 27880, category: "Caecilians", iconicTaxon: "Amphibia" },
    { id: 20979, category: "Frogs", iconicTaxon: "Amphibia" },
    { id: 26718, category: "Salamanders", iconicTaxon: "Amphibia" },
    { id: 26039, category: "Crocodilians", iconicTaxon: "Reptilia" },
    { id: 85552, category: "Lizards", iconicTaxon: "Reptilia" },
    { id: 85553, category: "Snakes", iconicTaxon: "Reptilia" },
    { id: 26162, category: "Tuataras", iconicTaxon: "Reptilia" },
    { id: 39532, category: "Turtles", iconicTaxon: "Reptilia" },
  ];

  res.status(202).send("🛠️ Updating one random taxon in background...");

  try {
    const taxon = taxa[Math.floor(Math.random() * taxa.length)];
    console.log(`🎯 Selected taxon: ${taxon.category} (ID: ${taxon.id})`);

    const speciesList = await fetchAllINaturalistSpecies(
      taxon.id,
      taxon.iconicTaxon
    );
    const shuffled = speciesList.sort(() => Math.random() - 0.5);

    for (const species of shuffled) {
      try {
        await processSpecies(species, taxon.category);
      } catch (error) {
        console.error(
          `❌ Failed processing species ${species.name}:`,
          error.message
        );
      }
    }

    console.log("✅ Firestore update for random taxon complete.");
  } catch (error) {
    console.error("❌ Background task failed:", error);
  }
};
