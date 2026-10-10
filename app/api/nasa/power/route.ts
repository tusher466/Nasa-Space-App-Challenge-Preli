import { powerEndpoint } from '../../../../server/nasa.mjs';
export async function GET(request: Request) { return powerEndpoint(request); }
