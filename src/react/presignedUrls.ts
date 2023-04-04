import { GetPresignedUrlOpts } from "../core/types";

export type PresignedUrlFetchResponse = {
  [fileName: string]: {
    url: string;
    location: string;
  };
};

export const getPresignedUrls = async ({
  files,
  folder,
  fileAccess,
  apiUrl,
}: GetPresignedUrlOpts) => {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files, folder, fileAccess }),
    });
    const data: PresignedUrlFetchResponse = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
};
