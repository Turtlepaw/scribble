import { Agent } from "@atproto/api";
import { DidCache } from "../stores/did";
import { PLC_DIRECTORY } from "@/constants";
import {
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
} from "@atcute/identity-resolver";
import { Did } from "@atcute/lexicons";

export async function getPdsAgent(
  did: string | null,
  didStore: DidCache,
  defaultAgent: Agent
) {
  const docResolver = new CompositeDidDocumentResolver({
    methods: {
      plc: new PlcDidDocumentResolver(),
      web: new WebDidDocumentResolver(),
    },
  });

  if (!did) {
    return defaultAgent;
  } else {
    let didDoc = didStore.getDid(did);
    if (!didDoc) {
      const doc = await docResolver.resolve(did as Did<"plc">);
      didDoc = didStore.setDid(did, doc);
    }

    if (!didDoc?.doc?.service)
      throw Error("DID document doesn't include 'service'");
    const pdsUrl = didDoc?.doc?.service.filter((e) => e.id == "#atproto_pds")[0]
      .serviceEndpoint;

    if (!pdsUrl) throw Error("DID doesn't include atproto");
    if (typeof pdsUrl != "string")
      throw Error("'#atproto_pds' service endpoint isn't a string");

    return new Agent({ service: pdsUrl });
  }
}
