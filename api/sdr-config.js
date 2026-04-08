export default function handler(req, res) {
  const apiBaseUrl = process.env.SDR_API_BASE_URL || process.env.VITE_SDR_API_BASE_URL || "";

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ apiBaseUrl });
}