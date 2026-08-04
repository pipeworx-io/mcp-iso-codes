# @pipeworx/iso-codes

ISO codes MCP — country (ISO 3166-1, -2, -3), language (ISO 639-1/-2/-3), currency (ISO 4217), and script (ISO 15924) lookups. Data fetched from the [debian iso-codes](https://salsa.debian.org/iso-codes-team/iso-codes) project (raw JSON on github). Keyless; cached 24h in-pack.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `country(query)` — lookup country by name / alpha-2 / alpha-3 / numeric
- `subdivisions(country_alpha2)` — ISO 3166-2 subdivisions of a country
- `language(query)` — lookup language by name / 2-letter / 3-letter code
- `currency(query)` — lookup currency by name / code / numeric
- `script(query)` — lookup script (ISO 15924)
- `list(kind, filter?)` — list all of one kind: countries | languages | currencies | scripts

## Data source

raw.githubusercontent.com/{ISO 3166-1, ISO 639-3, ISO 4217, ISO 15924} JSON in salsa.debian.org/iso-codes-team/iso-codes.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "iso-codes": {
      "url": "https://gateway.pipeworx.io/iso-codes/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Iso Codes data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
