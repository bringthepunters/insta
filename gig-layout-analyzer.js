import fs from 'fs';
import fetch from 'node-fetch';
import {
  toTitleCase,
  getSuburb,
  formatPrice,
  createMeasurementContainer,
  measureGigHeight,
  buildSlides,
  generateLogId,
} from './layout-logic.js';

const API_BASE = 'https://api.lml.live/gigs/query';
const WEEKS_TO_ANALYZE = 15;
const CONTAINER_HEIGHT = 476; // Height of the container for gig panels

// Fetch gigs for a specific week
async function fetchGigsForWeek(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const url = `${API_BASE}?location=melbourne&date_from=${startDate.toISOString().split('T')[0]}&date_to=${endDate.toISOString().split('T')[0]}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching gigs for week of ${startDate}:`, error);
    return [];
  }
}

// Generate HTML for a single slide
function generateSlideHTML(slideGigs, slideIndex, totalSlides, logs) {
  return `
    <div class="slide">
      <h2>Slide ${slideIndex + 1} of ${totalSlides}</h2>
      ${slideGigs.map(gig => {
        const logId = generateLogId(gig, gig.date);
        const logEntry = logs.find(log => log.logId === logId);
        return `
          <div class="gig-panel">
            <h3>${toTitleCase(gig.name)}</h3>
            <p>${toTitleCase(gig.venue.name)} • ${getSuburb(gig.venue.address)}</p>
            <p>${gig.start_time || '23:59'} • ${formatPrice(gig)}</p>
            ${logEntry ? `<p class="log-id" style="color: red;">Log ID: ${logId}</p>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Main function to analyze gig layouts
async function analyzeGigLayouts() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS_TO_ANALYZE * 7));

  console.log(`Analyzing gig layouts from ${startDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);

  let allGigs = [];

  // Fetch gigs for each week
  for (let week = 0; week < WEEKS_TO_ANALYZE; week++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + (week * 7));

    console.log(`Fetching week ${week + 1}/${WEEKS_TO_ANALYZE}...`);
    const gigs = await fetchGigsForWeek(weekStartDate);
    allGigs = allGigs.concat(gigs);

    // Wait a bit between requests to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Build slides using the layout logic from the React app
  const { slides, logs } = buildSlides(allGigs, CONTAINER_HEIGHT);

  // Generate HTML
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gig Layout Analysis</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .slide { margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; }
        .gig-panel { margin-bottom: 10px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; }
        h2 { margin: 0 0 10px; }
        h3 { margin: 0 0 5px; }
        p { margin: 0; }
        .log-id { font-size: 12px; color: red; }
      </style>
    </head>
    <body>
      <h1>Gig Layout Analysis</h1>
      ${slides.map((slideGigs, slideIndex) => generateSlideHTML(slideGigs, slideIndex, slides.length, logs)).join('')}
    </body>
    </html>
  `;

  // Write to HTML file
  const htmlFilename = 'gig_layout_analysis.html';
  fs.writeFileSync(htmlFilename, html);

  // Write logs to a file
  const logFilename = 'gig_layout_logs.txt';
  const logContent = logs.map(log => `[${log.logId}] ${log.message}`).join('\n');
  fs.writeFileSync(logFilename, logContent);

  console.log(`Analysis complete!`);
  console.log(`HTML file written to ${htmlFilename}`);
  console.log(`Logs written to ${logFilename}`);
}

analyzeGigLayouts().catch(console.error);