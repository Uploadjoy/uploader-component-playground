export type PresignedUrlFetchResponse = {
  [fileName: string]: string;
};

type GetPresignedUrlOpts = {
  files: {
    name: string;
    size: number;
    type: string;
  }[];
  folder: string;
  fileAccess: "public" | "private";
  apiUrl: string;
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
      body: JSON.stringify({ files, folder, fileAccess }),
    });
    const data: PresignedUrlFetchResponse = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
};
