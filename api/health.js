export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    hasBlobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    hasAdminKey: Boolean(process.env.ADMIN_KEY),
    node: process.version,
  });
}
