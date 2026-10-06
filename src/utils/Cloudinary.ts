import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (
  localFilePath: string | undefined | null
): Promise<UploadApiResponse | null> => {
  try {
    if (!localFilePath) return null;

    const response: UploadApiResponse = await cloudinary.uploader.upload(
      localFilePath,
      {
        resource_type: "auto",
      }
    );

    // console.log("file Uploaded on cloudinary", response.url)
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // remove the locally saved temporary file as upload operation got failed
    if (localFilePath) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Error uploading file to cloudinary", error);
    return null;
  }
};

const deleteOnCloudinary = async (
  localPathDelete: string | undefined | null
): Promise<UploadApiResponse | UploadApiErrorResponse | Error | null> => {
  try {
    if (!localPathDelete) return null;

    // delete file from cloudinary
    const result: UploadApiResponse = await cloudinary.uploader.destroy(
      localPathDelete,
      {
        resource_type: "auto",
      }
    );

    return result;
  } catch (error) {
    console.log("delete on cloudinary failed", error);
    return error as Error;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };