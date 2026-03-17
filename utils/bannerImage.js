const { GetObjectCommand } = require("@aws-sdk/client-s3");
const sizeOf = require("image-size");
const s3 = require("../config/aws");

const streamToBuffer = async (stream) => {
  if (!stream) return null;
  if (Buffer.isBuffer(stream)) return stream;

  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

const validateBannerImageSize = async ({
  key,
  expectedWidth,
  expectedHeight,
}) => {
  if (!key) return { ok: true };

  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }),
    );

    const buffer = await streamToBuffer(response.Body);
    if (!buffer) {
      return {
        error: { status: 500, message: "Unable to read banner image" },
      };
    }

    const dimensions = sizeOf(buffer);
    const width = dimensions?.width;
    const height = dimensions?.height;

    if (width !== expectedWidth || height !== expectedHeight) {
      return {
        error: {
          status: 400,
          message: `Banner image must be ${expectedWidth} x ${expectedHeight}`,
        },
      };
    }

    return { ok: true, width, height };
  } catch (error) {
    return {
      error: { status: 500, message: "Unable to validate banner image size" },
    };
  }
};

module.exports = {
  validateBannerImageSize,
};
