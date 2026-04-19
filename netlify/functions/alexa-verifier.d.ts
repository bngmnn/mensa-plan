declare module "alexa-verifier" {
  export default function verifier(
    certUrl: string,
    signature: string,
    requestRawBody: string,
  ): Promise<void>;
}
