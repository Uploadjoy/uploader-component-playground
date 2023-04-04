export type GetPresignedUrlOpts = {
  files: {
    name: string;
    size: number;
    type: string;
  }[];
  folder: string;
  fileAccess: "public" | "private";
  apiUrl: string;
};
