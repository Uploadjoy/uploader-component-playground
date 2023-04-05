import { NextApiRequest, NextApiResponse } from "next";
import { GetPresignedUrlOpts } from "../core/types";
import { FetchPresignedUrlsError, fetchPresignedUrls } from "./apiCall";
import { validateFileNamesAndFolderAsync } from "../core/validators";

type NextRouteHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
) => Promise<void>;

type Configure = (options: Options) => Handler;
type Handler = NextRouteHandler & { configure: Configure };

type Options = {
  apiKey: string;
  canUpload?: (
    ctx: {
      fileAccess: GetPresignedUrlOpts["fileAccess"];
      files: GetPresignedUrlOpts["files"];
      folder: GetPresignedUrlOpts["folder"];
    },
    req: NextApiRequest,
    res: NextApiResponse,
  ) => Promise<
    | {
        canUpload: true;
      }
    | {
        canUpload: false;
        // optional error message to return to the client for debugging
        message?: string;
      }
  >;
  customApiUrl?: string;
};

const actions = ["presignedUrls/upload"];

const makeRouteHandler = (options: Options): Handler => {
  const route: NextRouteHandler = async function (req, res) {
    const { action } = req.query;
    if (
      !action ||
      typeof action === "string" ||
      !actions.includes(action.join("/"))
    ) {
      return res.status(404).json({
        message:
          "There was a problem with the server configuration. Check the server logs for more information.",
      });
    }

    const { apiKey, canUpload, customApiUrl } = options;

    const { fileAccess, files, folder } = req.body as GetPresignedUrlOpts;

    const fileNameAndFolderValidation = await validateFileNamesAndFolderAsync(
      files,
      folder,
    );

    if (!fileNameAndFolderValidation.success) {
      return res.status(400).json({
        message: "Invalid file names or folder",
        errors: fileNameAndFolderValidation.errors,
      });
    }

    if (canUpload) {
      const canUploadResult = await canUpload(
        { fileAccess, files, folder },
        req,
        res,
      );
      if (!canUploadResult.canUpload) {
        return res.status(403).json({
          message:
            canUploadResult.message ?? "You are not allowed to upload files",
        });
      }
    }

    const filesWithKey = files.map((file) => ({
      size: file.size,
      type: file.type,
      // folder and file name are validated above
      key: `${folder ?? ""}${file.name}`,
    }));

    try {
      const presignedUrls = await fetchPresignedUrls({
        token: apiKey,
        input: {
          files: filesWithKey,
          fileAccess,
        },
        customApiUrl,
      });

      res.status(200).json(presignedUrls);
    } catch (error) {
      const asFetchError = error as FetchPresignedUrlsError;
      res.status(500).json({
        message: "Error fetching presigned URLs",
        errorFromUploadjoy: asFetchError.responseBody(),
      });
    }
  };

  const configure = (options: Options) => makeRouteHandler(options);

  return Object.assign(route, { configure });
};

const Uploadjoy = makeRouteHandler;

export { Uploadjoy };
