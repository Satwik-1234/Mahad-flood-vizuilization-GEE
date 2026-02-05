---
# 📐 Technical Methodology

## 1. Synthetic Aperture Radar (SAR) Physics
Unlike optical sensors (Sentinel-2/Landsat), SAR penetrates cloud cover—critical for monsoon flood mapping in the Konkan belt. We use **VH (Vertical-Horizontal)** polarization because it is more sensitive to volume scattering (vegetation) vs. specular reflection (calm water).

## 2. The "Log Ratio" Technique
Flood detection relies on the specular reflection of water.
* **Dry Land**: High backscatter (rough surface) $\rightarrow$ Return signal is strong.
* **Flooded Land**: Low backscatter (smooth surface) $\rightarrow$ Signal reflects away from the sensor.

We calculate the ratio in Decibels (dB):

$$\Delta \sigma^0 = \sigma^0_{post} - \sigma^0_{pre}$$

* **Threshold**: A drop of **-1.25 dB** or more indicates a significant surface change from rough to smooth (water).

## 3. Terrain Masking
The **Savitri Basin** is surrounded by the Western Ghats. Steep slopes cause geometric distortions (shadow/layover) in SAR data that mimic water.
* **Solution**: We apply an SRTM DEM mask to exclude pixels with **Slope > 5°**. This ensures we only map water on the floodplains, not on the mountain sides.
----
