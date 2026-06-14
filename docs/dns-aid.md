# DNS-AID records for FamilyPlate

Publish these DNS records for `familyplate.co` to expose FamilyPlate's agent
discovery surface through DNS for AI Discovery.

The current authoritative nameservers are `dns1.registrar-servers.com` and
`dns2.registrar-servers.com`, so these records must be added in the active DNS
provider rather than in this repository.

## Required records

Use either SVCB records or HTTPS records if the provider supports them. The
scanner currently checks both record types at `_index._agents`, `_a2a._agents`,
and `_mcp._agents`.

```dns
_index._agents.familyplate.co. 3600 IN SVCB 1 familyplate.co. alpn="h2,h3" port=443 mandatory=alpn,port key65400="https://familyplate.co/.well-known/agent-skills/index.json" key65401="agent-skills/index.json" key65402="familyplate-index"

_mcp._agents.familyplate.co. 3600 IN SVCB 1 familyplate.co. alpn="mcp,h2" port=443 mandatory=alpn,port key65400="https://familyplate.co/.well-known/mcp/server-card.json" key65401="mcp/server-card.json" key65402="mcp"

_a2a._agents.familyplate.co. 3600 IN SVCB 1 familyplate.co. alpn="a2a,h2" port=443 mandatory=alpn,port key65400="https://familyplate.co/.well-known/familyplate-agent.json" key65401="familyplate-agent.json" key65402="a2a"
```

If the provider exposes HTTPS records instead of SVCB records, publish the same
owner names and RDATA using type `HTTPS`:

```dns
_index._agents.familyplate.co. 3600 IN HTTPS 1 familyplate.co. alpn="h2,h3" port=443 mandatory=alpn,port key65400="https://familyplate.co/.well-known/agent-skills/index.json" key65401="agent-skills/index.json" key65402="familyplate-index"

_mcp._agents.familyplate.co. 3600 IN HTTPS 1 familyplate.co. alpn="mcp,h2" port=443 mandatory=alpn,port key65400="https://familyplate.co/.well-known/mcp/server-card.json" key65401="mcp/server-card.json" key65402="mcp"

_a2a._agents.familyplate.co. 3600 IN HTTPS 1 familyplate.co. alpn="a2a,h2" port=443 mandatory=alpn,port key65400="https://familyplate.co/.well-known/familyplate-agent.json" key65401="familyplate-agent.json" key65402="a2a"
```

`key65400`, `key65401`, and `key65402` are private-use numeric SvcParamKey names
for the current DNS-AID draft era, where the named keys such as `cap`,
`well-known`, and `bap` do not yet have final registered code points.

## DNSSEC

Enable DNSSEC for the public `familyplate.co` zone after adding the records.
Then confirm that validating DNS-over-HTTPS responses return authenticated data
for at least `_index._agents.familyplate.co`.

## Validate

After DNS propagation:

```bash
curl -fsSL -X POST https://isitagentready.com/api/scan \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://familyplate.co"}'
```

The DNS-AID result should report:

```json
{"checks":{"discoverability":{"dnsAid":{"status":"pass"}}}}
```
