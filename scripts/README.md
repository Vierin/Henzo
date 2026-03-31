# Scripts

## Re-import / overwrite workflow

`n8n import:workflow --input="workflows/Evaluador Ofertes Licitador.json"` **does not overwrite** an existing workflow; it creates a duplicate.

To **update in place** (overwrite):

1. Ensure **n8n is running** (e.g. `./start.sh` or `n8n start`).
2. Create an API key in n8n: **Settings → API → Create API Key**.
3. Run:

   ```bash
   N8N_API_KEY=your_key ./scripts/update-evaluador-workflow.sh
   ```

   Or: `./scripts/update-evaluador-workflow.sh your_key`

4. Optional: set `N8N_BASE_URL` if n8n is not on `http://localhost:5678`.

The script finds the workflow by name, then PUTs the JSON from `workflows/Evaluador Ofertes Licitador.json` to the API (one workflow, updated).

**Alternative:** In the n8n UI, delete the old "Evaluador Ofertes Licitador" workflow, then run `n8n import:workflow --input="workflows/Evaluador Ofertes Licitador.json"` again (no duplicate).
