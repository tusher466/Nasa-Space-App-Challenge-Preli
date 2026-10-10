import { gistempEndpoint } from '../../../../server/nasa.mjs';
export async function GET(request: Request) { return gistempEndpoint(request); }
