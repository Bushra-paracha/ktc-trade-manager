# KTC Status Summarizer - Streamlit Deployment

This Streamlit app turns messy project notes into clear, executive-ready status reports using Claude AI.

## Features

- 📝 Paste informal project notes
- ✨ AI-powered summarization using Claude
- 📊 Structured output: Health, Risks, Wins, Next Steps
- 📥 Download reports as text files
- ⚙️ Configurable project name and reporting period
- 🎨 Clean, intuitive interface

## Local Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variable:**
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```

3. **Run locally:**
   ```bash
   streamlit run status_summarizer.py
   ```

## Streamlit Cloud Deployment

### Step 1: Connect GitHub Repository
1. Go to [Streamlit Cloud](https://streamlit.io/cloud)
2. Sign in with your GitHub account
3. Click "New app"
4. Select this repository (`Bushra-paracha/ktc-trade-manager`)
5. Select branch: `streamlit-status-summarizer`
6. Set main file path: `status_summarizer.py`

### Step 2: Add Secrets
1. In Streamlit Cloud dashboard, go to **App settings** → **Secrets**
2. Add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY = "sk-ant-..."
   ```

### Step 3: Deploy
Streamlit Cloud will automatically deploy when you commit to the branch.

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Claude API key (required)

## Usage

1. Enter your project name and reporting period
2. Choose your preferred Claude model
3. Paste your messy project notes
4. Click "Generate Status Report"
5. Download or copy the structured status report

## Example

**Input (Messy Notes):**
```
- Had sync with Ali about Amazon product listings, he's working on compliance docs
- Still waiting on images from design team (been 3 days, following up tomorrow)
- Discovered inventory system doesn't sync with the new API - need to fix
- Launched beta on 3 SKUs, getting decent traction
```

**Output (Structured Status):**
```
HEALTH: 🟡 At Risk — Compliance dependencies extending timeline

KEY RISKS:
• Compliance docs from legal blocking product listings
• Design team delays on imagery (3+ days outstanding)
• Inventory API sync issues need urgent attention

WINS:
• Successfully launched beta on 3 SKUs with traction
• Product quality feedback positive

NEXT STEPS:
1. Follow up with legal on compliance documentation (EOW target)
2. Chase design team on remaining product images
3. Prioritize inventory API sync fix
```

## Support

For issues or questions, check the [Streamlit documentation](https://docs.streamlit.io).
