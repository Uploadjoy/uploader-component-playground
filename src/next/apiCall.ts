const API_BASE = "https://uploadjoy.com/api/v2";

type ApiFetchResponseBody = {
  [fileName: string]: {
    url: string;
    location: string;
  };
};

type ApiCallInput = {
  files: {
    key: string;
    size: number;
    type: string;
  }[];
  fileAccess: "public" | "private";
};

export class FetchPresignedUrlsError extends Error {
  status: number;
  body: any;

  constructor(message: string, response: Response) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.status = response.status;
    this.body = response.json();
  }

  statusCode() {
    return this.status;
  }

  responseBody() {
    return this.body;
  }
}

const ENDPOINTS = {
  uploadObjects: `/presigned-url/put-objects`,
} as const;

const getEndpointUrl = (baseUrl: string, endpoint: keyof typeof ENDPOINTS) => {
  return `${baseUrl}${ENDPOINTS[endpoint]}`;
};

const createAuthorizationHeader = (token: string) => {
  return `Bearer ${token}`;
};

export const fetchPresignedUrls = async ({
  token,
  input,
  customApiUrl,
}: {
  token: string;
  input: ApiCallInput;
  customApiUrl?: string;
}) => {
  const apiUrl = customApiUrl ?? API_BASE;
  const authHeader = createAuthorizationHeader(token);
  const response = await fetch(getEndpointUrl(apiUrl, "uploadObjects"), {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new FetchPresignedUrlsError(
      "Failed to fetch presigned URLs",
      response,
    );
  }

  const data = await response.json();

  // TODO verify data instead of cast

  return data as ApiFetchResponseBody;
};
