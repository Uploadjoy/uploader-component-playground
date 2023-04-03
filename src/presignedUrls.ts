export type PresignedUrlFetchResponse = {
  [fileName: string]: string;
};

type GetPresignedUrlOpts = {
  fileNames: string[];
  folder: string;
  fileAccess: "public" | "private";
  apiUrl: string;
};

export const getPresignedUrls = async ({
  fileNames,
  folder,
  fileAccess,
  apiUrl,
}: GetPresignedUrlOpts) => {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({ fileNames, folder, fileAccess }),
    });
    const data: PresignedUrlFetchResponse = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
};
