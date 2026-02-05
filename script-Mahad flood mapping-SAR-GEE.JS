var studyArea = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[72.99542009232528, 18.26376337539875],
          [72.99542009232528, 17.83941376052153],
          [73.68206560013778, 17.83941376052153],
          [73.68206560013778, 18.26376337539875]]], null, false);


/************************************************************
 * 2024 MAHAD FLOOD MAPPING – SENTINEL-1 (SAR)
 * Region: Savitri River Basin, Raigad
 * Method: VH Median + Log Ratio + Slope Mask
 ************************************************************/

// ==========================================================
// 1. STUDY AREA
// ==========================================================
var studyArea = studyArea; // your existing geometry

Map.centerObject(studyArea, 10);
Map.addLayer(studyArea, {color: 'red'}, 'Study Area');

// ==========================================================
// 2. SENTINEL-1 COLLECTION
// ==========================================================
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(studyArea)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('resolution_meters', 10))
  .select('VH');

// ==========================================================
// 3. DATE WINDOWS (MAHAD FLOOD 2024)
// ==========================================================
var before = s1.filterDate('2024-05-15', '2024-06-15').median();
var after  = s1.filterDate('2024-07-15', '2024-08-10').median();

before = before.clip(studyArea);
after  = after.clip(studyArea);

// ==========================================================
// 4. SPECKLE FILTERING
// ==========================================================
before = before.focal_median(50, 'circle', 'meters');
after  = after.focal_median(50, 'circle', 'meters');

// ==========================================================
// 5. LOG RATIO CHANGE DETECTION
// ==========================================================
var ratio = after.subtract(before);

// ==========================================================
// 6. TERRAIN MASK (REMOVE HILLS)
// ==========================================================
var dem = ee.Image('USGS/SRTMGL1_003');
var slope = ee.Terrain.slope(dem);
var slopeMask = slope.lt(5); // <5° for floodplains

// ==========================================================
// 7. FLOOD & WATER MASK
// ==========================================================
var flood = ratio.lt(-1.25)
  .and(after.lt(-18))
  .and(slopeMask)
  .selfMask();

var permanentWater = before.lt(-18)
  .and(after.lt(-18))
  .selfMask();

// ==========================================================
// 8. VISUALIZATION
// ==========================================================
Map.addLayer(before, {min: -25, max: 0}, 'Before Flood VH');
Map.addLayer(after,  {min: -25, max: 0}, 'After Flood VH');

Map.addLayer(flood, {palette: ['yellow']}, 'Flood Inundation 2024');
Map.addLayer(permanentWater, {palette: ['blue']}, 'Permanent Water');

// ==========================================================
// 9. AREA CALCULATION
// ==========================================================
var areaImg = ee.Image.pixelArea();

var floodArea = areaImg.updateMask(flood)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyArea,
    scale: 10,
    maxPixels: 1e10
  }).get('area');

var floodAreaKm2 = ee.Number(floodArea).divide(1e6);
print('Flooded Area (sq.km):', floodAreaKm2);

// ==========================================================
// 10. HISTOGRAM – BACKSCATTER CHANGE
// ==========================================================
var hist = ui.Chart.image.histogram({
  image: ratio,
  region: studyArea,
  scale: 30,
  maxPixels: 1e7
}).setOptions({
  title: 'VH Backscatter Change (After - Before)',
  hAxis: {title: 'dB Change'},
  vAxis: {title: 'Pixel Count'}
});
print(hist);

// ==========================================================
// 11. FLOOD AREA TIME SERIES (MONSOON 2024)
// ==========================================================
var dates = ee.List.sequence(0, 60, 6);

var floodSeries = ee.FeatureCollection(
  dates.map(function(d) {
    var start = ee.Date('2024-07-01').advance(d, 'day');
    var end   = start.advance(6, 'day');

    var img = s1.filterDate(start, end).median()
      .focal_median(50, 'circle', 'meters');

    var floodTmp = img.lt(-18)
      .and(slopeMask)
      .selfMask();

    var area = ee.Image.pixelArea().updateMask(floodTmp)
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: studyArea,
        scale: 10,
        maxPixels: 1e10
      }).get('area');

    return ee.Feature(null, {
      date: start.format('YYYY-MM-dd'),
      flood_km2: ee.Number(area).divide(1e6)
    });
  })
);

// ==========================================================
// 12. FLOOD AREA TIME SERIES CHART
// ==========================================================
var floodChart = ui.Chart.feature.byFeature(
  floodSeries, 'date', 'flood_km2'
).setOptions({
  title: 'Mahad Flood 2024 – Flooded Area Time Series',
  hAxis: {title: 'Date'},
  vAxis: {title: 'Flooded Area (sq.km)'},
  lineWidth: 3,
  pointSize: 5
});

print(floodChart);

// ==========================================================
// 13. LEGEND
// ==========================================================
var legend = ui.Panel({
  style: {position: 'bottom-left', padding: '8px'}
});

legend.add(ui.Label({
  value: 'Legend',
  style: {fontWeight: 'bold', fontSize: '16px'}
}));

function row(color, name) {
  return ui.Panel({
    layout: ui.Panel.Layout.Flow('horizontal'),
    widgets: [
      ui.Label({style: {backgroundColor: color, padding: '10px'}}),
      ui.Label({value: name, style: {margin: '0 0 0 6px'}})
    ]
  });
}

legend.add(row('yellow', 'Flood Inundation'));
legend.add(row('blue', 'Permanent Water'));

Map.add(legend);

// ==========================================================
// 9. HISTOGRAM – SAR CHANGE
// ==========================================================
var hist = ui.Chart.image.histogram({
  image: ratio,
  region: studyArea,
  scale: 30,
  maxPixels: 1e7
}).setOptions({
  title: 'VH Backscatter Change (After − Before)',
  hAxis: {title: 'dB Change'},
  vAxis: {title: 'Pixel Count'}
});

print(hist);




// ==========================================================
// 9. SAR WATER LEVEL PROXY (BACKSCATTER TREND)
// ==========================================================
var vhTrend = ui.Chart.image.series({
  imageCollection: s1,
  region: studyArea,
  reducer: ee.Reducer.mean(),
  scale: 30
})
.setOptions({
  title: 'SAR VH Backscatter Trend (Water Level Proxy)',
  vAxis: {title: 'VH Backscatter (dB)'},
  hAxis: {title: 'Date'},
  lineWidth: 2,
  pointSize: 3
});

print(vhTrend);
