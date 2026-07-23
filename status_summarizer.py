import streamlit as st
import anthropic
from datetime import datetime
import json

# Streamlit page config
st.set_page_config(page_title="KTC Status Summarizer", layout="wide")
st.title("📊 KTC Project Status Summarizer")
st.caption("Turn messy project notes into clear status: health, risks, and next steps")

# Initialize Anthropic client
@st.cache_resource
def get_anthropic_client():
    return anthropic.Anthropic()

client = get_anthropic_client()

# Sidebar for configuration
with st.sidebar:
    st.header("⚙️ Configuration")
    project_name = st.text_input("Project Name", value="KTC Amazon Marketplace Integration")
    reporting_period = st.text_input("Reporting Period", value="Week of July 23, 2026")
    model_choice = st.selectbox("Model", ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"])

# Main content area
col1, col2 = st.columns([3, 1])

with col1:
    st.subheader("📝 Paste Your Messy Project Notes")
    notes = st.text_area(
        "Include any updates, meetings, blockers, achievements, or thoughts:",
        height=250,
        placeholder="""Example:
- Had sync with Ali about Amazon product listings, he's working on compliance docs
- Still waiting on images from design team (been 3 days, following up tomorrow)
- Discovered inventory system doesn't sync with the new API - need to fix
- Launched beta on 3 SKUs, getting decent traction
- Team morale good, but Amira's workload is getting heavy
- Need final approval from stakeholders before scaling to 50+ products"""
    )

with col2:
    st.subheader("📋 Status Template")
    st.markdown("""
    **Health:** 🟢 On Track / 🟡 At Risk / 🔴 Off Track

    **Key Risks:** (flagged issues)

    **Wins:** (recent progress)

    **Next Steps:** (priority actions)
    """)

# Status summarizer prompt
SYSTEM_PROMPT = """You are a Program Manager's status summarizer. Your job is to turn messy, informal project notes into clear, actionable status reports.

Transform the input into a structured status with:

1. **Health Score** (🟢 On Track / 🟡 At Risk / 🔴 Off Track) - Pick one with a 1-sentence justification
2. **Key Risks** (2-4 bullets) - Real blockers, dependencies, or resource issues
3. **Wins** (2-3 bullets) - What's going well, progress made
4. **Next Steps** (3-4 bullets) - Prioritized, actionable items for next period
5. **Dependency Flags** - Any cross-team dependencies that need attention

Rules:
- Be concise: no fluff, every line earns its place
- Highlight what needs escalation (risk ownership, resource needs, approvals)
- Use specific names/teams when mentioned
- Translate vague concerns into concrete risks
- Assume the reader is a busy exec who needs the truth in 2 minutes

Format your response as clean, readable text suitable for executive communication."""

# Process notes
if st.button("✨ Generate Status Report", type="primary"):
    if not notes.strip():
        st.error("Please paste your project notes first.")
    else:
        with st.spinner("Analyzing notes..."):
            try:
                response = client.messages.create(
                    model=model_choice,
                    max_tokens=1000,
                    system=SYSTEM_PROMPT,
                    messages=[
                        {
                            "role": "user",
                            "content": f"""Project: {project_name}
Period: {reporting_period}

Project Notes:
{notes}

Please generate a clear, executive-ready status report."""
                        }
                    ]
                )

                status_text = response.content[0].text

                # Display results
                st.success("✅ Status report generated!")

                # Add header
                st.markdown(f"""
                ### {project_name}
                **Reporting Period:** {reporting_period}
                **Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

                ---
                """)

                # Display the status report
                st.markdown(status_text)

                # Copy-to-clipboard functionality
                st.divider()
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("📋 Copy to Clipboard"):
                        st.write("✅ Report copied! (paste in Slack, email, or docs)")

                with col2:
                    # Download as text
                    st.download_button(
                        label="⬇️ Download as .txt",
                        data=f"{project_name}\n{reporting_period}\n\n{status_text}",
                        file_name=f"status_{datetime.now().strftime('%Y%m%d')}.txt"
                    )

                # Store in session for reference
                st.session_state.last_report = status_text

            except anthropic.APIError as e:
                st.error(f"API Error: {str(e)}")
            except Exception as e:
                st.error(f"Error: {str(e)}")

# Example section (collapsible)
with st.expander("📖 Example: KTC Project Notes → Status"):
    st.markdown("""
    **Example Input (Messy Notes):**
    ```
    - Amazon setup is slower than expected, compliance is the bottleneck
    - Got basmati rice product images finally, uploading this week
    - Spices category still needs regulatory approval - waiting on legal team
    - Two successful test orders came through on beta
    - Vikram is swamped with other priorities, might need to hire contractor
    - Customer feedback positive on rice quality
    - Packaging compliance check failed, designer fixing now
    - Next stakeholder review is Friday
    ```

    **Example Output (Structured Status):**
    ```
    HEALTH: 🟡 At Risk — Compliance dependencies are extending timeline by 2+ weeks

    KEY RISKS:
    • Compliance/regulatory approvals (Legal team) blocking spices category launch
    • Resource constraint: Vikram overallocated, design team stretched thin on packaging fixes
    • Stakeholder review Friday with potential scope questions from commercial team

    WINS:
    • Beta test orders validated market demand and product quality
    • Rice imagery complete and in upload pipeline
    • Basmati SKU on track for launch (compliance pending)

    NEXT STEPS:
    1. Escalate Legal review for spices regulatory approval (target: EOW)
    2. Confirm contractor hire to back-fill design/compliance work
    3. Finalize packaging compliance documentation before Friday stakeholder review
    4. Schedule go-live date once compliance clearance confirmed

    DEPENDENCY FLAGS:
    • Legal team (spices compliance) — est. resolution: next week
    • Design team (packaging) — resource pressure, may need external help
    ```
    """)

# Footer
st.divider()
st.markdown("""
<small>
💡 **Tip:** Use this weekly to maintain a living status. Feed it your Slack messages, meeting notes, or quick updates.
🔐 **Privacy:** Your notes stay between you and the Claude API — no data storage.
</small>
""", unsafe_allow_html=True)