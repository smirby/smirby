When you hear about a new LLM or Agent Harness, first try to local the system card or equivalent, as well as any official announcements. Add one or two credible analyses if you can find them (best if you wait a couple of days for things to get written).

Take your links (and PDF of the system card, since it can be quite huge) and paste/upload them into the Risk Map Ingest Analyst in ChatGPT - it is near the top of the sidebar, as a custom GPT.

When that is complete, copy the resulting output from ChatGPT into a Typora (markdown) file.

Give that markdown (e.g., Claude Opus 3.8.md) to ChatGPT in the chat called "Reading Guide for Carlsmith" (long story). Ask it to convert it to .json

Take the output and paste into Typora as claude-opus-4-8.json (for example) and save in 

```
~smith/smirby/air-risk-map/ai-risk-map/src/data/records/{filename}
```

Open a terminal, go to the home directory (cd ~smith/smirby/air-risk-map/ai-risk-map)

```
<npm build-index>
<npm run dev>
```

The environment will load and be availble at http://localhost:5173

------

I’d definitely create a short `README.md` at the project root. Future Richard will thank present Richard.

Something like:

# **AI Risk Map – Developer Notes**

## **Add a New System**

1. Run the Risk Map Ingest Analyst.
2. Review the generated Markdown.
3. Convert the Markdown to JSON using the project schema.
4. Save the JSON file to:

```text
src/data/records/
```

Example:

```text
src/data/records/claude-opus-4-8.json
```

⚠️ The file extension must be `.json`, not `.md`.

------

## **Rebuild the Dataset**

Run:

```bash
npm run build-index
```

Expected output:

```text
✅ index.json rebuilt with X systems
✅ records.generated.json rebuilt with X records
```

Verify the count increases after adding a new system.

------

## **Run the Application**

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

------

## **Data Flow**

```text
Markdown Analysis
        ↓
Manual Review
        ↓
JSON Record
        ↓
src/data/records/
        ↓
npm run build-index
        ↓
index.json
records.generated.json
        ↓
React App
```

------

## **Common Problems**

### **System not appearing**

Check:

1. File is in `src/data/records`
2. File extension is `.json`
3. JSON is valid
4. `npm run build-index` completed successfully
5. System count increased
6. Record appears in:
   - `src/data/index.json`
   - `src/data/records.generated.json`

### **App loads but system missing**

Search for the system ID in:

```text
src/data/index.json
src/data/records.generated.json
```

If absent, the build step did not ingest the record.

------

## **Current Core Systems**

### **Models**

- GPT-5.4 Thinking
- Claude Opus 4.7
- Claude Opus 4.8
- Gemini 3.1 Pro

### **Frameworks**

- OpenAI Responses API
- LangGraph
- CrewAI
- AutoGPT

### **Agents**

- Manus
- Devin

:

One other thing I’d add while it’s fresh in your mind:

### **Project Philosophy**

A few bullets such as:

- AGII = persistent agency pressure
- CASX = power in action
- Capability ≠ agency
- Frameworks are scored in enablement mode
- Agents are scored in realized mode
- Observable behavior takes precedence over marketing claims

Those are the things that are hardest to reconstruct six months from now.

And with Opus 4.8 now successfully ingested, you’ve crossed into double digits: **10 systems on the map**. That’s enough that the README starts paying dividends immediately.